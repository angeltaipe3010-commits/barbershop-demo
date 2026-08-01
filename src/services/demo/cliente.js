// ----------------------------------------------------------------------------
//  Cliente de demostración.
//
//  Expone la misma superficie que el cliente de supabase-js que usa la app:
//  .from(), .rpc(), .auth, .storage y .functions. Por dentro no hay red: todo
//  se resuelve contra una base SQLite (WebAssembly) guardada en el navegador.
//
//  Gracias a esto, `services/api`, los hooks y las vistas no saben —ni les hace
//  falta saber— si están hablando con Supabase o con la demo.
// ----------------------------------------------------------------------------
import { Consulta } from './consulta'
import { auth, cambiarPassword, crearCuenta, eliminarCuenta } from './auth'
import { rpc } from './rpc'
import { storage } from './almacenamiento'
import { rolActual, sesionActual } from './sesion'
import { baseDeDatos } from './almacen'
import { sembrarSiHaceFalta } from './semilla'

// ---- "Edge Functions" -------------------------------------------------------
// En producción, `admin-barberos` corre en el servidor con la service_role key
// porque crear cuentas requiere privilegios que el navegador no debe tener.
// Aquí no hay tal frontera: se ejecuta en local y solo se comprueba el rol.
async function invocarAdminBarberos(body = {}) {
  if (sesionActual() && rolActual() !== 'admin') {
    return { data: { error: 'No autorizado: solo un administrador gestiona las cuentas.' }, error: null }
  }

  switch (body.accion) {
    case 'crear':
      return { data: await crearCuenta(body), error: null }
    case 'eliminar':
      return { data: await eliminarCuenta(body.id), error: null }
    case 'reset_password':
      return { data: await cambiarPassword(body.id, body.password), error: null }
    default:
      return { data: { error: `Acción desconocida: ${body.accion}` }, error: null }
  }
}

const functions = {
  async invoke(nombre, opciones = {}) {
    if (nombre === 'admin-barberos') return invocarAdminBarberos(opciones.body)
    return {
      data: null,
      error: { name: 'FunctionsFetchError', message: `La función "${nombre}" no existe en la demo.` },
    }
  },
}

// ---- Arranque ---------------------------------------------------------------
// La base se crea y se siembra una sola vez; todas las llamadas comparten la
// misma promesa. `from()` no la espera: quien lo hace es `filas()`/`ejecutar()`
// a través de baseDeDatos(), y la siembra se encadena antes de la primera
// consulta real.
let preparacion = null

export function prepararDemo() {
  if (!preparacion) {
    preparacion = (async () => {
      await baseDeDatos()
      await sembrarSiHaceFalta()
    })().catch((e) => {
      // Nunca se propaga: la app espera a esta promesa antes de la primera
      // consulta, y si aquí se rechazara se quedaría en la pantalla de carga
      // para siempre. Mejor entrar con la base a medias y que cada consulta
      // informe de su propio error.
      console.error('[demo] No se pudo preparar la base de demostración:', e)
    })
  }
  return preparacion
}

// Toda consulta espera a que la demo esté lista antes de ejecutarse.
class ConsultaDemo extends Consulta {
  async ejecutar() {
    await prepararDemo()
    return super.ejecutar()
  }
}

// Las operaciones de sesión también necesitan la base lista: consultan
// `usuarios_barberos` y `demo_credenciales`.
const authDemo = {
  ...auth,
  getSession: async () => {
    await prepararDemo()
    return auth.getSession()
  },
  getUser: async () => {
    await prepararDemo()
    return auth.getUser()
  },
  signInWithPassword: async (credenciales) => {
    await prepararDemo()
    return auth.signInWithPassword(credenciales)
  },
  signUp: async (datos) => {
    await prepararDemo()
    return auth.signUp(datos)
  },
}

export const clienteDemo = {
  from(tabla) {
    return new ConsultaDemo(tabla)
  },

  async rpc(nombre, params) {
    await prepararDemo()
    return rpc(nombre, params)
  },

  auth: authDemo,
  storage,
  functions,
}

export default clienteDemo
