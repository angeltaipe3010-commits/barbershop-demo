-- ============================================================================
--  Liquidación de comisiones: registra los pagos hechos a cada barbero y
--  permite ver su saldo pendiente (ganado − pagado).
-- ============================================================================
create table if not exists public.pagos_comision (
  id             uuid primary key default gen_random_uuid(),
  barbero_id     uuid not null references public.usuarios_barberos(id) on delete cascade,
  monto          numeric(10,2) not null check (monto > 0),
  notas          text,
  fecha          date not null default current_date,
  registrado_por uuid references public.usuarios_barberos(id),
  created_at     timestamptz not null default now()
);

alter table public.pagos_comision enable row level security;
drop policy if exists "pagos_admin_all" on public.pagos_comision;
create policy "pagos_admin_all" on public.pagos_comision
  for all using (public.es_admin()) with check (public.es_admin());

-- Resumen por barbero: comisión ganada, pagada y pendiente.
-- SECURITY INVOKER → la RLS decide qué ve cada rol (admin: todos; barbero: solo
-- él, sin ver pagos). El acceso a la vista Liquidación es solo-admin en la app.
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
    coalesce((select sum(comision_monto) from public.ventas where barbero_id = u.id), 0)::numeric as ganado,
    coalesce((select sum(monto) from public.pagos_comision where barbero_id = u.id), 0)::numeric as pagado,
    (coalesce((select sum(comision_monto) from public.ventas where barbero_id = u.id), 0)
     - coalesce((select sum(monto) from public.pagos_comision where barbero_id = u.id), 0))::numeric as pendiente
  from public.usuarios_barberos u
  order by u.nombre;
$$;

grant execute on function public.liquidacion_barberos() to authenticated;
