import { useEffect, useMemo, useState } from 'react'
import { serviciosApi, inventarioApi, clientesApi, staffApi, cobroApi } from '@/services/api'
import { useAuth } from '@/features/auth/AuthContext'
import { fmtMoneda, hoyISO, METODOS_PAGO } from '@/shared/lib/format'
import { Modal, Boton, Campo, Select } from '@/shared/ui'

const METODOS = Object.entries(METODOS_PAGO).map(([id, m]) => ({ id, label: m.label }))
const PROPINAS_RAPIDAS = [2, 3, 5, 10]

/**
 * Cobro rápido SIN cita previa (cliente de paso). Admite varios servicios y
 * productos en un mismo ticket.
 */
export default function VentaRapidaModal({ onClose, onDone }) {
  const { usuario, esAdmin, horaCorte } = useAuth()

  const [servicios, setServicios] = useState([])
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [barberos, setBarberos] = useState([])

  const [barberoId, setBarberoId] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [lineasServicio, setLineasServicio] = useState([])
  const [lineasProd, setLineasProd] = useState([])
  const [servSel, setServSel] = useState('')
  const [prodSel, setProdSel] = useState('')
  const [propina, setPropina] = useState('')
  const [descuento, setDescuento] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [offlineOk, setOfflineOk] = useState(false)

  useEffect(() => {
    serviciosApi.activos().then(({ data }) => setServicios(data || []))
    inventarioApi.listar().then(({ data }) => setProductos(data || []))
    clientesApi.listar().then(({ data }) => setClientes(data || []))
    staffApi.activos().then(({ data }) => {
      const activos = data || []
      setBarberos(activos)
      setBarberoId(esAdmin ? activos[0]?.id || '' : usuario.id)
    })
  }, [esAdmin, usuario])

  const barbero = barberos.find((b) => b.id === barberoId)
  const pct = Number(barbero?.porcentaje_comision || 0)
  const desc = Number(descuento || 0)
  const prop = Number(propina || 0)

  const totales = useMemo(() => {
    const serviciosBruto = lineasServicio.reduce((s, l) => s + Number(l.servicio.precio), 0)
    const serviciosNeto = Math.max(0, serviciosBruto - desc)
    const totalProductos = lineasProd.reduce(
      (s, l) => s + Number(l.producto.precio_venta) * l.cantidad,
      0,
    )
    return {
      serviciosNeto,
      total: serviciosNeto + totalProductos + prop,
      comision: Math.round(serviciosNeto * pct) / 100 + prop,
    }
  }, [lineasServicio, lineasProd, desc, prop, pct])

  const agregarServicio = () => {
    const s = servicios.find((x) => x.id === servSel)
    if (!s) return
    setLineasServicio((prev) => [...prev, { servicio: s }])
    setServSel('')
  }

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

  const cobrar = async () => {
    if (!barberoId) return setError('Selecciona el barbero.')
    if (!lineasServicio.length && !lineasProd.length)
      return setError('Agrega al menos un servicio o producto.')

    setError(null)
    setGuardando(true)

    const items = []

    // El descuento se descuenta del primer servicio; la propina se adjunta a
    // la primera línea para que la comisión quede completa en una sola fila.
    lineasServicio.forEach((l, i) => {
      const neto = i === 0 ? Math.max(0, Number(l.servicio.precio) - desc) : Number(l.servicio.precio)
      items.push({
        tipo: 'servicio',
        servicio_id: l.servicio.id,
        cantidad: 1,
        monto: neto,
        comision_monto: Math.round(neto * pct) / 100 + (i === 0 ? prop : 0),
      })
    })

    lineasProd.forEach((l, i) => {
      items.push({
        tipo: 'producto',
        producto_id: l.producto.id,
        cantidad: l.cantidad,
        monto: Number(l.producto.precio_venta) * l.cantidad,
        // Sin servicios en el ticket, la propina viaja con el primer producto.
        comision_monto: !lineasServicio.length && i === 0 ? prop : 0,
      })
    })

    const ahora = new Date()
    const res = await cobroApi.registrar({
      cita: null,
      barberoId,
      clienteId: clienteId || null,
      items,
      metodoPago,
      propina: prop,
      descuento: desc,
      turno: ahora.getHours() < horaCorte ? 'manana' : 'tarde_noche',
      fecha: hoyISO(),
    })

    setGuardando(false)
    if (res.error) return setError(res.error.message || 'No se pudo registrar la venta')
    if (res.offline) return setOfflineOk(true)
    onDone?.(totales.total)
  }

  if (offlineOk) {
    return (
      <Modal
        abierto
        onClose={() => onDone?.()}
        titulo="Venta guardada"
        ancho="sm"
        pie={
          <Boton variante="marca" onClick={() => onDone?.()}>
            Listo
          </Boton>
        }
      >
        <div className="rounded-lg border border-aviso/40 bg-aviso/10 p-4 text-sm text-aviso">
          Sin internet: la venta de <b>{fmtMoneda(totales.total)}</b> quedó guardada en este
          dispositivo y se registrará sola al reconectar.
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      abierto
      onClose={onClose}
      ancho="lg"
      titulo="Venta rápida"
      descripcion="Para clientes que llegan sin reserva"
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
        <div className="grid gap-4 sm:grid-cols-2">
          {esAdmin && (
            <Campo etiqueta="Barbero" requerido>
              {(a11y) => (
                <Select {...a11y} value={barberoId} onChange={(e) => setBarberoId(e.target.value)}>
                  {barberos.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                    </option>
                  ))}
                </Select>
              )}
            </Campo>
          )}

          <Campo etiqueta="Cliente" className={esAdmin ? '' : 'sm:col-span-2'}>
            {(a11y) => (
              <Select {...a11y} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">— Sin registrar —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Campo>
        </div>

        {/* ---- Ticket ------------------------------------------------------ */}
        {(lineasServicio.length > 0 || lineasProd.length > 0) && (
          <section className="space-y-2">
            <p className="text-etiqueta font-semibold uppercase text-ink-500">Detalle</p>

            {lineasServicio.map((l, i) => (
              <LineaTicket
                key={`s-${i}`}
                nombre={l.servicio.nombre}
                monto={Number(l.servicio.precio)}
                onQuitar={() => setLineasServicio((p) => p.filter((_, j) => j !== i))}
              />
            ))}

            {lineasProd.map((l) => (
              <LineaTicket
                key={l.producto.id}
                nombre={`${l.cantidad}× ${l.producto.nombre}`}
                monto={Number(l.producto.precio_venta) * l.cantidad}
                onQuitar={() =>
                  setLineasProd((p) => p.filter((x) => x.producto.id !== l.producto.id))
                }
              />
            ))}
          </section>
        )}

        {/* ---- Añadir ------------------------------------------------------ */}
        <section className="grid gap-2 sm:grid-cols-2">
          <div className="flex gap-2">
            <Select value={servSel} onChange={(e) => setServSel(e.target.value)}>
              <option value="">+ Servicio…</option>
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
          {lineasServicio.length > 0 && (
            <div className="flex items-center justify-between text-sm text-ink-400">
              <span>
                Comisión del barbero ({pct}%{prop ? ' + propina' : ''})
              </span>
              <span className="cifras font-semibold text-marca-400">
                {fmtMoneda(totales.comision)}
              </span>
            </div>
          )}
          <div className="mt-3 flex items-baseline justify-between border-t border-ink-800 pt-3">
            <span className="font-semibold text-white">Total a cobrar</span>
            <span className="cifras text-2xl font-bold text-white">{fmtMoneda(totales.total)}</span>
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

function LineaTicket({ nombre, monto, onQuitar }) {
  return (
    <div className="flex animate-aparecer items-center gap-3 rounded-lg border border-ink-800 px-4 py-2.5">
      <span className="min-w-0 flex-1 truncate text-sm text-ink-200">{nombre}</span>
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
