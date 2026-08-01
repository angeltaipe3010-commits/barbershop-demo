-- ============================================================================
--  HARDENING 1/1 — Impedir la escalada de privilegios (CRÍTICO)
-- ----------------------------------------------------------------------------
--  HALLAZGO (confirmado con una prueba real)
--    Un barbero autenticado podía elevarse a administrador con una sola
--    petición a la API:
--
--      PATCH /rest/v1/usuarios_barberos?id=eq.<su_propio_id>
--      { "rol": "admin", "porcentaje_comision": 99 }
--
--    → HTTP 200, rol = admin.
--
--  POR QUÉ PASABA
--    La política de UPDATE controlaba QUE FILA puede tocar cada uno
--    (`using ( id = auth.uid() or es_admin() )`), pero no QUE COLUMNAS ni con
--    qué valores. Un barbero puede editar su propia fila con normalidad (para
--    su nombre, telefono, foto), y de paso reescribia su propio `rol`.
--
--  POR QUE UN WITH CHECK NO BASTA
--    WITH CHECK solo ve la fila NUEVA, no puede compararla con la anterior, asi
--    que no puede expresar "el rol nuevo debe ser igual al que ya tenias". La
--    forma correcta es un trigger BEFORE UPDATE, que si ve OLD y NEW.
--
--  LA CORRECCION
--    Un trigger que, para quien NO es admin, prohibe cambiar los campos
--    sensibles: rol, porcentaje de comision y estado activo. Puede seguir
--    editando su nombre, telefono, foto y disponibilidad.
--
--    · Solo bloquea si el valor CAMBIA (enviar el mismo valor no molesta).
--    · Deja pasar a la Edge Function (service_role), que crea barberos con su
--      rol y comision, y al admin.
--
--  Pegar el archivo entero en el SQL Editor y ejecutar. Es re-ejecutable.
-- ============================================================================

create or replace function public.fn_proteger_perfil()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- La Edge Function (service_role) y los administradores pueden cambiarlo todo.
  if auth.role() = 'service_role' or public.es_admin() then
    return new;
  end if;

  -- Para el resto: los campos sensibles quedan congelados en su valor anterior.
  -- Si de verdad intenta cambiarlos, se corta con un error claro (util para
  -- detectar un intento de abuso en los logs).
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

-- Comprobación: el trigger debe quedar registrado (una fila).
select tgname as trigger_instalado
from pg_trigger
where tgname = 'trg_proteger_perfil';
