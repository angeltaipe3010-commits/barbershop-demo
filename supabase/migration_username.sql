-- ============================================================================
--  Migración: login por NOMBRE DE USUARIO (username) en vez de correo.
--  Ejecuta este script en el SQL Editor si ya tenías el schema desplegado.
-- ============================================================================

-- 1. Añade la columna username al perfil (única).
alter table public.usuarios_barberos
  add column if not exists username text unique;

-- 2. Actualiza el trigger de alta para que guarde el username de los metadatos.
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

-- 3. Rellena el username de los usuarios existentes a partir de su correo.
update public.usuarios_barberos u
set username = split_part(a.email, '@', 1)
from auth.users a
where a.id = u.id and u.username is null;
