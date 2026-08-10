-- ============================================================================
--  DEMO BARBERSHOP — CRM Interno
--  Esquema de Base de Datos (PostgreSQL / Supabase)
-- ----------------------------------------------------------------------------
--  Ejecuta este script en el SQL Editor de Supabase.
--  El rol del usuario se gestiona mediante los metadatos de Supabase Auth
--  (raw_user_meta_data->>'rol') y se refleja también en la tabla de perfil
--  `usuarios_barberos` para facilitar las consultas y las políticas RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Tipos enumerados
-- ----------------------------------------------------------------------------
create type rol_usuario        as enum ('admin', 'barbero');
create type estado_cita        as enum ('pendiente', 'confirmada', 'en_proceso', 'completada', 'cancelada');
create type turno_dia          as enum ('manana', 'tarde_noche');
create type tipo_producto      as enum ('interno', 'venta');
create type tipo_movimiento    as enum ('entrada', 'salida');

-- Tipos del punto de venta. Los vuelve a declarar `migration_pos.sql` (de forma
-- idempotente) para las bases que ya existían; aquí son necesarios porque la
-- firma de `registrar_cobro`, más abajo, los referencia: sin ellos este script
-- fallaría en una instalación nueva.
create type metodo_pago        as enum ('efectivo', 'yape', 'plin', 'tarjeta', 'transferencia');
create type tipo_item_venta    as enum ('servicio', 'producto');

-- ----------------------------------------------------------------------------
-- 1. Perfil de usuarios (barberos y administradores)
--    Se enlaza 1:1 con auth.users
-- ----------------------------------------------------------------------------
create table public.usuarios_barberos (
  id                  uuid primary key references auth.users(id) on delete cascade,
  username            text unique,   -- nombre de usuario para el login (sin correo)
  nombre              text not null,
  telefono            text,
  rol                 rol_usuario not null default 'barbero',
  porcentaje_comision numeric(5,2) not null default 40.00 check (porcentaje_comision >= 0 and porcentaje_comision <= 100),
  foto_url            text,
  activo              boolean not null default true,
  -- Disponibilidad: días (convención JS getDay() 0=dom..6=sáb) y horario de atención.
  dias_laborables     int[] not null default '{1,2,3,4,5,6}',
  hora_inicio         time not null default '09:00',
  hora_fin            time not null default '21:00',
  created_at          timestamptz not null default now()
);

comment on table public.usuarios_barberos is 'Perfil interno del staff. El rol también vive en los metadatos de Auth.';

