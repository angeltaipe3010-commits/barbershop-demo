-- ============================================================================
--  PASO 2 de 4 — Funciones, triggers y la RPC de cobro
--  Requiere haber ejecutado antes 01_tablas.sql.
-- ============================================================================

-- ---- Rol del usuario autenticado -------------------------------------------
-- Busca en este orden: metadatos del JWT → tabla de perfiles → 'barbero'.
--
-- El respaldo en la tabla es importante: el formulario "Add user" del panel de
-- Supabase no permite escribir los metadatos, así que sin él no habría manera
-- de nombrar un administrador desde la interfaz. Con él, basta editar la
-- columna `rol` en Table Editor y surte efecto sin cerrar sesión.
--
-- SECURITY DEFINER porque esta función se usa dentro de las políticas RLS de
-- `usuarios_barberos`: leer esa tabla con las políticas activas la llamaría a
-- sí misma en bucle. Como definer se ejecuta con el dueño de la tabla, que no
-- pasa por RLS, y la recursión desaparece.
create or replace function public.mi_rol()
returns text
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'rol', ''),
    (select rol::text from public.usuarios_barberos where id = auth.uid()),
    'barbero'
  );
$$;

create or replace function public.es_admin()
returns boolean language sql stable as $$
  select public.mi_rol() = 'admin';
$$;

-- ---- Trigger: comisión automática al completar una cita --------------------
-- Solo crea la venta si NO existe ya una para esa cita, es decir, si se
-- completó sin pasar por el cobro del POS.
create or replace function public.fn_registrar_venta_al_completar()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_precio     numeric(10,2);
  v_porcentaje numeric(5,2);
