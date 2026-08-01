-- ============================================================================
--  PASO 4 de 4 — Storage: bucket público "fotos"
--  Guarda las fotos de productos y de perfil.
--
--  Si este paso falla por permisos, NO pasa nada grave: el resto del sistema
--  funciona. Solo tendrías que crear el bucket a mano en
--  Storage → New bucket → nombre "fotos" → marcar "Public bucket".
-- ============================================================================

insert into storage.buckets (id, name, public)
  values ('fotos', 'fotos', true)
  on conflict (id) do nothing;

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

select id, name, public as es_publico from storage.buckets where id = 'fotos';
