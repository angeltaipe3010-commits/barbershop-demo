-- ============================================================================
--  NOMBRAR ADMINISTRADOR  (y arreglar el perfil si falta)
-- ----------------------------------------------------------------------------
--  Pega el archivo ENTERO en el SQL Editor y ejecuta. No hay que editar nada.
--
--  Este script SIEMPRE devuelve filas al final. Si algo no cuadra, la salida
--  te dice exactamente qué, en vez de un "No rows returned" mudo.
--
--  Cubre los tres fallos que pueden dejarte como barbero:
--    1. `mi_rol()` leía el rol solo del JWT, y el panel de Supabase no permite
--       escribir esos metadatos → se le añade respaldo contra la tabla.
--    2. El perfil en `usuarios_barberos` no existe (el trigger de alta no se
--       creó, o el usuario se creó antes) → se crea aquí.
--    3. El perfil existe pero con rol 'barbero' → se actualiza.
-- ============================================================================

-- ---- 1. mi_rol(): añade respaldo contra la tabla de perfiles ---------------
-- SECURITY DEFINER para no entrar en bucle con las políticas RLS de la propia
-- tabla que consulta.
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

-- ---- 2. Crear el perfil de quien no lo tenga -------------------------------
-- Aquí estaba el fallo de la versión anterior: sin esto, el UPDATE de abajo no
-- tiene ninguna fila que tocar.
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

-- ---- 3. Promover a admin a los usuarios de @demo.com -----------------------
update public.usuarios_barberos u
   set rol                 = 'admin',
       username            = lower(split_part(a.email, '@', 1)),
       porcentaje_comision = 0,
       activo              = true
  from auth.users a
 where a.id = u.id
   and a.email ilike '%@demo.com';

-- ---- 4. Diagnóstico: esto SIEMPRE devuelve filas ---------------------------
select 'usuarios en auth.users'        as dato,
       count(*)::text                  as valor from auth.users
union all
select 'perfiles en usuarios_barberos', count(*)::text from public.usuarios_barberos
union all
select 'perfiles con rol admin',        count(*)::text from public.usuarios_barberos where rol = 'admin'
union all
select 'trigger de alta instalado',     (count(*) > 0)::text from pg_trigger where tgname = 'trg_auth_nuevo_usuario'
union all
select 'correos registrados',           coalesce(string_agg(email, ' | '), '(ninguno)') from auth.users
union all
select 'usuarios para el login',        coalesce(string_agg(username || ' → ' || rol, ' | '), '(ninguno)') from public.usuarios_barberos;

-- ============================================================================
--  QUÉ DEBERÍAS VER
--    usuarios en auth.users        → 1  (o los que hayas creado)
--    perfiles en usuarios_barberos → el mismo número
--    perfiles con rol admin        → al menos 1
--    trigger de alta instalado     → true
--    usuarios para el login        → admin → admin
--
--  Si "trigger de alta instalado" sale false, el paso 02_funciones.sql no se
--  aplicó entero: vuelve a ejecutarlo y mira si da error en rojo.
--
--  Recarga la app: no hace falta cerrar sesión, el rol se lee de la tabla en
--  cada petición.
-- ============================================================================
