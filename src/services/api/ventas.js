import { supabase } from '../supabase'
import { encolarCobro, estaOffline } from '../offline'
import { hoyISO } from '@/shared/lib/format'

const SELECT_DETALLE =
  '*, cliente:clientes(nombre, telefono), barbero:usuarios_barberos(nombre), servicio:servicios(nombre), producto:productos_inventario(nombre)'

// ---- Cobro / Punto de venta ------------------------------------------------
export const cobroApi = {
  /**
   * Registra un cobro completo en UNA transacción (RPC `registrar_cobro`):
   * líneas de venta (servicios + productos), descuento de stock y cierre de la
   * cita. La RPC es idempotente por ticket_id → reintentar nunca duplica.
   */
  async registrar({ cita, barberoId, clienteId, items, metodoPago, propina, descuento, turno, fecha }) {
    const ticketId = crypto.randomUUID()
    const params = {
      p_ticket_id: ticketId,
      p_barbero_id: barberoId,
      p_cliente_id: clienteId ?? null,
      p_cita_id: cita?.id ?? null,
      p_metodo_pago: metodoPago,
      p_propina: propina || 0,
      p_descuento: descuento || 0,
      p_turno: turno,
      p_fecha: fecha,
      p_items: items.map((it) => ({
        tipo: it.tipo,
        servicio_id: it.tipo === 'servicio' ? it.servicio_id : null,
        producto_id: it.tipo === 'producto' ? it.producto_id : null,
        cantidad: it.cantidad || 1,
        monto: it.monto,
        comision_monto: it.comision_monto || 0,
      })),
    }

    // Sin internet → encolar para sincronizar al reconectar.
    if (estaOffline()) {
      encolarCobro(params)
      return { ok: true, offline: true, ticketId }
    }

    const { error } = await supabase.rpc('registrar_cobro', params)
    if (error) {
      // Caída de red a mitad → encolar (idempotente, no duplica).
      if (/fetch|network|failed to|timeout/i.test(error.message || '')) {
        encolarCobro(params)
        return { ok: true, offline: true, ticketId }
      }
      return { error }
    }
    return { ok: true, ticketId }
  },
}

// ---- Ventas y reportes -----------------------------------------------------
export const ventasApi = {
  // Ventas de un día concreto (admin) o propias (barbero por RLS).
  porFecha(fecha = hoyISO(), barberoId = null) {
    let q = supabase
      .from('ventas')
      .select('*, barbero:usuarios_barberos(nombre), servicio:servicios(nombre)')
      .eq('fecha', fecha)
    if (barberoId) q = q.eq('barbero_id', barberoId)
    return q
  },

  // Detalle de un día con relaciones (registro de ventas).
  detalleDia(fecha = hoyISO(), barberoId = null) {
    let q = supabase
      .from('ventas')
      .select(SELECT_DETALLE)
      .eq('fecha', fecha)
      .order('created_at', { ascending: false })
    if (barberoId) q = q.eq('barbero_id', barberoId)
    return q
  },

  // Detalle de un rango (registro de ventas por período).
  detalleRango(desde, hasta, barberoId = null) {
    let q = supabase
      .from('ventas')
      .select(SELECT_DETALLE)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('created_at', { ascending: false })
    if (barberoId) q = q.eq('barbero_id', barberoId)
    return q
  },

  // Ventas de un rango de fechas (reportes por semana / mes).
  porRango(desde, hasta, barberoId = null) {
    let q = supabase
      .from('ventas')
      .select(
        '*, barbero:usuarios_barberos(nombre), servicio:servicios(nombre), producto:productos_inventario(nombre)',
      )
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: true })
    if (barberoId) q = q.eq('barbero_id', barberoId)
    return q
  },

  /**
   * Anula un ticket completo: restaura el stock de los productos, revierte la
   * cita asociada y borra las líneas. Solo admin (RLS de borrado de ventas).
   */
  async anularTicket(ticketId, filas) {
    const productos = (filas || []).filter((x) => x.tipo === 'producto' && x.producto_id)
    if (productos.length) {
      const { error } = await supabase.from('movimientos_inventario').insert(
        productos.map((f) => ({
          producto_id: f.producto_id,
          tipo: 'entrada',
          cantidad: f.cantidad || 1,
          motivo: 'Anulación de venta',
          barbero_id: f.barbero_id,
        })),
      )
      if (error) return { error: error.message }
    }

    // Revertir la cita asociada (si la hay) para poder re-cobrar.
    const citaId = (filas || []).find((f) => f.cita_id)?.cita_id
    if (citaId) await supabase.from('citas').update({ estado: 'confirmada' }).eq('id', citaId)

    const { error } = await supabase.from('ventas').delete().eq('ticket_id', ticketId)
    return error ? { error: error.message } : { ok: true }
  },

  // Acumulado de comisiones de un barbero entre dos fechas.
  async comisionesBarbero(barberoId, desde, hasta = hoyISO()) {
    const { data, error } = await supabase
      .from('ventas')
      .select('monto, comision_monto, fecha, turno')
      .eq('barbero_id', barberoId)
      .gte('fecha', desde)
      .lte('fecha', hasta)
    if (error) return { error }

    const total = (data || []).reduce(
      (acc, v) => {
        acc.ventas += Number(v.monto)
        acc.comision += Number(v.comision_monto)
        return acc
      },
      { ventas: 0, comision: 0 },
    )
    return { data: { detalle: data, ...total } }
  },
}
