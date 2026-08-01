import { supabase } from './supabase'

// ----------------------------------------------------------------------------
//  Cola de cobros sin conexión.
//  Si no hay internet el cobro se guarda en el dispositivo y se sincroniza al
//  reconectar. La RPC `registrar_cobro` es idempotente por ticket_id, así que
//  reintentar NUNCA duplica una venta.
// ----------------------------------------------------------------------------
const KEY = 'cobros_pendientes'

function leer() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function escribir(arr) {
  try {
    localStorage.setItem(KEY, JSON.stringify(arr))
  } catch (e) {
    // Almacenamiento lleno o en modo privado: es preferible perder la cola a
    // dejar la app inutilizable, pero se avisa por consola.
    console.error('[offline] No se pudo guardar la cola de cobros:', e)
  }
}

export function encolarCobro(params) {
  escribir([...leer(), params])
}

export function cobrosPendientes() {
  return leer().length
}

export function estaOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

let sincronizando = false

// Intenta enviar los cobros encolados. Devuelve cuántos quedan pendientes.
export async function sincronizarCobros() {
  if (sincronizando || estaOffline()) return cobrosPendientes()
  sincronizando = true
  try {
    const restantes = []
    for (const cobro of leer()) {
      const { error } = await supabase.rpc('registrar_cobro', cobro)
      if (error) restantes.push(cobro) // se reintenta luego (idempotente)
    }
    escribir(restantes)
    return restantes.length
  } finally {
    sincronizando = false
  }
}

/**
 * Auto-sincroniza al volver el internet y cada 30 s.
 * Llama onCambio(pendientes) tras cada intento. Devuelve la función de parada.
 */
export function iniciarAutoSync(onCambio) {
  const ejecutar = async () => onCambio?.(await sincronizarCobros())
  const alPerder = () => onCambio?.(cobrosPendientes())

  window.addEventListener('online', ejecutar)
  window.addEventListener('offline', alPerder)
  const id = setInterval(ejecutar, 30000)
  ejecutar()

  return () => {
    window.removeEventListener('online', ejecutar)
    window.removeEventListener('offline', alPerder)
    clearInterval(id)
  }
}
