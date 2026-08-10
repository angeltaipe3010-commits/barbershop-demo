// ----------------------------------------------------------------------------
//  Almacén SQLite del modo demo.
//
//  SQLite corre compilado a WebAssembly (sql.js) dentro de la pestaña. La base
//  vive en memoria, así que tras cada escritura se vuelca a IndexedDB: al
//  recargar, la demo sigue donde estaba.
//
//  El volcado va con retardo (`PERIODO_GUARDADO`) porque exportar la base
//  entera en cada INSERT sería absurdo cuando se siembran miles de ventas.
// ----------------------------------------------------------------------------
import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { ESQUEMA } from './esquema'

const BD_NOMBRE = 'barbershop-demo'
const ALMACEN = 'sqlite'
const CLAVE = 'base'
const PERIODO_GUARDADO = 400

// ---- IndexedDB: dos operaciones, sin librería -------------------------------
function abrirIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BD_NOMBRE, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(ALMACEN)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function leerVolcado() {
  try {
    const idb = await abrirIndexedDB()
    return await new Promise((resolve, reject) => {
      const req = idb.transaction(ALMACEN, 'readonly').objectStore(ALMACEN).get(CLAVE)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    // Modo incógnito o almacenamiento bloqueado: la demo arranca en blanco.
    console.warn('[demo] No se pudo leer la base guardada:', e)
    return null
  }
}

async function escribirVolcado(bytes) {
  try {
    const idb = await abrirIndexedDB()
    await new Promise((resolve, reject) => {
      const tx = idb.transaction(ALMACEN, 'readwrite')
      tx.objectStore(ALMACEN).put(bytes, CLAVE)
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    console.warn('[demo] No se pudo guardar la base:', e)
  }
}

// ---- Base en memoria --------------------------------------------------------
let bd = null
let arranque = null
let temporizador = null

async function arrancar() {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl })
  const guardada = await leerVolcado()

  bd = guardada ? new SQL.Database(new Uint8Array(guardada)) : new SQL.Database()

  // El esquema es re-ejecutable (`if not exists`), así que aplicarlo también
  // sobre una base ya existente es inofensivo y permite añadir tablas nuevas
  // sin obligar al visitante a borrar su demo.
  bd.run(ESQUEMA)

  return bd
}

/** Devuelve la base lista, arrancándola la primera vez. */
export function baseDeDatos() {
  if (!arranque) arranque = arrancar()
  return arranque
}

/** Programa un volcado a IndexedDB (agrupa ráfagas de escrituras). */
export function guardar() {
  if (temporizador) clearTimeout(temporizador)
  temporizador = setTimeout(() => {
    temporizador = null
    if (bd) escribirVolcado(bd.export())
  }, PERIODO_GUARDADO)
}

/** Vuelca ya, sin esperar. Útil antes de cerrar o al reiniciar la demo. */
export async function guardarAhora() {
  if (temporizador) {
    clearTimeout(temporizador)
    temporizador = null
  }
  if (bd) await escribirVolcado(bd.export())
}

/** Borra la base del navegador y la vuelve a crear vacía. */
export async function reiniciar() {
  if (temporizador) {
    clearTimeout(temporizador)
    temporizador = null
  }
  if (bd) {
    bd.close()
    bd = null
  }
  arranque = null

  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(BD_NOMBRE)
    req.onsuccess = resolve
    req.onerror = resolve
    req.onblocked = resolve
  })
}

/** Descarga la base como archivo .sqlite (se abre con cualquier cliente). */
export async function exportarArchivo() {
  const base = await baseDeDatos()
  return new Blob([base.export()], { type: 'application/x-sqlite3' })
}

// Un cierre brusco no debe perder el último cobro.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (temporizador && bd) {
      clearTimeout(temporizador)
      temporizador = null
      escribirVolcado(bd.export())
    }
  })
}
