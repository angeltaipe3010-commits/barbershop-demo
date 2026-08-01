import { hoyISO, aISOLocal, fmtFecha } from './format'

// ----------------------------------------------------------------------------
//  Períodos de consulta (día / semana / mes).
//  Vive aquí, fuera de los hooks, porque lo usan reportes, finanzas,
//  comisiones y liquidación: el rango debe calcularse igual en los cuatro.
// ----------------------------------------------------------------------------

export const PERIODOS = [
  { valor: 'dia', etiqueta: 'Día' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'mes', etiqueta: 'Mes' },
]

/**
 * Rango [desde, hasta] de un período respecto a una fecha de referencia.
 * · dia    → ese día
 * · semana → lunes..domingo de esa semana
 * · mes    → día 1..último día de ese mes
 */
export function rangoDe(periodo, refISO = hoyISO()) {
  const ref = new Date(refISO + 'T00:00:00')

  if (periodo === 'semana') {
    const dow = (ref.getDay() + 6) % 7 // lunes = 0
    const lunes = new Date(ref)
    lunes.setDate(ref.getDate() - dow)
    const domingo = new Date(lunes)
    domingo.setDate(lunes.getDate() + 6)
    return { desde: aISOLocal(lunes), hasta: aISOLocal(domingo) }
  }

  if (periodo === 'mes') {
    const primero = new Date(ref.getFullYear(), ref.getMonth(), 1)
    const ultimo = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
    return { desde: aISOLocal(primero), hasta: aISOLocal(ultimo) }
  }

  return { desde: refISO, hasta: refISO } // dia
}

// Texto legible del rango, para encabezados: "12 jun 2026" o "1 – 30 jun 2026".
export function etiquetaRango(periodo, refISO = hoyISO()) {
  const { desde, hasta } = rangoDe(periodo, refISO)
  if (desde === hasta) return fmtFecha(desde)
  return `${fmtFecha(desde)} — ${fmtFecha(hasta)}`
}
