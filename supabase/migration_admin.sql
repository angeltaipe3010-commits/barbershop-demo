-- ============================================================================
--  Migración: Caja diaria, Gastos, Configuración del negocio y Storage (fotos)
-- ============================================================================

-- Tipos
do $$ begin create type estado_caja as enum ('abierta','cerrada'); exception when duplicate_object then null; end $$;

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
-- Solo puede haber UNA caja abierta a la vez
create unique index if not exists idx_una_caja_abierta
  on public.caja_sesiones ((1)) where estado = 'abierta';

-- Enlazar ventas a la sesión de caja
alter table public.ventas add column if not exists caja_sesion_id uuid references public.caja_sesiones(id);

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

-- ============================================================================
--  RLS
-- ============================================================================
alter table public.configuracion enable row level security;
alter table public.caja_sesiones enable row level security;
alter table public.gastos        enable row level security;

drop policy if exists "config_select_todos" on public.configuracion;
create policy "config_select_todos" on public.configuracion
  for select using (auth.role() = 'authenticated');
drop policy if exists "config_admin_write" on public.configuracion;
create policy "config_admin_write" on public.configuracion
  for all using (public.es_admin()) with check (public.es_admin());

-- Caja: todos la leen (para el POS), solo el admin abre/cierra
drop policy if exists "caja_select_todos" on public.caja_sesiones;
create policy "caja_select_todos" on public.caja_sesiones
  for select using (auth.role() = 'authenticated');
drop policy if exists "caja_admin_write" on public.caja_sesiones;
create policy "caja_admin_write" on public.caja_sesiones
  for all using (public.es_admin()) with check (public.es_admin());

-- Gastos: finanzas → solo admin
drop policy if exists "gastos_admin_all" on public.gastos;
create policy "gastos_admin_all" on public.gastos
  for all using (public.es_admin()) with check (public.es_admin());

-- ============================================================================
--  STORAGE (bucket público "fotos" para productos y perfiles)
-- ============================================================================
insert into storage.buckets (id, name, public)
  values ('fotos', 'fotos', true) on conflict (id) do nothing;

drop policy if exists "fotos_lectura" on storage.objects;
create policy "fotos_lectura" on storage.objects
  for select using (bucket_id = 'fotos');

drop policy if exists "fotos_insert_auth" on storage.objects;
create policy "fotos_insert_auth" on storage.objects
  for insert with check (bucket_id = 'fotos' and auth.role() = 'authenticated');

drop policy if exists "fotos_update_auth" on storage.objects;
create policy "fotos_update_auth" on storage.objects
  for update using (bucket_id = 'fotos' and auth.role() = 'authenticated');

drop policy if exists "fotos_delete_admin" on storage.objects;
create policy "fotos_delete_admin" on storage.objects
  for delete using (bucket_id = 'fotos' and public.es_admin());