-- ----------------------------------------------------------------------------
-- 2. Clientes
-- ----------------------------------------------------------------------------
create table public.clientes (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  telefono      text,
  email         text,
  preferencias  text,          -- corte habitual, alergias, productos preferidos
  notas         text,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. Catálogo de servicios (cortes, tratamientos, combos)
-- ----------------------------------------------------------------------------
create table public.servicios (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  descripcion   text,
  categoria     text,                       -- 'corte', 'barba', 'tratamiento', 'combo'
  precio        numeric(10,2) not null check (precio >= 0),
  duracion_min  integer not null default 30 check (duracion_min > 0),
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. Agenda de citas
-- ----------------------------------------------------------------------------
create table public.citas (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid references public.clientes(id) on delete set null,
  barbero_id    uuid not null references public.usuarios_barberos(id) on delete cascade,
  servicio_id   uuid references public.servicios(id) on delete set null,
  fecha_hora    timestamptz not null,
  estado        estado_cita not null default 'pendiente',
  turno         turno_dia not null default 'manana',
  notas         text,
  created_at    timestamptz not null default now()
);

create index idx_citas_barbero_fecha on public.citas (barbero_id, fecha_hora);
create index idx_citas_estado on public.citas (estado);

-- ----------------------------------------------------------------------------
-- 5. Inventario de productos
-- ----------------------------------------------------------------------------
create table public.productos_inventario (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  descripcion   text,
  tipo          tipo_producto not null default 'venta',
  stock         integer not null default 0 check (stock >= 0),
  stock_minimo  integer not null default 5 check (stock_minimo >= 0),
  precio_venta  numeric(10,2) not null default 0 check (precio_venta >= 0),
  foto_url      text,
  created_at    timestamptz not null default now()
);

-- Vista útil: productos con stock bajo
create view public.productos_stock_bajo as
  select * from public.productos_inventario
  where stock <= stock_minimo;

-- ----------------------------------------------------------------------------
-- 6. Movimientos de inventario (entradas / salidas)
-- ----------------------------------------------------------------------------
create table public.movimientos_inventario (
  id            uuid primary key default gen_random_uuid(),
  producto_id   uuid not null references public.productos_inventario(id) on delete cascade,
  tipo          tipo_movimiento not null,
  cantidad      integer not null check (cantidad > 0),
  motivo        text,
  barbero_id    uuid references public.usuarios_barberos(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 7. Ventas (servicios y/o productos) + comisión calculada
-- ----------------------------------------------------------------------------
create table public.ventas (
  id              uuid primary key default gen_random_uuid(),
  cita_id         uuid references public.citas(id) on delete set null,
  barbero_id      uuid not null references public.usuarios_barberos(id) on delete cascade,
  cliente_id      uuid references public.clientes(id) on delete set null,
  servicio_id     uuid references public.servicios(id) on delete set null,
  producto_id     uuid references public.productos_inventario(id) on delete set null,
  monto           numeric(10,2) not null check (monto >= 0),
  comision_monto  numeric(10,2) not null default 0,
  turno           turno_dia not null default 'manana',
  fecha           date not null default current_date,
  created_at      timestamptz not null default now()
);

create index idx_ventas_barbero_fecha on public.ventas (barbero_id, fecha);

-- ============================================================================
--  FUNCIONES AUXILIARES
-- ============================================================================

-- Devuelve el rol del usuario autenticado leyendo los metadatos del JWT.
create or replace function public.mi_rol()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'rol', ''),
    'barbero'
  );
$$;

-- Atajo booleano para políticas.
create or replace function public.es_admin()
returns boolean
language sql
stable
as $$
  select public.mi_rol() = 'admin';
$$;

-- ----------------------------------------------------------------------------
--  TRIGGER: al pasar una cita a 'completada' se registra la venta y la
--  comisión automáticamente usando el % del barbero.
-- ----------------------------------------------------------------------------
create or replace function public.fn_registrar_venta_al_completar()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_precio       numeric(10,2);
  v_porcentaje   numeric(5,2);
begin
  if new.estado = 'completada' and old.estado is distinct from 'completada' then
    select precio into v_precio from public.servicios where id = new.servicio_id;
    select porcentaje_comision into v_porcentaje from public.usuarios_barberos where id = new.barbero_id;

    v_precio     := coalesce(v_precio, 0);
    v_porcentaje := coalesce(v_porcentaje, 0);

    insert into public.ventas (cita_id, barbero_id, cliente_id, servicio_id, monto, comision_monto, turno, fecha)
    values (
      new.id,
      new.barbero_id,
      new.cliente_id,
      new.servicio_id,
      v_precio,
      round(v_precio * v_porcentaje / 100, 2),
      new.turno,
      -- Fecha en hora local de Perú (America/Lima, UTC-5) para que los
      -- reportes diarios cuadren con las citas de tarde/noche.
      (new.fecha_hora at time zone 'America/Lima')::date
    );
  end if;
  return new;
end;
$$;

create trigger trg_cita_completada
  after update on public.citas
  for each row
  execute function public.fn_registrar_venta_al_completar();

-- ----------------------------------------------------------------------------
--  TRIGGER: descuenta stock al registrar una salida y suma en una entrada.
-- ----------------------------------------------------------------------------
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

create trigger trg_movimiento_stock
  after insert on public.movimientos_inventario
  for each row
  execute function public.fn_actualizar_stock();

-- ----------------------------------------------------------------------------
--  TRIGGER: crea automáticamente el perfil al registrarse un usuario en Auth.
-- ----------------------------------------------------------------------------
-- IMPORTANTE: `set search_path` y el tipo calificado (public.rol_usuario) son
-- necesarios porque GoTrue ejecuta el trigger con un search_path sin `public`.
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
    -- username de los metadatos; si no viene, usamos la parte local del email.
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'nombre', new.email),
    coalesce((new.raw_user_meta_data ->> 'rol')::public.rol_usuario, 'barbero')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_auth_nuevo_usuario
  after insert on auth.users
  for each row
  execute function public.fn_nuevo_usuario();

-- ----------------------------------------------------------------------------
--  RPC: cobro atómico (todo el ticket en una transacción, idempotente por
--  ticket_id → seguro para reintentos / modo offline).
-- ----------------------------------------------------------------------------
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

-- ============================================================================
--  ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.usuarios_barberos     enable row level security;
alter table public.clientes               enable row level security;
alter table public.servicios              enable row level security;
alter table public.citas                  enable row level security;
alter table public.productos_inventario   enable row level security;
alter table public.movimientos_inventario enable row level security;
alter table public.ventas                 enable row level security;

-- --- usuarios_barberos ------------------------------------------------------
-- Cada uno ve su propio perfil; el admin ve y gestiona todos.
create policy "perfil_select_propio_o_admin" on public.usuarios_barberos
  for select using ( id = auth.uid() or public.es_admin() );

create policy "perfil_update_propio_o_admin" on public.usuarios_barberos
  for update using ( id = auth.uid() or public.es_admin() );

create policy "perfil_admin_insert" on public.usuarios_barberos
  for insert with check ( public.es_admin() );

create policy "perfil_admin_delete" on public.usuarios_barberos
  for delete using ( public.es_admin() );

-- --- clientes ---------------------------------------------------------------
-- Todo el staff autenticado puede consultar y registrar clientes.
create policy "clientes_select_staff" on public.clientes
  for select using ( auth.role() = 'authenticated' );

create policy "clientes_insert_staff" on public.clientes
  for insert with check ( auth.role() = 'authenticated' );

create policy "clientes_update_staff" on public.clientes
  for update using ( auth.role() = 'authenticated' );

create policy "clientes_delete_admin" on public.clientes
  for delete using ( public.es_admin() );

-- --- servicios --------------------------------------------------------------
-- Todos leen el catálogo; solo el admin lo modifica.
create policy "servicios_select_todos" on public.servicios
  for select using ( auth.role() = 'authenticated' );

create policy "servicios_admin_all" on public.servicios
  for all using ( public.es_admin() ) with check ( public.es_admin() );

-- --- citas ------------------------------------------------------------------
-- El barbero ve y gestiona SOLO sus citas; el admin ve todas.
create policy "citas_select_propias_o_admin" on public.citas
  for select using ( barbero_id = auth.uid() or public.es_admin() );

create policy "citas_insert_propias_o_admin" on public.citas
  for insert with check ( barbero_id = auth.uid() or public.es_admin() );

create policy "citas_update_propias_o_admin" on public.citas
  for update using ( barbero_id = auth.uid() or public.es_admin() );

create policy "citas_delete_admin" on public.citas
  for delete using ( public.es_admin() );

-- --- productos_inventario ---------------------------------------------------
-- Todos leen (para registrar ventas); solo el admin gestiona el inventario.
create policy "inventario_select_todos" on public.productos_inventario
  for select using ( auth.role() = 'authenticated' );

create policy "inventario_admin_all" on public.productos_inventario
  for all using ( public.es_admin() ) with check ( public.es_admin() );

-- --- movimientos_inventario -------------------------------------------------
-- El admin gestiona libremente; el barbero solo puede registrar SALIDAS
-- (consumo de su servicio), nunca entradas ni ajustes.
create policy "movimientos_select_admin" on public.movimientos_inventario
  for select using ( public.es_admin() or barbero_id = auth.uid() );

create policy "movimientos_insert_salida_barbero" on public.movimientos_inventario
  for insert with check (
    public.es_admin()
    or (barbero_id = auth.uid() and tipo = 'salida')
  );

create policy "movimientos_admin_modificar" on public.movimientos_inventario
  for update using ( public.es_admin() );

create policy "movimientos_delete_admin" on public.movimientos_inventario
  for delete using ( public.es_admin() );

-- --- ventas -----------------------------------------------------------------
-- El barbero ve y registra solo sus ventas; el admin ve todo.
create policy "ventas_select_propias_o_admin" on public.ventas
  for select using ( barbero_id = auth.uid() or public.es_admin() );

create policy "ventas_insert_propias_o_admin" on public.ventas
  for insert with check ( barbero_id = auth.uid() or public.es_admin() );

create policy "ventas_update_admin" on public.ventas
  for update using ( public.es_admin() );

create policy "ventas_delete_admin" on public.ventas
  for delete using ( public.es_admin() );

-- ============================================================================
--  DATOS DE EJEMPLO (opcional — descomenta para sembrar)
-- ============================================================================
-- Precios referenciales en Soles (S/) para una barbería en Perú.
-- insert into public.servicios (nombre, categoria, precio, duracion_min) values
--   ('Corte Clásico',        'corte',       25.00, 30),
--   ('Corte + Barba',        'combo',       40.00, 50),
--   ('Afeitado a Navaja',    'barba',       20.00, 25),
--   ('Tratamiento Capilar',  'tratamiento', 35.00, 40),
--   ('Corte Niño',           'corte',       18.00, 25);
