-- ============================================================================
--  Fix: el trigger de alta de usuario fallaba al crearse vía GoTrue
--  ("type rol_usuario does not exist") porque GoTrue ejecuta con un
--  search_path que no incluye `public`. Fijamos search_path y calificamos
--  el tipo enum con el esquema.
-- ============================================================================
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
