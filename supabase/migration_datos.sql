-- ============================================================================
--  Permite al admin BORRAR movimientos de inventario (para "Limpiar datos").
-- ============================================================================
drop policy if exists "movimientos_delete_admin" on public.movimientos_inventario;
create policy "movimientos_delete_admin" on public.movimientos_inventario
  for delete using ( public.es_admin() );
