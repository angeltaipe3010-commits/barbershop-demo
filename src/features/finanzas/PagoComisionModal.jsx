import { useEffect, useState } from 'react'
import { liquidacionApi } from '@/services/api'
import { Modal, Boton, Campo, Input, EsqueletoTexto } from '@/shared/ui'
import { fmtMoneda, fmtFecha, hoyISO } from '@/shared/lib/format'

/**
 * Registro del pago de comisión a un barbero.
 * Propone de entrada lo generado y aún no pagado en el período: en la práctica
 * es el monto correcto casi siempre, y sigue siendo editable.
 */
export default function PagoComisionModal({
  barbero,
  etiquetaPeriodo,
  rango,
  usuarioId,
  onClose,
  onDone,
}) {
  const sugerido = Math.max(0, Number(barbero.generado) - Number(barbero.pagadoPeriodo))

  const [monto, setMonto] = useState(sugerido > 0 ? sugerido.toFixed(2) : '')
  const [notas, setNotas] = useState(
    rango
      ? `Liquidación ${etiquetaPeriodo.toLowerCase()} ${fmtFecha(rango.desde)}–${fmtFecha(rango.hasta)}`
      : '',
  )
  const [historial, setHistorial] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    liquidacionApi.historial(barbero.barbero_id).then(({ data }) => setHistorial(data || []))
  }, [barbero.barbero_id])

  const registrar = async (e) => {
    e.preventDefault()
    const m = Number(monto)
    if (!m || m <= 0) return setError('Ingresa un monto mayor a cero.')

    setError(null)
    setGuardando(true)

    const { error } = await liquidacionApi.registrarPago({
      barbero_id: barbero.barbero_id,
      monto: m,
      notas: notas.trim() || null,
      fecha: hoyISO(),
      registrado_por: usuarioId,
    })

    setGuardando(false)
    if (error) return setError(error.message)
    onDone?.(m)
  }

  return (
    <Modal
      abierto
      onClose={onClose}
      ancho="md"
      titulo="Pagar comisión"
      descripcion={barbero.nombre}
      pie={
        <>
          <Boton variante="sutil" onClick={onClose}>
            Cancelar
          </Boton>
          <Boton variante="marca" type="submit" form="form-pago" cargando={guardando}>
            Registrar pago
          </Boton>
        </>
      }
    >
      <form id="form-pago" onSubmit={registrar} className="space-y-5">
        {/* Contexto del saldo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-ink-800 bg-ink-950/50 p-3">
            <p className="text-xs text-ink-500">Generado {etiquetaPeriodo.toLowerCase()}</p>
            <p className="cifras mt-0.5 text-lg font-bold text-white">
              {fmtMoneda(barbero.generado)}
            </p>
          </div>
          <div className="rounded-lg border border-marca-600/30 bg-marca-600/10 p-3">
            <p className="text-xs text-ink-500">Pendiente total</p>
            <p className="cifras mt-0.5 text-lg font-bold text-marca-400">
              {fmtMoneda(barbero.pendiente)}
            </p>
          </div>
        </div>

        <Campo
          etiqueta="Monto a pagar (S/)"
          requerido
          ayuda={sugerido > 0 ? `Sugerido: ${fmtMoneda(sugerido)} (lo del período sin pagar)` : undefined}
        >
          {(a11y) => (
            <Input
              {...a11y}
              required
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              autoFocus
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="text-lg font-semibold"
            />
          )}
        </Campo>

        <Campo etiqueta="Notas">
          {(a11y) => (
            <Input
              {...a11y}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="ej. pago semanal en efectivo"
            />
          )}
        </Campo>

        {/* Pagos anteriores: evita pagar dos veces lo mismo. */}
        <section>
          <p className="mb-2 text-etiqueta font-semibold uppercase text-ink-500">
            Pagos anteriores
          </p>
          {historial === null ? (
            <EsqueletoTexto lineas={2} />
          ) : historial.length === 0 ? (
            <p className="text-sm text-ink-500">Aún no se le ha pagado ninguna comisión.</p>
          ) : (
            <ul className="max-h-36 space-y-1.5 overflow-y-auto pr-1 text-sm">
              {historial.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-md
                             border border-ink-800 px-3 py-1.5"
                >
                  <span className="min-w-0 truncate text-ink-400">
                    {fmtFecha(p.fecha)}
                    {p.notas ? ` · ${p.notas}` : ''}
                  </span>
                  <span className="cifras shrink-0 font-medium text-ink-200">
                    {fmtMoneda(p.monto)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && (
          <p role="alert" className="text-sm text-peligro">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
