// ----------------------------------------------------------------------------
//  Relaciones y análisis de la cadena `select` de PostgREST.
//
//  Supabase permite pedir tablas relacionadas dentro del propio select:
//
//    '*, cliente:clientes(nombre), barbero:usuarios_barberos(id, nombre)'
//
//  Aquí se interpreta esa sintaxis para saber qué columnas devolver y qué
//  relaciones incrustar. Se admite la pista explícita de clave foránea
//  (`usuarios_barberos!caja_sesiones_abierta_por_fkey`), necesaria cuando una
//  tabla apunta dos veces a la misma (caja_sesiones: abierta_por y cerrada_por).
// ----------------------------------------------------------------------------

// Claves foráneas del esquema: tabla → [{ columna local, tabla destino }].
export const RELACIONES = {
  citas: [
    { columna: 'cliente_id', destino: 'clientes' },
    { columna: 'barbero_id', destino: 'usuarios_barberos' },
    { columna: 'servicio_id', destino: 'servicios' },
  ],
  ventas: [
    { columna: 'cita_id', destino: 'citas' },
    { columna: 'barbero_id', destino: 'usuarios_barberos' },
    { columna: 'cliente_id', destino: 'clientes' },
    { columna: 'servicio_id', destino: 'servicios' },
    { columna: 'producto_id', destino: 'productos_inventario' },
    { columna: 'caja_sesion_id', destino: 'caja_sesiones' },
  ],
  movimientos_inventario: [
    { columna: 'producto_id', destino: 'productos_inventario' },
    { columna: 'barbero_id', destino: 'usuarios_barberos' },
  ],
  gastos: [
    { columna: 'caja_sesion_id', destino: 'caja_sesiones' },
    { columna: 'registrado_por', destino: 'usuarios_barberos' },
  ],
  caja_sesiones: [
    { columna: 'abierta_por', destino: 'usuarios_barberos' },
    { columna: 'cerrada_por', destino: 'usuarios_barberos' },
  ],
  pagos_comision: [
    { columna: 'barbero_id', destino: 'usuarios_barberos' },
    { columna: 'registrado_por', destino: 'usuarios_barberos' },
  ],
}

const EMBED = /^(?:([A-Za-z_]\w*):)?([A-Za-z_]\w*)(?:!([A-Za-z_]\w*))?\(([\s\S]*)\)$/

/** Parte por comas de primer nivel: los paréntesis de un embed no cuentan. */
function partirPorComas(texto) {
  const partes = []
  let actual = ''
  let nivel = 0

  for (const ch of texto) {
    if (ch === '(') nivel++
    else if (ch === ')') nivel--

    if (ch === ',' && nivel === 0) {
      partes.push(actual.trim())
      actual = ''
    } else {
      actual += ch
    }
  }
  if (actual.trim()) partes.push(actual.trim())
  return partes.filter(Boolean)
}

/**
 * Descompone una cadena de select.
 * Devuelve { todo, campos, embeds }: `todo` indica si se pidió `*`.
 */
export function analizarSeleccion(seleccion = '*') {
  const campos = []
  const embeds = []
  let todo = false

  for (const parte of partirPorComas(seleccion || '*')) {
    if (parte === '*') {
      todo = true
      continue
    }

    const m = parte.match(EMBED)
    if (m) {
      const [, alias, tabla, pista, interior] = m
      embeds.push({
        alias: alias || tabla,
        tabla,
        pista: pista || null,
        columnas: partirPorComas(interior),
      })
    } else {
      // Puede venir con alias simple ("total:monto"), que aquí no se usa pero
      // conviene no romper.
      const [alias, origen] = parte.includes(':') ? parte.split(':') : [parte, parte]
      campos.push({ alias: alias.trim(), origen: origen.trim() })
    }
  }

  return { todo, campos, embeds }
}

/**
 * Columna local que sostiene un embed.
 * Con pista se busca la coincidencia exacta del nombre de la restricción;
 * sin ella, la única clave foránea que apunte a esa tabla.
 */
export function columnaDeRelacion(tablaBase, embed) {
  const candidatas = (RELACIONES[tablaBase] || []).filter((r) => r.destino === embed.tabla)

  if (embed.pista) {
    const exacta = candidatas.find((r) => `${tablaBase}_${r.columna}_fkey` === embed.pista)
    if (exacta) return exacta.columna
  }

  if (candidatas.length === 1) return candidatas[0].columna

  if (candidatas.length > 1) {
    console.warn(
      `[demo] "${tablaBase}" tiene varias claves foráneas hacia "${embed.tabla}"; ` +
        `se usa "${candidatas[0].columna}". Añade la pista !${tablaBase}_columna_fkey.`,
    )
    return candidatas[0].columna
  }

  console.warn(`[demo] Sin relación conocida de "${tablaBase}" hacia "${embed.tabla}".`)
  return null
}

/** Recorta una fila a las columnas pedidas dentro del embed. */
export function proyectar(fila, columnas) {
  if (!fila) return null
  if (!columnas.length || columnas.includes('*')) return fila

  const salida = {}
  for (const col of columnas) {
    const [alias, origen] = col.includes(':') ? col.split(':') : [col, col]
    salida[alias.trim()] = fila[origen.trim()] ?? null
  }
  return salida
}
