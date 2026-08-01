// ----------------------------------------------------------------------------
//  Constructor de consultas: la misma cadena que expone supabase-js, traducida
//  a SQL.
//
//    supabase.from('ventas').select('*, barbero:usuarios_barberos(nombre)')
//            .eq('fecha', '2026-07-31').order('created_at', { ascending: false })
//
//  El objeto es "thenable": al hacerle `await` ejecuta la consulta y devuelve
//  el mismo { data, error } que devolvería PostgREST. Por eso la capa
//  `services/api` funciona sin tocar una línea.
// ----------------------------------------------------------------------------
import { columnasDe, ejecutar, filas, uuid } from './motor'
import { TABLAS_CON_UUID, VISTAS } from './esquema'
import { analizarSeleccion, columnaDeRelacion, proyectar } from './relaciones'
import { idActual, rolActual, sesionActual } from './sesion'

// Tablas que un barbero solo puede ver en su parte. Es la versión mínima de las
// políticas RLS: aquí es cosmética (el navegador tiene la base entera), pero
// mantiene la demo fiel a cómo se comporta el sistema real.
const COLUMNA_PROPIETARIO = {
  ventas: 'barbero_id',
  citas: 'barbero_id',
  pagos_comision: 'barbero_id',
}

const cacheColumnas = new Map()

async function columnasCacheadas(tabla) {
  if (!cacheColumnas.has(tabla)) cacheColumnas.set(tabla, await columnasDe(tabla))
  return cacheColumnas.get(tabla)
}

const entrecomillar = (id) => `"${String(id).replace(/"/g, '""')}"`

/** '(a,b,c)' → ['a','b','c'] — el formato de lista que usa PostgREST. */
function listaPostgREST(valor) {
  if (Array.isArray(valor)) return valor
  return String(valor)
    .replace(/^\(|\)$/g, '')
    .split(',')
    .map((x) => x.trim().replace(/^"|"$/g, ''))
    .filter(Boolean)
}

export class Consulta {
  constructor(tabla) {
    this.tabla = tabla
    this.op = 'select'
    this.cols = '*'
    this.filtros = []
    this.ordenes = []
    this.tope = null
    this.fila = null // 'single' | 'maybe' | null
    this.retorna = false
    this.payload = null
  }

  // ---- Operaciones ----------------------------------------------------------
  select(cols = '*') {
    this.cols = cols || '*'
    // Tras insert/update, `.select()` pide que se devuelvan las filas tocadas.
    if (this.op !== 'select') this.retorna = true
    return this
  }

  insert(payload) {
    this.op = 'insert'
    this.payload = payload
    return this
  }

  upsert(payload) {
    this.op = 'upsert'
    this.payload = payload
    return this
  }

  update(payload) {
    this.op = 'update'
    this.payload = payload
    return this
  }

  delete() {
    this.op = 'delete'
    return this
  }

