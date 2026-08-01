// ----------------------------------------------------------------------------
//  Las ventas se guardan como una fila por línea (servicio, producto…) y se
//  agrupan por `ticket_id`. Aquí se reconstruye el ticket que ve el usuario.
//  Las ventas antiguas sin ticket_id quedan como tickets de una sola línea.
// ----------------------------------------------------------------------------
export function agruparTickets(filas) {
  const mapa = new Map()

  for (const f of filas) {
    const clave = f.ticket_id || `suelta-${f.id}`

    if (!mapa.has(clave)) {
      mapa.set(clave, {
        key: clave,
        ticketId: f.ticket_id,
        filas: [],
        hora: f.created_at,
        fecha: f.fecha,
        total: 0,
        propina: 0,
        descuento: 0,
        comision: 0,
        metodo: f.metodo_pago,
        cliente: f.cliente?.nombre,
        telefono: f.cliente?.telefono,
        barbero: f.barbero?.nombre,
      })
    }

    const t = mapa.get(clave)
    t.filas.push(f)
    t.total += Number(f.monto) + Number(f.propina || 0)
    t.propina += Number(f.propina || 0)
    t.descuento += Number(f.descuento || 0)
    t.comision += Number(f.comision_monto || 0)
  }

  return [...mapa.values()]
}

// Descripción legible de una línea: "2× Cera Mate".
export function descripcionLinea(f) {
  const nombre =
    f.servicio?.nombre || f.producto?.nombre || (f.tipo === 'producto' ? 'Producto' : 'Servicio')
  return f.cantidad > 1 ? `${f.cantidad}× ${nombre}` : nombre
}
