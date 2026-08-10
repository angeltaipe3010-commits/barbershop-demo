// ----------------------------------------------------------------------------
//  Autenticación del modo demo.
//
//  Sustituye a Supabase Auth (GoTrue). Las cuentas viven en la tabla
//  `demo_credenciales` de la propia base SQLite y la sesión en localStorage.
//
//  ATENCIÓN: las contraseñas se guardan y comparan en claro. Es aceptable
//  únicamente porque todo ocurre en el navegador de quien mira el portafolio,
//  con datos inventados y sin nada que proteger. En el modo real quien valida
//  es Supabase, con hash y JWT firmado.
// ----------------------------------------------------------------------------
import { ejecutar, filas, uuid } from './motor'
import { fijarSesion, sesionActual } from './sesion'

const CLAVE_SESION = 'barbershop-demo-sesion'
const DOMINIO = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'demo.com'

const oyentes = new Set()

// ---- Utilidades -------------------------------------------------------------
const usuarioDe = (email) => String(email || '').trim().toLowerCase().split('@')[0]

function construirSesion(perfil) {
  return {
    access_token: `demo.${perfil.id}`,
    token_type: 'bearer',
    expires_in: 86400,
    user: {
      id: perfil.id,
      email: `${perfil.username}@${DOMINIO}`,
      role: 'authenticated',
      user_metadata: {
        rol: perfil.rol,
        nombre: perfil.nombre,
        username: perfil.username,
      },
    },
  }
}

function persistir(sesion) {
  fijarSesion(sesion)
  try {
    if (sesion) localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
    else localStorage.removeItem(CLAVE_SESION)
  } catch {
    // Sin localStorage la sesión dura lo que la pestaña. No es grave.
  }
}

function avisar(evento, sesion) {
  for (const cb of oyentes) {
    try {
      cb(evento, sesion)
    } catch (e) {
      console.error('[demo] Oyente de sesión falló:', e)
    }
  }
}

async function perfilPorId(id) {
  const [p] = await filas('select * from usuarios_barberos where id = ?', [id], 'usuarios_barberos')
  return p || null
}

// Restaura la sesión guardada, comprobando que la cuenta siga existiendo y
// activa: si el admin se borró a sí mismo, la sesión ya no vale.
let restauracion = null

function restaurar() {
  if (!restauracion) {
    restauracion = (async () => {
      let guardada = null
      try {
        guardada = JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null')
      } catch {
        guardada = null
      }
      if (!guardada?.user?.id) return null

      const perfil = await perfilPorId(guardada.user.id)
      if (!perfil || !perfil.activo) {
        persistir(null)
        return null
      }

      const sesion = construirSesion(perfil)
      fijarSesion(sesion)
      return sesion
    })()
  }
  return restauracion
}

// ---- API que consume la app -------------------------------------------------
export const auth = {
  async getSession() {
    const sesion = sesionActual() || (await restaurar())
    return { data: { session: sesion }, error: null }
  },

  async getUser() {
    const sesion = sesionActual() || (await restaurar())
    return { data: { user: sesion?.user ?? null }, error: null }
  },

  onAuthStateChange(callback) {
    oyentes.add(callback)
    return {
      data: {
        subscription: {
          unsubscribe: () => oyentes.delete(callback),
        },
      },
    }
  },

  async signInWithPassword({ email, password }) {
    const username = usuarioDe(email)

    const [credencial] = await filas('select * from demo_credenciales where username = ?', [username])

    if (!credencial || credencial.password !== String(password)) {
      return {
        data: { user: null, session: null },
        error: { name: 'AuthApiError', status: 400, message: 'Invalid login credentials' },
      }
    }

    const perfil = await perfilPorId(credencial.id)
    if (!perfil) {
      return {
        data: { user: null, session: null },
        error: { name: 'AuthApiError', status: 400, message: 'Invalid login credentials' },
      }
    }
    if (!perfil.activo) {
      return {
        data: { user: null, session: null },
        error: { name: 'AuthApiError', status: 403, message: 'Esta cuenta está desactivada.' },
      }
    }

    const sesion = construirSesion(perfil)
    persistir(sesion)
    avisar('SIGNED_IN', sesion)
    return { data: { user: sesion.user, session: sesion }, error: null }
  },

  async signOut() {
    persistir(null)
    avisar('SIGNED_OUT', null)
    return { error: null }
  },

  // Solo lo usa la vía alternativa de alta en staffApi; en demo la "Edge
  // Function" siempre responde, así que en la práctica no se llega aquí.
  async signUp({ email, password, options }) {
    const username = usuarioDe(email)
    const meta = options?.data || {}
    const resultado = await crearCuenta({
      username,
      password,
      nombre: meta.nombre,
      rol: meta.rol,
    })

    if (resultado.error) {
      return { data: { user: null, session: null }, error: { message: resultado.error } }
    }
    return {
      data: {
        user: { id: resultado.id, email, identities: [{ id: resultado.id }], confirmed_at: new Date().toISOString() },
        session: null,
      },
      error: null,
    }
  },
}

// ---- Alta / baja de cuentas (lo que en producción hace la Edge Function) ----

export async function crearCuenta({ username, nombre, telefono, rol, porcentaje, password }) {
  const usuario = String(username || '').trim().toLowerCase()

  if (!usuario) return { error: 'El nombre de usuario es obligatorio.' }
  if (!/^[a-z0-9._-]+$/.test(usuario)) {
    return { error: 'El usuario solo puede tener letras, números, punto, guion y guion bajo.' }
  }
  if (String(password || '').length < 6) {
    return { error: 'Password should be at least 6 characters.' }
  }

  const [existente] = await filas('select id from demo_credenciales where username = ?', [usuario])
  if (existente) return { error: `El usuario "${usuario}" ya existe.` }

  const id = uuid()

  await ejecutar(
    'insert into usuarios_barberos (id, username, nombre, telefono, rol, porcentaje_comision, activo) ' +
      'values (?, ?, ?, ?, ?, ?, 1)',
    [id, usuario, nombre || usuario, telefono || null, rol || 'barbero', porcentaje ?? 40],
  )
  await ejecutar('insert into demo_credenciales (id, username, password) values (?, ?, ?)', [
    id,
    usuario,
    String(password),
  ])

  return { ok: true, id }
}

export async function eliminarCuenta(id) {
  if (id === sesionActual()?.user?.id) {
    return { error: 'No puedes eliminar tu propia cuenta mientras la usas.' }
  }
  await ejecutar('delete from demo_credenciales where id = ?', [id])
  await ejecutar('delete from usuarios_barberos where id = ?', [id])
  return { ok: true }
}

export async function cambiarPassword(id, password) {
  if (String(password || '').length < 6) {
    return { error: 'Password should be at least 6 characters.' }
  }
  const [existe] = await filas('select id from demo_credenciales where id = ?', [id])
  if (!existe) return { error: 'La cuenta ya no existe.' }

  await ejecutar('update demo_credenciales set password = ? where id = ?', [String(password), id])
  return { ok: true }
}