  // ---- Filtros --------------------------------------------------------------
  #filtrar(operador, columna, valor, negado = false) {
    this.filtros.push({ operador, columna, valor, negado })
    return this
  }

  eq(c, v) { return this.#filtrar('=', c, v) }
  neq(c, v) { return this.#filtrar('<>', c, v) }
  gt(c, v) { return this.#filtrar('>', c, v) }
  gte(c, v) { return this.#filtrar('>=', c, v) }
  lt(c, v) { return this.#filtrar('<', c, v) }
  lte(c, v) { return this.#filtrar('<=', c, v) }
  like(c, v) { return this.#filtrar('like', c, v) }
  ilike(c, v) { return this.#filtrar('like', c, v) }
  is(c, v) { return this.#filtrar('is', c, v) }
  in(c, v) { return this.#filtrar('in', c, v) }

  /** `.not('estado', 'in', '(completada,cancelada)')` */
  not(columna, operador, valor) {
    const mapa = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', in: 'in', is: 'is' }
    return this.#filtrar(mapa[operador] || operador, columna, valor, true)
  }

  order(columna, { ascending = true } = {}) {
    this.ordenes.push({ columna, ascending })
    return this
  }

  limit(n) {
    this.tope = n
    return this
  }

  single() {
    this.fila = 'single'
    return this
  }

  maybeSingle() {
    this.fila = 'maybe'
    return this
  }

  // ---- Construcción del WHERE ----------------------------------------------
  #condiciones() {
    const trozos = []
    const params = []

    const todos = [...this.filtros]

    // Emulación de RLS: un barbero solo alcanza sus propias filas.
    const propietario = COLUMNA_PROPIETARIO[this.tabla]
    if (propietario && sesionActual() && rolActual() !== 'admin') {
      todos.push({ operador: '=', columna: propietario, valor: idActual(), negado: false })
    }

    for (const f of todos) {
      const col = entrecomillar(f.columna)
      let trozo

      if (f.operador === 'in') {
        const items = listaPostgREST(f.valor)
        if (!items.length) {
          // `in ()` no es SQL válido: una lista vacía no casa con nada.
          trozo = f.negado ? '1 = 1' : '1 = 0'
        } else {
          trozo = `${col} ${f.negado ? 'not in' : 'in'} (${items.map(() => '?').join(', ')})`
          params.push(...items)
        }
        trozos.push(trozo)
        continue
      }

      if (f.operador === 'is' || f.valor === null) {
        trozos.push(`${col} is ${f.negado ? 'not ' : ''}null`)
        continue
      }

      trozo = `${col} ${f.operador} ?`
      params.push(f.valor)
      trozos.push(f.negado ? `not (${trozo})` : trozo)
    }

    return { where: trozos.length ? ` where ${trozos.join(' and ')}` : '', params }
  }

  #ordenYTope() {
    let sql = ''
    if (this.ordenes.length) {
      const partes = this.ordenes.map(
        (o) => `${entrecomillar(o.columna)} ${o.ascending ? 'asc' : 'desc'}`,
      )
      sql += ` order by ${partes.join(', ')}`
    }
    if (this.tope != null) sql += ` limit ${Number(this.tope)}`
    return sql
  }

  // ---- Relaciones incrustadas ----------------------------------------------
  async #incrustar(registros, embeds) {
    if (!registros.length) return

    for (const embed of embeds) {
      const columna = columnaDeRelacion(this.tabla, embed)
      if (!columna) {
        for (const r of registros) r[embed.alias] = null
        continue
      }

      const ids = [...new Set(registros.map((r) => r[columna]).filter((v) => v != null))]
      if (!ids.length) {
        for (const r of registros) r[embed.alias] = null
        continue
      }

      const relacionadas = await filas(
        `select * from ${entrecomillar(embed.tabla)} where "id" in (${ids.map(() => '?').join(', ')})`,
        ids,
        embed.tabla,
      )
      const porId = new Map(relacionadas.map((x) => [x.id, x]))

      for (const r of registros) {
        r[embed.alias] = proyectar(porId.get(r[columna]) ?? null, embed.columnas)
      }
    }
  }

  /** Recorta a las columnas pedidas cuando el select no incluye `*`. */
  #proyectar(registros, analisis) {
    if (analisis.todo || !analisis.campos.length) return registros

    const claves = analisis.embeds.map((e) => e.alias)
    return registros.map((r) => {
      const salida = {}
      for (const c of analisis.campos) salida[c.alias] = r[c.origen] ?? null
      for (const k of claves) salida[k] = r[k] ?? null
      return salida
    })
  }

  // ---- Ejecución ------------------------------------------------------------
  async #leer() {
    const analisis = analizarSeleccion(this.cols)
    const { where, params } = this.#condiciones()

    const registros = await filas(
      `select * from ${entrecomillar(this.tabla)}${where}${this.#ordenYTope()}`,
      params,
      this.tabla,
    )

    await this.#incrustar(registros, analisis.embeds)
    return this.#empaquetar(this.#proyectar(registros, analisis))
  }

  /** Vuelve a leer por id las filas que acaba de tocar un insert/update. */
  async #releerPorId(ids) {
    if (!ids.length) return this.#empaquetar([])

    const analisis = analizarSeleccion(this.cols)
    const registros = await filas(
      `select * from ${entrecomillar(this.tabla)} where "id" in (${ids.map(() => '?').join(', ')})`,
      ids,
      this.tabla,
    )
    await this.#incrustar(registros, analisis.embeds)
    return this.#empaquetar(this.#proyectar(registros, analisis))
  }

  async #insertar() {
    const registros = Array.isArray(this.payload) ? this.payload : [this.payload]
    if (!registros.length) return this.#empaquetar([])

    const columnasTabla = await columnasCacheadas(this.tabla)
    const generaId = TABLAS_CON_UUID.includes(this.tabla)
    const ids = []
    const conflicto = this.op === 'upsert' ? ' or replace' : ''

    for (const original of registros) {
      const fila = { ...original }
      if (generaId && !fila.id) fila.id = uuid()

      // Columnas que no existen en la tabla se descartan, igual que haría
      // PostgREST devolviendo error... salvo que aquí es más útil no romper.
      const claves = Object.keys(fila).filter(
        (k) => columnasTabla.includes(k) && fila[k] !== undefined,
      )

      await ejecutar(
        `insert${conflicto} into ${entrecomillar(this.tabla)} ` +
          `(${claves.map(entrecomillar).join(', ')}) values (${claves.map(() => '?').join(', ')})`,
        claves.map((k) => fila[k]),
      )

      if (fila.id != null) ids.push(fila.id)
    }

    return this.retorna ? this.#releerPorId(ids) : this.#empaquetar(null)
  }

  async #actualizar() {
    const columnasTabla = await columnasCacheadas(this.tabla)
    const { where, params } = this.#condiciones()

    // Los ids se capturan ANTES: si el update toca una columna filtrada, luego
    // ya no habría forma de volver a encontrar esas filas.
    const afectadas = await filas(
      `select "id" from ${entrecomillar(this.tabla)}${where}`,
      params,
      this.tabla,
    )
    const ids = afectadas.map((r) => r.id)

    const claves = Object.keys(this.payload || {}).filter(
      (k) => columnasTabla.includes(k) && this.payload[k] !== undefined,
    )

    if (claves.length && ids.length) {
      await ejecutar(
        `update ${entrecomillar(this.tabla)} set ${claves
          .map((k) => `${entrecomillar(k)} = ?`)
          .join(', ')}${where}`,
        [...claves.map((k) => this.payload[k]), ...params],
      )
    }

    return this.retorna ? this.#releerPorId(ids) : this.#empaquetar(null)
  }

  async #borrar() {
    const { where, params } = this.#condiciones()
    await ejecutar(`delete from ${entrecomillar(this.tabla)}${where}`, params)
    return this.#empaquetar(null)
  }

  /** Da a la respuesta la forma de PostgREST, incluido el caso `.single()`. */
  #empaquetar(registros) {
    if (this.fila) {
      const lista = registros || []
      if (lista.length === 0) {
        if (this.fila === 'maybe') return { data: null, error: null }
        return {
          data: null,
          error: {
            code: 'PGRST116',
            message: 'JSON object requested, multiple (or no) rows returned',
            details: 'The result contains 0 rows',
          },
        }
      }
      return { data: lista[0], error: null }
    }
    return { data: registros, error: null }
  }

  #fallo(e) {
    const mensaje = String(e?.message || e)
    // Los errores de SQLite se traducen a algo parecido a lo que diría Postgres,
    // porque las vistas los muestran tal cual al usuario.
    if (/UNIQUE constraint failed: caja_sesiones/i.test(mensaje)) {
      return {
        data: null,
        error: { code: '23505', message: 'Ya hay una caja abierta.', details: mensaje },
      }
    }
    if (/UNIQUE constraint failed/i.test(mensaje)) {
      return {
        data: null,
        error: { code: '23505', message: 'Ya existe un registro con ese valor.', details: mensaje },
      }
    }
    if (/FOREIGN KEY constraint failed/i.test(mensaje)) {
      return {
        data: null,
        error: {
          code: '23503',
          message: 'No se puede completar: hay registros que dependen de este.',
          details: mensaje,
        },
      }
    }
    if (/CHECK constraint failed/i.test(mensaje)) {
      return { data: null, error: { code: '23514', message: 'Valor fuera de rango.', details: mensaje } }
    }
    return { data: null, error: { code: 'DEMO', message: mensaje, details: mensaje } }
  }

  async ejecutar() {
    if (VISTAS.includes(this.tabla) && this.op !== 'select') {
      return { data: null, error: { code: 'DEMO', message: `"${this.tabla}" es una vista de solo lectura.` } }
    }

    try {
      switch (this.op) {
        case 'insert':
        case 'upsert':
          return await this.#insertar()
        case 'update':
          return await this.#actualizar()
        case 'delete':
          return await this.#borrar()
        default:
          return await this.#leer()
      }
    } catch (e) {
      console.error(`[demo] Error en ${this.op} sobre "${this.tabla}":`, e)
      return this.#fallo(e)
    }
  }

  // Hace que `await consulta` funcione igual que con supabase-js.
  then(alCumplir, alFallar) {
    return this.ejecutar().then(alCumplir, alFallar)
  }
}
