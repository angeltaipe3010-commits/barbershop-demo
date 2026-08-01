import { useEffect, useMemo, useState } from 'react'
import { inventarioApi, serviciosApi, cobroApi } from '@/services/api'
import { fmtMoneda, turnoDe, METODOS_PAGO } from '@/shared/lib/format'
import { Modal, Boton, Select } from '@/shared/ui'

const METODOS = Object.entries(METODOS_PAGO).map(([id, m]) => ({ id, label: m.label }))

// Atajos de propina: en un mostrador, teclear el monto es el paso lento.
const PROPINAS_RAPIDAS = [2, 3, 5, 10]

/**
 * Cobro de una cita: servicio + extras + productos + propina + descuento +
 * método de pago. Al confirmar registra el ticket completo en una transacción,
 * descuenta stock y cierra la cita.
 */
export default function CobroModal({ cita, onClose, onDone }) {
  const [productos, setProductos] = useState([])
  const [servicios, setServicios] = useState([])
  const [lineasProd, setLineasProd] = useState([]) // { producto, cantidad }
  const [lineasServicio, setLineasServicio] = useState([]) // servicios EXTRA
  const [servSel, setServSel] = useState('')
  const [prodSel, setProdSel] = useState('')
  const [propina, setPropina] = useState('')
  const [descuento, setDescuento] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [offlineOk, setOfflineOk] = useState(false)

  useEffect(() => {
    inventarioApi.listar().then(({ data }) => setProductos(data || []))
    serviciosApi.activos().then(({ data }) => setServicios(data || []))
  }, [])

  const precioServicio = Number(cita.servicio?.precio || 0)
  const pct = Number(cita.barbero?.porcentaje_comision || 0)
  const desc = Number(descuento || 0)
  const prop = Number(propina || 0)

  const totales = useMemo(() => {
    // El descuento aplica al servicio de la cita; los extras van a precio lleno.
    const servicioNeto = Math.max(0, precioServicio - desc)
    const totalServiciosExtra = lineasServicio.reduce((s, l) => s + Number(l.servicio.precio), 0)
    const totalProductos = lineasProd.reduce(
      (s, l) => s + Number(l.producto.precio_venta) * l.cantidad,
      0,
    )
    const total = servicioNeto + totalServiciosExtra + totalProductos + prop
    // La propina va íntegra al barbero, además de su porcentaje.
    const comision =
      Math.round(servicioNeto * pct) / 100 + prop + Math.round(totalServiciosExtra * pct) / 100

    return { servicioNeto, totalServiciosExtra, totalProductos, total, comision }
  }, [precioServicio, desc, prop, pct, lineasServicio, lineasProd])

  const agregarServicio = () => {
    const s = servicios.find((x) => x.id === servSel)
    if (!s) return
    setLineasServicio((prev) => [...prev, { servicio: s }])
    setServSel('')
  }

  const quitarServicio = (idx) => setLineasServicio((prev) => prev.filter((_, i) => i !== idx))

  const agregarProducto = () => {
    const p = productos.find((x) => x.id === prodSel)
    if (!p) return
    setLineasProd((prev) => {
      const ya = prev.find((l) => l.producto.id === p.id)
      if (ya) {
        return prev.map((l) =>
          l.producto.id === p.id ? { ...l, cantidad: Math.min(l.cantidad + 1, p.stock) } : l,
        )
      }
      return [...prev, { producto: p, cantidad: 1 }]
    })
    setProdSel('')
  }

  const cambiarCantidad = (id, delta) =>
    setLineasProd((prev) =>
      prev
        .map((l) =>
          l.producto.id === id
            ? { ...l, cantidad: Math.max(0, Math.min(l.cantidad + delta, l.producto.stock)) }
            : l,
        )
        .filter((l) => l.cantidad > 0),
    )

  const quitarProducto = (id) => setLineasProd((prev) => prev.filter((l) => l.producto.id !== id))

  const cobrar = async () => {
    setError(null)
    setGuardando(true)

    const items = [
      {
        tipo: 'servicio',
        servicio_id: cita.servicio_id,
        descripcion: cita.servicio?.nombre,
        cantidad: 1,
        monto: totales.servicioNeto,
        comision_monto: Math.round(totales.servicioNeto * pct) / 100 + prop,
      },
      ...lineasServicio.map((l) => ({
        tipo: 'servicio',
        servicio_id: l.servicio.id,
        descripcion: l.servicio.nombre,
        cantidad: 1,
        monto: Number(l.servicio.precio),
        comision_monto: Math.round(Number(l.servicio.precio) * pct) / 100,
      })),
      ...lineasProd.map((l) => ({
        tipo: 'producto',
        producto_id: l.producto.id,
        descripcion: l.producto.nombre,
        cantidad: l.cantidad,
        monto: Number(l.producto.precio_venta) * l.cantidad,
        comision_monto: 0,
      })),
    ]

    const res = await cobroApi.registrar({
      cita,
      barberoId: cita.barbero_id,
      clienteId: cita.cliente_id,
      items,
      metodoPago,
      propina: prop,
      descuento: desc,
      turno: cita.turno || turnoDe(cita.fecha_hora),
      fecha: new Date(cita.fecha_hora).toISOString().slice(0, 10),
    })

    setGuardando(false)
    if (res.error) return setError(res.error.message || 'No se pudo registrar el cobro')
    if (res.offline) return setOfflineOk(true)
    onDone?.(totales.total)
  }

  // ---- Cobro guardado sin conexión -----------------------------------------
  if (offlineOk) {
    return (
      <Modal
        abierto
        onClose={() => onDone?.()}
        titulo="Cobro guardado"
        ancho="sm"
        pie={
          <Boton variante="marca" onClick={() => onDone?.()}>
            Listo
          </Boton>
        }
      >
        <div className="flex items-start gap-3 rounded-lg border border-aviso/40 bg-aviso/10 p-4">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-aviso" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm text-aviso">
            Sin internet: el cobro de <b>{fmtMoneda(totales.total)}</b> quedó guardado en este
            dispositivo y se registrará solo al reconectar. No lo vuelvas a cobrar.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      abierto
      onClose={onClose}
      ancho="lg"
      titulo="Cobrar"
      descripcion={`${cita.cliente?.nombre || 'Cliente'} · ${cita.barbero?.nombre || ''}`}
      pie={
        <>
          <Boton variante="sutil" onClick={onClose}>
            Cancelar
          </Boton>
          <Boton variante="marca" onClick={cobrar} cargando={guardando}>
            {guardando ? 'Cobrando…' : `Cobrar ${fmtMoneda(totales.total)}`}
          </Boton>
        </>
      }
    >
      <div className="space-y-5">
        {/* ---- Detalle del ticket ------------------------------------------ */}
        <section className="space-y-2">
          <p className="text-etiqueta font-semibold uppercase text-ink-500">Detalle</p>

          <div className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-950/50 px-4 py-3">
            <span className="font-medium text-white">{cita.servicio?.nombre || 'Servicio'}</span>
            <span className="cifras font-semibold text-white">{fmtMoneda(precioServicio)}</span>
          </div>

          {lineasServicio.map((l, i) => (
            <LineaTicket
              key={`s-${i}`}
              nombre={l.servicio.nombre}
              monto={Number(l.servicio.precio)}
              onQuitar={() => quitarServicio(i)}
            />
          ))}

          {lineasProd.map((l) => (
            <LineaTicket
              key={l.producto.id}
              nombre={l.producto.nombre}
              monto={Number(l.producto.precio_venta) * l.cantidad}
              cantidad={l.cantidad}
              onMas={() => cambiarCantidad(l.producto.id, 1)}
              onMenos={() => cambiarCantidad(l.producto.id, -1)}
              onQuitar={() => quitarProducto(l.producto.id)}
            />
          ))}
        </section>

        {/* ---- Añadir al ticket -------------------------------------------- */}
        <section className="grid gap-2 sm:grid-cols-2">
          <div className="flex gap-2">
            <Select value={servSel} onChange={(e) => setServSel(e.target.value)}>
              <option value="">+ Otro servicio…</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} · {fmtMoneda(s.precio)}
                </option>
              ))}
            </Select>
            <Boton variante="ghost" tamano="sm" onClick={agregarServicio} disabled={!servSel}>
              Añadir
            </Boton>
          </div>

          <div className="flex gap-2">
            <Select value={prodSel} onChange={(e) => setProdSel(e.target.value)}>
              <option value="">+ Producto…</option>
              {productos
                .filter((p) => p.stock > 0 && p.tipo === 'venta')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — {fmtMoneda(p.precio_venta)} ({p.stock})
                  </option>
                ))}
            </Select>
            <Boton variante="ghost" tamano="sm" onClick={agregarProducto} disabled={!prodSel}>
              Añadir
            </Boton>
          </div>
        </section>

        {/* ---- Propina y descuento ----------------------------------------- */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta-campo">Propina (S/)</label>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={propina}
              onChange={(e) => setPropina(e.target.value)}
              className="input-base"
              placeholder="0"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PROPINAS_RAPIDAS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPropina(String(prop === p ? '' : p))}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium
                              transition-all duration-rapida active:scale-95
                              ${
                                prop === p
                                  ? 'border-marca-600 bg-marca-600/15 text-marca-400'
                                  : 'border-ink-700 text-ink-400 hover:border-ink-600 hover:text-ink-100'
                              }`}
                >
                  +{p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="etiqueta-campo">Descuento (S/)</label>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
              className="input-base"
              placeholder="0"
            />
            <p className="mt-2 text-xs text-ink-500">Se aplica al servicio de la cita.</p>
          </div>
        </section>

        {/* ---- Método de pago ---------------------------------------------- */}
        <section>
          <label className="etiqueta-campo">Método de pago</label>
          <div className="flex flex-wrap gap-2">
            {METODOS.map((m) => {
              const activo = metodoPago === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetodoPago(m.id)}
                  aria-pressed={activo}
                  className={`rounded-lg border px-3.5 py-2 text-sm font-medium
                              transition-all duration-rapida ease-salida active:scale-95
                              ${
                                activo
                                  ? 'border-marca-600 bg-marca-600/15 text-marca-400 shadow-marca-sm'
                                  : 'border-ink-700 text-ink-300 hover:border-ink-600 hover:bg-ink-800'
                              }`}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* ---- Totales ------------------------------------------------------ */}
        <section className="rounded-xl2 border border-ink-800 bg-ink-950/60 p-4">
          <div className="flex items-center justify-between text-sm text-ink-400">
            <span>
              Comisión del barbero ({pct}%{prop ? ' + propina' : ''})
            </span>
            <span className="cifras font-semibold text-marca-400">
              {fmtMoneda(totales.comision)}
            </span>
          </div>
          {desc > 0 && (
            <div className="mt-1 flex items-center justify-between text-sm text-ink-400">
              <span>Descuento aplicado</span>
              <span className="cifras text-aviso">− {fmtMoneda(desc)}</span>
            </div>
          )}
          <div className="mt-3 flex items-baseline justify-between border-t border-ink-800 pt-3">
            <span className="font-semibold text-white">Total a cobrar</span>
            <span className="cifras text-2xl font-bold text-white">
              {fmtMoneda(totales.total)}
            </span>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="animate-aparecer-bajar rounded-lg border border-peligro/40 bg-peligro/10
                       px-3 py-2.5 text-sm text-peligro"
          >
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

// Línea del ticket, con control de cantidad cuando aplica.
function LineaTicket({ nombre, monto, cantidad, onMas, onMenos, onQuitar }) {
  return (
    <div className="flex animate-aparecer items-center gap-3 rounded-lg border border-ink-800 px-4 py-2.5">
      <span className="min-w-0 flex-1 truncate text-sm text-ink-200">{nombre}</span>

      {cantidad != null && (
        <div className="flex shrink-0 items-center gap-1">
          <BotonCantidad onClick={onMenos} etiqueta="Quitar uno">−</BotonCantidad>
          <span className="cifras w-6 text-center text-sm font-semibold text-white">{cantidad}</span>
          <BotonCantidad onClick={onMas} etiqueta="Añadir uno">+</BotonCantidad>
        </div>
      )}

      <span className="cifras shrink-0 text-sm font-medium text-ink-200">{fmtMoneda(monto)}</span>

      <button
        onClick={onQuitar}
        aria-label={`Quitar ${nombre}`}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-500
                   transition-colors duration-rapida hover:bg-peligro/15 hover:text-peligro"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

function BotonCantidad({ onClick, etiqueta, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      className="grid h-6 w-6 place-items-center rounded border border-ink-700 text-sm
                 text-ink-300 transition-all duration-rapida active:scale-90
                 hover:border-ink-600 hover:bg-ink-800 hover:text-white"
    >
      {children}
    </button>
  )
}
