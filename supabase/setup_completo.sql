-- ============================================================================
--  DEMO BARBERSHOP — INSTALACIÓN COMPLETA
-- ----------------------------------------------------------------------------
--  Este archivo deja la base de datos ENTERA lista de una sola ejecución.
--  Equivale a `schema.sql` + todas las `migration_*.sql`, ya consolidadas y en
--  su versión final. En un proyecto NUEVO es el único archivo de estructura
--  que necesitas ejecutar.
--
--  CÓMO USARLO
--    1. Supabase → SQL Editor → New query.
--    2. Pega este archivo completo y pulsa Run.
--    3. Después, si quieres datos de demostración, ejecuta `seed_demo.sql`.
--
--  Es re-ejecutable: usa `if not exists` y `create or replace` en todo, así que
--  volver a correrlo no rompe nada ni borra datos.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  0. Tipos enumerados
-- ----------------------------------------------------------------------------
do $$ begin create type rol_usuario     as enum ('admin','barbero');
exception when duplicate_object then null; end $$;

do $$ begin create type estado_cita     as enum ('pendiente','confirmada','en_proceso','completada','cancelada');
exception when duplicate_object then null; end $$;

do $$ begin create type turno_dia       as enum ('manana','tarde_noche');
exception when duplicate_object then null; end $$;

do $$ begin create type tipo_producto   as enum ('interno','venta');
exception when duplicate_object then null; end $$;

do $$ begin create type tipo_movimiento as enum ('entrada','salida');
exception when duplicate_object then null; end $$;

do $$ begin create type metodo_pago     as enum ('efectivo','yape','plin','tarjeta','transferencia');
exception when duplicate_object then null; end $$;

do $$ begin create type tipo_item_venta as enum ('servicio','producto');
exception when duplicate_object then null; end $$;

do $$ begin create type estado_caja     as enum ('abierta','cerrada');
exception when duplicate_object then null; end $$;

-- ============================================================================
--  1. TABLAS
-- ============================================================================

-- ---- Perfil del staff (1:1 con auth.users) ---------------------------------
create table if not exists public.usuarios_barberos (
  id                  uuid primary key references auth.users(id) on delete cascade,
  username            text unique,          -- con esto inicia sesión (sin correo)
  nombre              text not null,
  telefono            text,
  rol                 rol_usuario not null default 'barbero',
  porcentaje_comision numeric(5,2) not null default 40.00
                      check (porcentaje_comision >= 0 and porcentaje_comision <= 100),
  foto_url            text,
  activo              boolean not null default true,
  -- Disponibilidad: días en convención JS getDay() (0=dom … 6=sáb).
  dias_laborables     int[] not null default '{1,2,3,4,5,6}',
  hora_inicio         time not null default '09:00',
  hora_fin            time not null default '21:00',
  created_at          timestamptz not null default now()
);

comment on table public.usuarios_barberos is
  'Perfil interno del staff. El rol también vive en los metadatos de Auth.';

-- ---- Clientes --------------------------------------------------------------
create table if not exists public.clientes (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  telefono     text,
  email        text,
  preferencias text,          -- corte habitual, alergias, productos preferidos
  notas        text,
  created_at   timestamptz not null default now()
);

