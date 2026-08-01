// ============================================================================
//  Edge Function: admin-barberos
//  Crea y elimina barberos usando la service_role key DEL LADO DEL SERVIDOR.
//  El navegador nunca ve esa clave: solo invoca esta función con el JWT del
//  admin, que aquí se valida antes de hacer nada.
//
//  Despliegue:
//    supabase functions deploy admin-barberos
//  (SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY las inyecta
//   Supabase automáticamente; no hay que configurar secretos.)
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Cabeceras CORS.
 *
 * `Access-Control-Allow-Headers` DEVUELVE las que el navegador pidió, en vez de
 * una lista fija. Con una lista fija, cualquier cabecera que el cliente añada
 * (por ejemplo `x-aplicacion`, para identificar el tráfico en los logs) hace
 * que el navegador bloquee el preflight, y el fallo llega al frontend como un
 * genérico "Failed to fetch" imposible de diagnosticar.
 *
 * No debilita nada: quien decide si la petición se atiende es la validación
 * del JWT y del rol que hay más abajo, no esta lista.
 */
function corsDe(req: Request) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      req.headers.get('Access-Control-Request-Headers') ??
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

Deno.serve(async (req) => {
  const cors = corsDe(req)

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization') ?? ''

    // 1) Identificar al que llama con SU propio JWT
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
    } = await userClient.auth.getUser()

    if (!user) return json({ error: 'No autorizado.' }, 401)

    // 2) Cliente con privilegios de servicio
    const admin = createClient(url, service, { auth: { persistSession: false } })

    // 3) Determinar el rol.
    //    Primero los metadatos del JWT y, si no lo traen, la tabla de perfiles.
    //    El respaldo es necesario: los usuarios creados desde el panel de
    //    Supabase nacen SIN metadatos (el formulario no permite escribirlos),
    //    así que sin esto un administrador legítimo recibiría un 403.
    let rol = user.user_metadata?.rol
    if (!rol) {
      const { data: perfil } = await admin
        .from('usuarios_barberos')
        .select('rol')
        .eq('id', user.id)
        .maybeSingle()
      rol = perfil?.rol
    }

    // 4) Solo administradores pueden gestionar barberos
    if (rol !== 'admin') {
      return json({ error: 'No autorizado. Solo administradores.' }, 403)
    }

    const body = await req.json()
    const DOM = body.dominio || 'elnegrote.com'

    if (body.accion === 'crear') {
      const username = String(body.username || '').trim().toLowerCase()
      if (!username || !body.password) {
        return json({ error: 'Usuario y contraseña son obligatorios.' }, 400)
      }
      const email = `${username}@${DOM}`
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: body.password,
        email_confirm: true, // sin email de confirmación
        user_metadata: {
          username,
          nombre: body.nombre || username,
          rol: body.rol || 'barbero',
        },
      })
      if (error) return json({ error: error.message }, 400)

      // Completa el perfil con teléfono y % de comisión
      await admin
        .from('usuarios_barberos')
        .update({
          nombre: body.nombre || username,
          telefono: body.telefono || null,
          rol: body.rol || 'barbero',
          porcentaje_comision: body.porcentaje ?? 40,
        })
        .eq('id', data.user.id)

      return json({ ok: true, id: data.user.id })
    }

    if (body.accion === 'eliminar') {
      if (!body.id) return json({ error: 'Falta el id del barbero.' }, 400)
      // Borrar el usuario de Auth elimina su perfil en cascada
      const { error } = await admin.auth.admin.deleteUser(body.id)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    if (body.accion === 'reset_password') {
      if (!body.id || !body.password) {
        return json({ error: 'Falta el id o la nueva contraseña.' }, 400)
      }
      const { error } = await admin.auth.admin.updateUserById(body.id, {
        password: body.password,
      })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    return json({ error: 'Acción desconocida.' }, 400)
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 400)
  }
})
