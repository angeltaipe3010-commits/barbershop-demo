import { supabase, clienteAltas } from '../supabase'

// Dominio interno con el que se construye el email a partir del username.
// Los usuarios nunca lo ven ni lo escriben.
const DOMINIO_AUTH = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'demo.com'

// La Edge Function no está desplegada o no responde.
const FUNCION_AUSENTE =
  /Failed to (fetch|send)|FunctionsFetchError|FunctionsRelayError|not found|404/i

/**
 * Alta usando `signUp` con la clave pública, sin Edge Function.
 *
 * Corre sobre `clienteAltas()`, que no persiste sesión: sin eso, el admin
 * acabaría con la sesión del barbero recién creado.
 *
 * El trigger `fn_nuevo_usuario` crea el perfil a partir de los metadatos que
 * se envían aquí; el resto de campos se completan después con la sesión del
 * admin, que sí tiene permiso por RLS.
 */
async function altaSinServidor({ username, nombre, telefono, rol, porcentaje, password }) {
  const email = `${username}@${DOMINIO_AUTH}`

  const { data, error } = await clienteAltas().auth.signUp({
    email,
    password,
    options: { data: { username, nombre: nombre || username, rol: rol || 'barbero' } },
  })

  if (error) {
    // Supabase responde "User already registered" con distintas redacciones.
    if (/already registered|already exists/i.test(error.message)) {
      return { data: { error: `El usuario "${username}" ya existe.` } }
    }
    return { data: null, error }
  }

  // `identities` vacío significa que el correo ya estaba dado de alta: Supabase
  // no lo dice abiertamente para no filtrar qué cuentas existen.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { data: { error: `El usuario "${username}" ya existe.` } }
  }

  if (!data.user) {
    return { data: { error: 'No se pudo crear la cuenta.' } }
  }

  // Sin sesión y sin confirmar → el proyecto exige confirmación por correo.
  // Con correos internos ficticios esa confirmación nunca puede completarse.
  if (!data.session && !data.user.confirmed_at && !data.user.email_confirmed_at) {
    return { data: { error: 'CONFIRMACION_CORREO_ACTIVA' } }
  }

  // Completar los campos que el trigger no conoce. Lo hace el admin con su
  // propia sesión, por lo que pasa por las políticas RLS con normalidad.
  const { error: errorPerfil } = await supabase
    .from('usuarios_barberos')
    .update({
      nombre: nombre || username,
      telefono: telefono || null,
      rol: rol || 'barbero',
      porcentaje_comision: porcentaje ?? 40,
      activo: true,
    })
    .eq('id', data.user.id)

  if (errorPerfil) return { data: { error: errorPerfil.message } }

  return { data: { ok: true, id: data.user.id, sinServidor: true } }
}

// ---- Staff / Barberos (solo admin) -----------------------------------------
export const staffApi = {
  listar() {
    return supabase.from('usuarios_barberos').select('*').order('nombre')
  },

  activos() {
    return supabase.from('usuarios_barberos').select('*').eq('activo', true).order('nombre')
  },

  // Editar perfil (nombre, teléfono, rol, %, activo). RLS lo permite al admin.
  actualizar(id, payload) {
    return supabase.from('usuarios_barberos').update(payload).eq('id', id).select().single()
  },

  /**
   * Alta de un barbero. Intenta dos vías, en este orden:
   *
   *   1. Edge Function `admin-barberos`. Es la buena: usa la service_role key
   *      del lado del servidor, crea la cuenta ya confirmada y valida que
   *      quien llama sea admin.
   *
   *   2. Si la función no está desplegada, `signUp()` con la clave pública.
   *      Funciona sin servidor, pero la cuenta nace SIN confirmar: para que
   *      pueda entrar, el proyecto debe tener desactivada la confirmación por
   *      correo (obligatorio aquí de todos modos, porque los correos son
   *      internos y ficticios: nadie recibiría ese email).
   *
   * Devuelve siempre { data, error } para que la vista no sepa cuál se usó.
   */
  async crear({ username, nombre, telefono, rol, porcentaje, password }) {
    const viaFuncion = await supabase.functions.invoke('admin-barberos', {
      body: {
        accion: 'crear',
        dominio: DOMINIO_AUTH,
        username,
        nombre,
        telefono,
        rol,
        porcentaje,
        password,
      },
    })

    const fallo = viaFuncion.error?.message || viaFuncion.data?.error
    if (!fallo) return viaFuncion

    // Un error de negocio (usuario repetido, clave corta…) se devuelve tal
    // cual: la vía alternativa fallaría igual y confundiría el diagnóstico.
    if (!FUNCION_AUSENTE.test(fallo)) return viaFuncion

    return altaSinServidor({ username, nombre, telefono, rol, porcentaje, password })
  },

  eliminar(id) {
    return supabase.functions.invoke('admin-barberos', { body: { accion: 'eliminar', id } })
  },

  resetPassword(id, password) {
    return supabase.functions.invoke('admin-barberos', {
      body: { accion: 'reset_password', id, password },
    })
  },
}

// ---- Liquidación de comisiones (solo admin) --------------------------------
export const liquidacionApi = {
  // Saldo acumulado (todo el histórico): ganado, pagado y pendiente por barbero.
  resumen() {
    return supabase.rpc('liquidacion_barberos')
  },

  // Comisión GENERADA en un rango, por barbero (para liquidar por período).
  generadoPorRango(desde, hasta) {
    return supabase
      .from('ventas')
      .select('barbero_id, comision_monto')
      .gte('fecha', desde)
      .lte('fecha', hasta)
  },

  pagosPorRango(desde, hasta) {
    return supabase
      .from('pagos_comision')
      .select('barbero_id, monto')
      .gte('fecha', desde)
      .lte('fecha', hasta)
  },

  registrarPago(payload) {
    return supabase.from('pagos_comision').insert(payload).select().single()
  },

  historial(barberoId) {
    return supabase
      .from('pagos_comision')
      .select('*')
      .eq('barbero_id', barberoId)
      .order('created_at', { ascending: false })
  },
}