-- ---- Catálogo de servicios -------------------------------------------------
create table if not exists public.servicios (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  descripcion  text,
  categoria    text,                        -- 'corte' | 'barba' | 'tratamiento' | 'combo'
  precio       numeric(10,2) not null check (precio >= 0),
  duracion_min integer not null default 30 check (duracion_min > 0),
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---- Inventario ------------------------------------------------------------
create table if not exists public.productos_inventario (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  descripcion  text,
  tipo         tipo_producto not null default 'venta',
  stock        integer not null default 0 check (stock >= 0),
  stock_minimo integer not null default 5 check (stock_minimo >= 0),
  precio_venta numeric(10,2) not null default 0 check (precio_venta >= 0),
  foto_url     text,
  created_at   timestamptz not null default now()
);

create or replace view public.productos_stock_bajo as
  select * from public.productos_inventario where stock <= stock_minimo;

-- ---- Agenda ----------------------------------------------------------------
create table if not exists public.citas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references public.clientes(id) on delete set null,
  barbero_id  uuid not null references public.usuarios_barberos(id) on delete cascade,
  servicio_id uuid references public.servicios(id) on delete set null,
  fecha_hora  timestamptz not null,
  estado      estado_cita not null default 'pendiente',
  turno       turno_dia not null default 'manana',
  notas       text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_citas_barbero_fecha on public.citas (barbero_id, fecha_hora);
create index if not exists idx_citas_estado        on public.citas (estado);

-- ---- Configuración del negocio (fila única) --------------------------------
create table if not exists public.configuracion (
  id               int primary key default 1 check (id = 1),
  nombre_negocio   text not null default 'Demo Barbershop',
  direccion        text,
  telefono         text,
  hora_corte_turno int not null default 14 check (hora_corte_turno between 0 and 23),
  logo_url         text,
  updated_at       timestamptz not null default now()
);

insert into public.configuracion (id) values (1) on conflict (id) do nothing;

-- ---- Sesiones de caja ------------------------------------------------------
create table if not exists public.caja_sesiones (
  id                  uuid primary key default gen_random_uuid(),
  fecha               date not null default current_date,
  abierta_por         uuid references public.usuarios_barberos(id),
  cerrada_por         uuid references public.usuarios_barberos(id),
  monto_inicial       numeric(10,2) not null default 0 check (monto_inicial >= 0),
  monto_final_contado numeric(10,2),
  efectivo_esperado   numeric(10,2),   -- inicial + ventas efectivo − gastos efectivo
  diferencia          numeric(10,2),   -- contado − esperado (+ sobrante / − faltante)
  estado              estado_caja not null default 'abierta',
  notas               text,
  abierta_at          timestamptz not null default now(),
  cerrada_at          timestamptz
);

-- Solo puede haber UNA caja abierta a la vez.
create unique index if not exists idx_una_caja_abierta
  on public.caja_sesiones ((1)) where estado = 'abierta';

comment on column public.caja_sesiones.diferencia is
  'Descuadre = contado − esperado. Positivo = sobrante, negativo = faltante.';

-- ---- Movimientos de inventario --------------------------------------------
create table if not exists public.movimientos_inventario (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos_inventario(id) on delete cascade,
  tipo        tipo_movimiento not null,
  cantidad    integer not null check (cantidad > 0),
  motivo      text,
  barbero_id  uuid references public.usuarios_barberos(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---- Ventas (una fila por línea; se agrupan por ticket_id) -----------------
create table if not exists public.ventas (
  id             uuid primary key default gen_random_uuid(),
  ticket_id      uuid,
  cita_id        uuid references public.citas(id) on delete set null,
  barbero_id     uuid not null references public.usuarios_barberos(id) on delete cascade,
  cliente_id     uuid references public.clientes(id) on delete set null,
  servicio_id    uuid references public.servicios(id) on delete set null,
  producto_id    uuid references public.productos_inventario(id) on delete set null,
  tipo           tipo_item_venta not null default 'servicio',
  cantidad       integer not null default 1 check (cantidad > 0),
  monto          numeric(10,2) not null check (monto >= 0),
  comision_monto numeric(10,2) not null default 0,
  propina        numeric(10,2) not null default 0 check (propina >= 0),
  descuento      numeric(10,2) not null default 0 check (descuento >= 0),
  metodo_pago    metodo_pago not null default 'efectivo',
  turno          turno_dia not null default 'manana',
  fecha          date not null default current_date,
  caja_sesion_id uuid references public.caja_sesiones(id),
  created_at     timestamptz not null default now()
);

create index if not exists idx_ventas_barbero_fecha on public.ventas (barbero_id, fecha);
create index if not exists idx_ventas_ticket        on public.ventas (ticket_id);

-- ---- Gastos ----------------------------------------------------------------
create table if not exists public.gastos (
  id             uuid primary key default gen_random_uuid(),
  descripcion    text not null,
  categoria      text,
  monto          numeric(10,2) not null check (monto >= 0),
  metodo_pago    metodo_pago not null default 'efectivo',
  fecha          date not null default current_date,
  caja_sesion_id uuid references public.caja_sesiones(id),
  registrado_por uuid references public.usuarios_barberos(id),
  created_at     timestamptz not null default now()
);

-- ---- Pagos de comisión (liquidación) ---------------------------------------
create table if not exists public.pagos_comision (
  id             uuid primary key default gen_random_uuid(),
  barbero_id     uuid not null references public.usuarios_barberos(id) on delete cascade,
  monto          numeric(10,2) not null check (monto > 0),
  notas          text,
  fecha          date not null default current_date,
  registrado_por uuid references public.usuarios_barberos(id),
  created_at     timestamptz not null default now()
);

-- ============================================================================
--  2. FUNCIONES
-- ============================================================================

-- Rol del usuario autenticado.
-- Busca en este orden: metadatos del JWT → tabla de perfiles → 'barbero'.
-- El respaldo en la tabla permite nombrar administradores desde Table Editor:
-- el formulario "Add user" del panel no deja escribir los metadatos del JWT.
-- SECURITY DEFINER evita la recursión con las políticas RLS de esa misma tabla.
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
      -- Fecha en hora local de Perú, para que el reporte diario cuadre con las
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
-- SECURITY DEFINER para que el stock se ajuste siempre, incluso cuando el
-- barbero registra una salida (la RLS no debe bloquear el efecto).
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

-- ---- Trigger: anti-escalada de privilegios ---------------------------------
-- Impide que un no-admin se cambie a sí mismo el rol, la comisión o el estado
-- editando su fila de perfil directamente por la API. La Edge Function
-- (service_role) y los administradores sí pueden.
create or replace function public.fn_proteger_perfil()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if auth.role() = 'service_role' or public.es_admin() then
    return new;
  end if;
  if new.rol is distinct from old.rol
     or new.porcentaje_comision is distinct from old.porcentaje_comision
     or new.activo is distinct from old.activo then
    raise exception 'No autorizado para cambiar rol, comision o estado del perfil.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_perfil on public.usuarios_barberos;
create trigger trg_proteger_perfil
  before update on public.usuarios_barberos
  for each row execute function public.fn_proteger_perfil();

-- ---- RPC: cobro atómico ----------------------------------------------------
-- Registra TODO el ticket en una transacción. Idempotente por ticket_id, así
-- que reintentar (o sincronizar un cobro offline) nunca duplica una venta.
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
  -- El barbero solo cobra lo suyo; el admin, cualquier cosa.
  if not (public.es_admin() or p_barbero_id = auth.uid()) then
    raise exception 'No autorizado para registrar este cobro';
  end if;

  -- Idempotencia.
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

  -- Cerrar la cita (el trigger ya no duplica: la venta existe).
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

-- ============================================================================
--  3. ROW LEVEL SECURITY
-- ============================================================================
alter table public.usuarios_barberos     enable row level security;
alter table public.clientes              enable row level security;
alter table public.servicios             enable row level security;
alter table public.citas                 enable row level security;
alter table public.productos_inventario  enable row level security;
alter table public.movimientos_inventario enable row level security;
alter table public.ventas                enable row level security;
alter table public.configuracion         enable row level security;
alter table public.caja_sesiones         enable row level security;
alter table public.gastos                enable row level security;
alter table public.pagos_comision        enable row level security;

-- ---- usuarios_barberos: cada uno ve su perfil; el admin, todos -------------
drop policy if exists "perfil_select_propio_o_admin" on public.usuarios_barberos;
create policy "perfil_select_propio_o_admin" on public.usuarios_barberos
  for select using ( id = auth.uid() or public.es_admin() );

drop policy if exists "perfil_update_propio_o_admin" on public.usuarios_barberos;
create policy "perfil_update_propio_o_admin" on public.usuarios_barberos
  for update using ( id = auth.uid() or public.es_admin() );

drop policy if exists "perfil_admin_insert" on public.usuarios_barberos;
create policy "perfil_admin_insert" on public.usuarios_barberos
  for insert with check ( public.es_admin() );

drop policy if exists "perfil_admin_delete" on public.usuarios_barberos;
create policy "perfil_admin_delete" on public.usuarios_barberos
  for delete using ( public.es_admin() );

-- ---- clientes: todo el staff consulta y registra ---------------------------
drop policy if exists "clientes_select_staff" on public.clientes;
create policy "clientes_select_staff" on public.clientes
  for select using ( auth.role() = 'authenticated' );

drop policy if exists "clientes_insert_staff" on public.clientes;
create policy "clientes_insert_staff" on public.clientes
  for insert with check ( auth.role() = 'authenticated' );

drop policy if exists "clientes_update_staff" on public.clientes;
create policy "clientes_update_staff" on public.clientes
  for update using ( auth.role() = 'authenticated' );

drop policy if exists "clientes_delete_admin" on public.clientes;
create policy "clientes_delete_admin" on public.clientes
  for delete using ( public.es_admin() );

-- ---- servicios: todos leen, solo el admin modifica -------------------------
drop policy if exists "servicios_select_todos" on public.servicios;
create policy "servicios_select_todos" on public.servicios
  for select using ( auth.role() = 'authenticated' );

drop policy if exists "servicios_admin_all" on public.servicios;
create policy "servicios_admin_all" on public.servicios
  for all using ( public.es_admin() ) with check ( public.es_admin() );

-- ---- citas: el barbero gestiona SOLO las suyas -----------------------------
drop policy if exists "citas_select_propias_o_admin" on public.citas;
create policy "citas_select_propias_o_admin" on public.citas
  for select using ( barbero_id = auth.uid() or public.es_admin() );

drop policy if exists "citas_insert_propias_o_admin" on public.citas;
create policy "citas_insert_propias_o_admin" on public.citas
  for insert with check ( barbero_id = auth.uid() or public.es_admin() );

drop policy if exists "citas_update_propias_o_admin" on public.citas;
create policy "citas_update_propias_o_admin" on public.citas
  for update using ( barbero_id = auth.uid() or public.es_admin() );

drop policy if exists "citas_delete_admin" on public.citas;
create policy "citas_delete_admin" on public.citas
  for delete using ( public.es_admin() );

-- ---- inventario: todos leen (para el POS), el admin gestiona ---------------
drop policy if exists "inventario_select_todos" on public.productos_inventario;
create policy "inventario_select_todos" on public.productos_inventario
  for select using ( auth.role() = 'authenticated' );

drop policy if exists "inventario_admin_all" on public.productos_inventario;
create policy "inventario_admin_all" on public.productos_inventario
  for all using ( public.es_admin() ) with check ( public.es_admin() );

-- ---- movimientos: el barbero solo puede registrar SALIDAS ------------------
drop policy if exists "movimientos_select_admin" on public.movimientos_inventario;
create policy "movimientos_select_admin" on public.movimientos_inventario
  for select using ( public.es_admin() or barbero_id = auth.uid() );

drop policy if exists "movimientos_insert_salida_barbero" on public.movimientos_inventario;
create policy "movimientos_insert_salida_barbero" on public.movimientos_inventario
  for insert with check ( public.es_admin() or (barbero_id = auth.uid() and tipo = 'salida') );

drop policy if exists "movimientos_admin_modificar" on public.movimientos_inventario;
create policy "movimientos_admin_modificar" on public.movimientos_inventario
  for update using ( public.es_admin() );

drop policy if exists "movimientos_delete_admin" on public.movimientos_inventario;
create policy "movimientos_delete_admin" on public.movimientos_inventario
  for delete using ( public.es_admin() );

-- ---- ventas: el barbero ve y registra solo las suyas -----------------------
drop policy if exists "ventas_select_propias_o_admin" on public.ventas;
create policy "ventas_select_propias_o_admin" on public.ventas
  for select using ( barbero_id = auth.uid() or public.es_admin() );

drop policy if exists "ventas_insert_propias_o_admin" on public.ventas;
create policy "ventas_insert_propias_o_admin" on public.ventas
  for insert with check ( barbero_id = auth.uid() or public.es_admin() );

drop policy if exists "ventas_update_admin" on public.ventas;
create policy "ventas_update_admin" on public.ventas
  for update using ( public.es_admin() );

drop policy if exists "ventas_delete_admin" on public.ventas;
create policy "ventas_delete_admin" on public.ventas
  for delete using ( public.es_admin() );

-- ---- configuración: todos leen, el admin escribe ---------------------------
drop policy if exists "config_select_todos" on public.configuracion;
create policy "config_select_todos" on public.configuracion
  for select using ( auth.role() = 'authenticated' );

drop policy if exists "config_admin_write" on public.configuracion;
create policy "config_admin_write" on public.configuracion
  for all using ( public.es_admin() ) with check ( public.es_admin() );

-- ---- caja: todos la leen (el POS la necesita), el admin abre y cierra ------
drop policy if exists "caja_select_todos" on public.caja_sesiones;
create policy "caja_select_todos" on public.caja_sesiones
  for select using ( auth.role() = 'authenticated' );

drop policy if exists "caja_admin_write" on public.caja_sesiones;
create policy "caja_admin_write" on public.caja_sesiones
  for all using ( public.es_admin() ) with check ( public.es_admin() );

-- ---- gastos y liquidación: finanzas, solo admin ---------------------------
drop policy if exists "gastos_admin_all" on public.gastos;
create policy "gastos_admin_all" on public.gastos
  for all using ( public.es_admin() ) with check ( public.es_admin() );

drop policy if exists "pagos_admin_all" on public.pagos_comision;
create policy "pagos_admin_all" on public.pagos_comision
  for all using ( public.es_admin() ) with check ( public.es_admin() );

-- ============================================================================
--  4. STORAGE (bucket público "fotos" para productos y perfiles)
-- ----------------------------------------------------------------------------
--  Va dentro de un bloque con captura de errores: algunos proyectos restringen
--  quién puede tocar `storage.objects`, y sin esto un fallo aquí revertiría
--  TODO el script. Si falla, el resto queda instalado y solo hay que crear el
--  bucket "fotos" a mano desde Storage → New bucket (marcándolo público).
-- ============================================================================
do $$
begin
  insert into storage.buckets (id, name, public)
    values ('fotos', 'fotos', true) on conflict (id) do nothing;

  drop policy if exists "fotos_lectura" on storage.objects;
  create policy "fotos_lectura" on storage.objects
    for select using ( bucket_id = 'fotos' );

  drop policy if exists "fotos_insert_auth" on storage.objects;
  create policy "fotos_insert_auth" on storage.objects
    for insert with check ( bucket_id = 'fotos' and auth.role() = 'authenticated' );

  drop policy if exists "fotos_update_auth" on storage.objects;
  create policy "fotos_update_auth" on storage.objects
    for update using ( bucket_id = 'fotos' and auth.role() = 'authenticated' );

  drop policy if exists "fotos_delete_admin" on storage.objects;
  create policy "fotos_delete_admin" on storage.objects
    for delete using ( bucket_id = 'fotos' and public.es_admin() );

exception when insufficient_privilege or others then
  raise warning 'Storage no configurado automáticamente (%). Crea el bucket "fotos" (público) desde el panel: Storage → New bucket.', sqlerrm;
end $$;

-- ============================================================================
--  Listo. Comprobación rápida de que todo quedó creado.
-- ============================================================================
select table_name as tabla_creada
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
order by table_name;
