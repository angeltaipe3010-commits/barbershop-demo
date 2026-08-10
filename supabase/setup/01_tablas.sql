-- ============================================================================
--  PASO 1 de 4 — Tipos, tablas e índices
--  Ejecuta este archivo completo en el SQL Editor y espera a que termine.
--  Es re-ejecutable: volver a correrlo no borra datos.
-- ============================================================================

-- ---- Tipos enumerados ------------------------------------------------------
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

-- ---- Perfil del staff (1:1 con auth.users) ---------------------------------
create table if not exists public.usuarios_barberos (
  id                  uuid primary key references auth.users(id) on delete cascade,
  username            text unique,
  nombre              text not null,
  telefono            text,
  rol                 rol_usuario not null default 'barbero',
  porcentaje_comision numeric(5,2) not null default 40.00
                      check (porcentaje_comision >= 0 and porcentaje_comision <= 100),
  foto_url            text,
  activo              boolean not null default true,
  dias_laborables     int[] not null default '{1,2,3,4,5,6}',
  hora_inicio         time not null default '09:00',
  hora_fin            time not null default '21:00',
  created_at          timestamptz not null default now()
);

-- ---- Clientes --------------------------------------------------------------
create table if not exists public.clientes (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  telefono     text,
  email        text,
  preferencias text,
  notas        text,
  created_at   timestamptz not null default now()
);

-- ---- Catálogo de servicios -------------------------------------------------
create table if not exists public.servicios (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  descripcion  text,
  categoria    text,
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
  efectivo_esperado   numeric(10,2),
  diferencia          numeric(10,2),
  estado              estado_caja not null default 'abierta',
  notas               text,
  abierta_at          timestamptz not null default now(),
  cerrada_at          timestamptz
);

-- Solo puede haber UNA caja abierta a la vez.
create unique index if not exists idx_una_caja_abierta
  on public.caja_sesiones ((1)) where estado = 'abierta';

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

-- Comprobación: deben aparecer 11 tablas.
select count(*) as tablas_creadas
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE';
