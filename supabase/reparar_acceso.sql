-- ============================================================================
--  REPARAR ACCESO DE ADMINISTRADOR
-- ----------------------------------------------------------------------------
--  Pega este archivo ENTERO y ejecuta. No edites nada. No selecciones texto:
--  si hay algo seleccionado, Supabase ejecuta solo la selección.
--
--  IMPORTANTE: este archivo TERMINA con el SELECT, sin comentarios detrás.
--  Los archivos anteriores llevaban un bloque de comentarios al final y el
--  editor lo tomaba como una última sentencia vacía: por eso decía
--  "Success. No rows returned" aunque el SELECT sí se hubiera ejecutado.
--
--  Hace tres cosas:
--    1. mi_rol() pasa a leer el rol también de la tabla de perfiles, porque el
--       panel de Supabase no deja escribir los metadatos del JWT al crear un
--       usuario. Sin esto no hay forma de nombrar un admin desde la interfaz.
--    2. Crea el perfil de cualquier usuario que no lo tenga.
--    3. Pone como admin a todos los usuarios @demo.com.
--
--  Al final imprime el estado real de la base. Siempre devuelve 6 filas.
-- ============================================================================

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

insert into public.usuarios_barberos (id, username, nombre, rol, porcentaje_comision, activo)
select
  a.id,
  lower(split_part(a.email, '@', 1)),
  initcap(split_part(a.email, '@', 1)),
  'admin',
  0,
  true
from auth.users a
where not exists (select 1 from public.usuarios_barberos u where u.id = a.id);

update public.usuarios_barberos u
   set rol                 = 'admin',
       username            = lower(split_part(a.email, '@', 1)),
       porcentaje_comision = 0,
       activo              = true
  from auth.users a
 where a.id = u.id
   and a.email ilike '%@demo.com';

select 'A. usuarios en auth.users'      as dato, count(*)::text as valor from auth.users
union all
select 'B. perfiles creados',            count(*)::text from public.usuarios_barberos
union all
select 'C. perfiles con rol admin',      count(*)::text from public.usuarios_barberos where rol = 'admin'
union all
select 'D. trigger de alta instalado',   (count(*) > 0)::text from pg_trigger where tgname = 'trg_auth_nuevo_usuario'
union all
select 'E. correos registrados',         coalesce(string_agg(email, ' | '), '(ninguno)') from auth.users
union all
select 'F. usuario -> rol',              coalesce(string_agg(username || ' -> ' || rol, ' | '), '(ninguno)') from public.usuarios_barberos;
