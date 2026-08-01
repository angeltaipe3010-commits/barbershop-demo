// ----------------------------------------------------------------------------
//  Sesión activa del modo demo.
//
//  Vive en su propio módulo porque la usan tanto `auth.js` (que la crea) como
//  `consulta.js` (que la lee para emular las políticas RLS). Tenerla aquí evita
//  que esos dos se importen en círculo.
// ----------------------------------------------------------------------------
let actual = null

export function sesionActual() {
  return actual
}

export function fijarSesion(sesion) {
  actual = sesion
}

/** Rol efectivo de quien está usando la app ('admin' | 'barbero' | null). */
export function rolActual() {
  return actual?.user?.user_metadata?.rol ?? null
}

/** Id del usuario en sesión, o null. */
export function idActual() {
  return actual?.user?.id ?? null
}
