// ----------------------------------------------------------------------------
//  Funciones remotas del modo demo.
//
//  Traducción de las dos funciones plpgsql de `supabase/setup/02_funciones.sql`.
//  SQLite no tiene lenguaje procedural, así que el cuerpo se escribe en JS,
//  pero la semántica se respeta: `registrar_cobro` sigue siendo atómica e
//  idempotente por ticket.
// ----------------------------------------------------------------------------
import { enTransaccion, filas, uuid } from './motor'
import { idActual, rolActual, sesionActual } from './sesion'

const num = (v, porDefecto = 0) => (v == null || v === '' ? porDefecto : Number(v))

/**
 * Registra un ticket completo en una sola transacción: las líneas de venta,
 * la salida de stock de los productos y el cierre de la cita.
 *
 * Reintentar con el mismo ticket_id no duplica nada.
 */
async function registrarCobro(p) {
  if (sesionActual() && rolActual() !== 'admin' && p.p_barbero_id !== idActual()) {
    throw new Error('No autorizado para registrar este cobro')
  }

  const [yaExiste] = await filas('select id from ventas where ticket_id = ? limit 1', [p.p_ticket_id])
  if (yaExiste) return null // idempotente

  const [caja] = await filas("select id from caja_sesiones where estado = 'abierta' limit 1")
  const cajaId = caja?.id ?? null

  const items = Array.isArray(p.p_items) ? p.p_items : []

  await enTransaccion((bd) => {
    items.forEach((item, i) => {
      bd.run(
        `insert into ventas (
           id, ticket_id, cita_id, barbero_id, cliente_id, servicio_id, producto_id,
           tipo, cantidad, monto, comision_monto, propina, descuento, metodo_pago,
           turno, fecha, caja_sesion_id
         ) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          uuid(),
          p.p_ticket_id,
          p.p_cita_id ?? null,
          p.p_barbero_id,
          p.p_cliente_id ?? null,
          item.servicio_id || null,
          item.producto_id || null,
          item.tipo,
          num(item.cantidad, 1),
          num(item.monto),
          num(item.comision_monto),
          // Propina y descuento van en la primera línea del ticket.
          i === 0 ? num(p.p_propina) : 0,
          i === 0 ? num(p.p_descuento) : 0,
          p.p_metodo_pago,
          p.p_turno,
          p.p_fecha,
          cajaId,
        ],
      )

      // El trigger trg_movimiento_stock descuenta el inventario.
      if (item.tipo === 'producto' && item.producto_id) {
        bd.run(
          `insert into movimientos_inventario (id, producto_id, tipo, cantidad, motivo, barbero_id)
           values (?, ?, 'salida', ?, 'Venta directa', ?)`,
          [uuid(), item.producto_id, num(item.cantidad, 1), p.p_barbero_id],
        )
      }
    })

    // Cierra la cita. El trigger trg_cita_completada no generará una venta
    // duplicada porque las líneas de arriba ya llevan este cita_id.
    if (p.p_cita_id) {
      bd.run("update citas set estado = 'completada' where id = ?", [p.p_cita_id])
    }
  })

  return null
}

/** Ganado, pagado y pendiente por barbero, sobre todo el histórico. */
async function liquidacionBarberos() {
  const registros = await filas(`
    select
      u.id       as barbero_id,
      u.nombre   as nombre,
      u.username as username,
      u.activo   as activo,
      coalesce((select sum(comision_monto) from ventas         where barbero_id = u.id), 0) as ganado,
      coalesce((select sum(monto)          from pagos_comision where barbero_id = u.id), 0) as pagado,
      coalesce((select sum(comision_monto) from ventas         where barbero_id = u.id), 0)
        - coalesce((select sum(monto)      from pagos_comision where barbero_id = u.id), 0) as pendiente
    from usuarios_barberos u
    order by u.nombre
  `)

  // `activo` viene como 0/1 porque la consulta no pertenece a una sola tabla.
  return registros.map((r) => ({ ...r, activo: Boolean(r.activo) }))
}

const FUNCIONES = {
  registrar_cobro: registrarCobro,
  liquidacion_barberos: liquidacionBarberos,
}

/** Punto de entrada equivalente a `supabase.rpc(nombre, params)`. */
export async function rpc(nombre, params = {}) {
  const fn = FUNCIONES[nombre]
  if (!fn) {
    return { data: null, error: { code: '42883', message: `La función "${nombre}" no existe.` } }
  }

  try {
    return { data: await fn(params), error: null }
  } catch (e) {
    console.error(`[demo] Error en la función "${nombre}":`, e)
    return { data: null, error: { code: 'DEMO', message: String(e?.message || e) } }
  }
}
