-- ============================================================================
--  PASO 3 de 4 — Row Level Security
--  Requiere 01_tablas.sql y 02_funciones.sql.
--  Esto es lo que realmente impide que un barbero vea las finanzas del local.
-- ============================================================================

alter table public.usuarios_barberos      enable row level security;
alter table public.clientes               enable row level security;
alter table public.servicios              enable row level security;
alter table public.citas                  enable row level security;
alter table public.productos_inventario   enable row level security;
alter table public.movimientos_inventario enable row level security;
alter table public.ventas                 enable row level security;
alter table public.configuracion          enable row level security;
alter table public.caja_sesiones          enable row level security;
alter table public.gastos                 enable row level security;
alter table public.pagos_comision         enable row level security;

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

-- ---- Anti-escalada de privilegios -----------------------------------------
-- Sin esto, un barbero puede editar su propia fila de perfil y ponerse
-- rol = 'admin' (o subirse la comisión): la política de UPDATE controla QUÉ
-- fila toca, pero no QUÉ valores. El trigger congela los campos sensibles para
-- todo el que no sea admin ni la Edge Function (service_role).
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

-- Comprobación: deben aparecer 32 políticas.
select count(*) as politicas_creadas from pg_policies where schemaname = 'public';