begin
  if new.estado = 'completada'
     and old.estado is distinct from 'completada'
     and not exists (select 1 from public.ventas where cita_id = new.id) then

    select precio into v_precio from public.servicios where id = new.servicio_id;
    select porcentaje_comision into v_porcentaje from public.usuarios_barberos where id = new.barbero_id;

    v_precio     := coalesce(v_precio, 0);
    v_porcentaje := coalesce(v_porcentaje, 0);

    insert into public.ventas (
      cita_id, barbero_id, cliente_id, servicio_id, monto, comision_monto, turno, fecha, tipo
    ) values (
      new.id, new.barbero_id, new.cliente_id, new.servicio_id, v_precio,
      round(v_precio * v_porcentaje / 100, 2), new.turno,
      -- Fecha en hora local de Perú: así el reporte diario cuadra con las
      -- citas de tarde/noche.
      (new.fecha_hora at time zone 'America/Lima')::date,
      'servicio'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cita_completada on public.citas;
create trigger trg_cita_completada
  after update on public.citas
  for each row execute function public.fn_registrar_venta_al_completar();

-- ---- Trigger: ajuste de stock ----------------------------------------------
-- SECURITY DEFINER para que el stock se ajuste siempre, incluso cuando un
-- barbero registra una salida.
create or replace function public.fn_actualizar_stock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.tipo = 'entrada' then
    update public.productos_inventario set stock = stock + new.cantidad where id = new.producto_id;
  else
    update public.productos_inventario set stock = greatest(stock - new.cantidad, 0) where id = new.producto_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_movimiento_stock on public.movimientos_inventario;
create trigger trg_movimiento_stock
  after insert on public.movimientos_inventario
  for each row execute function public.fn_actualizar_stock();

-- ---- Trigger: alta de perfil al registrarse en Auth ------------------------
-- `set search_path` y el tipo calificado son necesarios: GoTrue ejecuta el
-- trigger con un search_path que no incluye `public`.
create or replace function public.fn_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.usuarios_barberos (id, username, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'nombre', new.email),
    coalesce((new.raw_user_meta_data ->> 'rol')::public.rol_usuario, 'barbero')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_auth_nuevo_usuario on auth.users;
create trigger trg_auth_nuevo_usuario
  after insert on auth.users
  for each row execute function public.fn_nuevo_usuario();

-- ---- RPC: cobro atómico ----------------------------------------------------
-- Registra TODO el ticket en una transacción. Idempotente por ticket_id:
-- reintentar (o sincronizar un cobro offline) nunca duplica una venta.
create or replace function public.registrar_cobro(
  p_ticket_id   uuid,
  p_barbero_id  uuid,
  p_cliente_id  uuid,
  p_cita_id     uuid,
  p_metodo_pago metodo_pago,
  p_propina     numeric,
  p_descuento   numeric,
  p_turno       turno_dia,
  p_fecha       date,
  p_items       jsonb
) returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_caja uuid;
  v_item jsonb;
  v_i    int := 0;
begin
  if not (public.es_admin() or p_barbero_id = auth.uid()) then
    raise exception 'No autorizado para registrar este cobro';
  end if;

  if exists (select 1 from public.ventas where ticket_id = p_ticket_id) then
    return;
  end if;

  select id into v_caja from public.caja_sesiones where estado = 'abierta' limit 1;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.ventas (
      ticket_id, cita_id, barbero_id, cliente_id, servicio_id, producto_id,
      tipo, cantidad, monto, comision_monto, propina, descuento, metodo_pago,
      turno, fecha, caja_sesion_id
    ) values (
      p_ticket_id, p_cita_id, p_barbero_id, p_cliente_id,
      nullif(v_item->>'servicio_id', '')::uuid,
      nullif(v_item->>'producto_id', '')::uuid,
      (v_item->>'tipo')::tipo_item_venta,
      coalesce((v_item->>'cantidad')::int, 1),
      (v_item->>'monto')::numeric,
      coalesce((v_item->>'comision_monto')::numeric, 0),
      -- Propina y descuento van en la primera línea del ticket.
      case when v_i = 0 then coalesce(p_propina, 0) else 0 end,
      case when v_i = 0 then coalesce(p_descuento, 0) else 0 end,
      p_metodo_pago, p_turno, p_fecha, v_caja
    );

    if (v_item->>'tipo') = 'producto' then
      insert into public.movimientos_inventario (producto_id, tipo, cantidad, motivo, barbero_id)
      values (nullif(v_item->>'producto_id', '')::uuid, 'salida',
              coalesce((v_item->>'cantidad')::int, 1), 'Venta directa', p_barbero_id);
    end if;

    v_i := v_i + 1;
  end loop;

  if p_cita_id is not null then
    update public.citas set estado = 'completada' where id = p_cita_id;
  end if;
end;
$$;

revoke all on function public.registrar_cobro(uuid,uuid,uuid,uuid,metodo_pago,numeric,numeric,turno_dia,date,jsonb) from public;
grant execute on function public.registrar_cobro(uuid,uuid,uuid,uuid,metodo_pago,numeric,numeric,turno_dia,date,jsonb) to authenticated;

-- ---- Resumen de liquidación por barbero ------------------------------------
-- SECURITY INVOKER → la RLS decide qué ve cada rol.
create or replace function public.liquidacion_barberos()
returns table (
  barbero_id uuid, nombre text, username text, activo boolean,
  ganado numeric, pagado numeric, pendiente numeric
)
language sql
security invoker
stable
set search_path = public, pg_catalog
as $$
  select
    u.id, u.nombre, u.username, u.activo,
    coalesce((select sum(comision_monto) from public.ventas where barbero_id = u.id), 0)::numeric,
    coalesce((select sum(monto) from public.pagos_comision where barbero_id = u.id), 0)::numeric,
    (coalesce((select sum(comision_monto) from public.ventas where barbero_id = u.id), 0)
     - coalesce((select sum(monto) from public.pagos_comision where barbero_id = u.id), 0))::numeric
  from public.usuarios_barberos u
  order by u.nombre;
$$;

grant execute on function public.liquidacion_barberos() to authenticated;

-- Comprobación: deben aparecer 7 funciones.
select count(*) as funciones_creadas
from information_schema.routines
where routine_schema = 'public';
