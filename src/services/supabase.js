import { createClient } from '@supabase/supabase-js'
import { clienteDemo } from './demo/cliente'

// ----------------------------------------------------------------------------
//  Punto único de conexión.
//
//  La app tiene dos modos y este archivo es la ÚNICA frontera entre ellos:
//
//    VITE_DEMO=true   → base SQLite (WebAssembly) dentro del navegador.
//                       Sin servidor, sin cuentas, sin coste. Es lo que se
//                       publica en el portafolio.
//
//    VITE_DEMO=false  → Supabase real: PostgreSQL, Auth, RLS y Storage.
//                       Es el modo de producción; requiere las credenciales
//                       de abajo y el SQL de `supabase/setup/`.
//
//  Todo lo demás —services/api, los hooks, las vistas— es idéntico en ambos.
//  Cambiar de uno a otro es cambiar una variable de entorno y reconstruir.
// ----------------------------------------------------------------------------
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// `VITE_DEMO` manda cuando se declara. Si no se declara y tampoco hay
// credenciales, se asume demo: así un despliegue nuevo funciona sin configurar
// nada. Poner VITE_DEMO=false fuerza el modo real y, si faltan credenciales,
// la app lo dice en vez de disimularlo con datos de mentira.
const bandera = String(import.meta.env.VITE_DEMO ?? '').toLowerCase()

export const esDemo = bandera === 'true' || (bandera === '' && !url && !anonKey)

if (esDemo && bandera === '') {
  console.warn(
    '[negrote] Sin credenciales de Supabase: arrancando en modo demo ' +
      '(SQLite local en el navegador).',
  )
}

// En demo no hay nada que configurar; en real, sin credenciales la app lo
// detecta al arrancar y muestra una pantalla explicando qué falta, en vez de
// fallar con un error opaco de red.
export const configuracionValida = esDemo || Boolean(url && anonKey)

if (!configuracionValida) {
  console.error(
    '[supabase] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y rellena tus credenciales, ' +
      'o pon VITE_DEMO=true para usar la base de demostración local.',
  )
}

function crearClienteReal() {
  return createClient(url || 'http://localhost:54321', anonKey || 'anon-key-no-configurada', {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'negrote-crm-auth',
    },
    global: {
      headers: { 'x-aplicacion': 'negrote-crm' },
    },
  })
}

export const supabase = esDemo ? clienteDemo : crearClienteReal()

/**
 * Cliente secundario para dar de alta cuentas.
 *
 * `signUp()` deja la sesión del usuario recién creado en el cliente que la
 * ejecuta: si usáramos el principal, el admin quedaría con la sesión del
 * barbero que acaba de crear. Con `persistSession: false` la sesión resultante
 * se descarta y la del admin no se toca.
 *
 * Se crea bajo demanda para no abrir una conexión que la mayoría de sesiones
 * nunca usa. En demo no hace falta el truco: el alta nunca toca la sesión.
 */
let _clienteAltas = null

export function clienteAltas() {
  if (esDemo) return clienteDemo

  if (!_clienteAltas) {
    _clienteAltas = createClient(
      url || 'http://localhost:54321',
      anonKey || 'anon-key-no-configurada',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: { headers: { 'x-aplicacion': 'negrote-crm-altas' } },
      },
    )
  }
  return _clienteAltas
}

export default supabase
