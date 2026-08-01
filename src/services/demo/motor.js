// ----------------------------------------------------------------------------
//  Motor: ejecuta SQL contra la base en memoria y traduce tipos.
//
//  SQLite no tiene boolean ni arrays, así que las columnas marcadas en
//  esquema.js entran como 0/1 o texto JSON y salen como el valor que la app
//  espera. Todo lo demás pasa tal cual.
// ----------------------------------------------------------------------------
import { baseDeDatos, guardar } from './almacen'
import { COLUMNAS_BOOLEANAS, COLUMNAS_JSON } from './esquema'

// ---- Conversión de tipos ----------------------------------------------------

/** Prepara un valor de JS para guardarlo en SQLite. */
export function aSQL(valor) {
  if (valor === undefined) return null
  if (valor === null) return null
  if (typeof valor === 'boolean') return valor ? 1 : 0
  if (valor instanceof Date) return valor.toISOString()
  if (Array.isArray(valor) || typeof valor === 'object') return JSON.stringify(valor)
  return valor
}

/** Devuelve una fila de SQLite con los tipos que la app espera. */
function desdeSQL(tabla, fila) {
  const booleanas = COLUMNAS_BOOLEANAS[tabla] || []
  const json = COLUMNAS_JSON[tabla] || []
  if (!booleanas.length && !json.length) return fila

  for (const col of booleanas) {
    if (col in fila && fila[col] !== null) fila[col] = Boolean(fila[col])
  }
  for (const col of json) {
    if (col in fila && typeof fila[col] === 'string') {
      try {
        fila[col] = JSON.parse(fila[col])
      } catch {
        // Valor corrupto: mejor dejarlo como texto que romper la vista.
      }
    }
  }
  return fila
}

// ---- Ejecución --------------------------------------------------------------

/** Consulta que devuelve filas. */
export async function filas(sql, params = [], tabla = null) {
  const bd = await baseDeDatos()
  const stmt = bd.prepare(sql)
  try {
    stmt.bind(params.map(aSQL))
    const salida = []
    while (stmt.step()) salida.push(desdeSQL(tabla, stmt.getAsObject()))
    return salida
  } finally {
    stmt.free()
  }
}

/** Sentencia de escritura. Programa el volcado a IndexedDB. */
export async function ejecutar(sql, params = []) {
  const bd = await baseDeDatos()
  bd.run(sql, params.map(aSQL))
  guardar()
}

/** Varias sentencias como una sola transacción. */
export async function enTransaccion(fn) {
  const bd = await baseDeDatos()
  bd.run('begin')
  try {
    const resultado = await fn(bd)
    bd.run('commit')
    guardar()
    return resultado
  } catch (e) {
    try {
      bd.run('rollback')
    } catch {
      // La transacción ya se deshizo sola; el error original es el que importa.
    }
    throw e
  }
}

/** Columnas reales de una tabla o vista. */
export async function columnasDe(tabla) {
  const cols = await filas(`pragma table_info(${JSON.stringify(tabla)})`)
  return cols.map((c) => c.name)
}

/** UUID v4. `crypto.randomUUID` no existe en contextos no seguros (http://…). */
export function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const b = new Uint8Array(16)
  globalThis.crypto.getRandomValues(b)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
