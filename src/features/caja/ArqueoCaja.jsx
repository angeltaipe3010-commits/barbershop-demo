import { useMemo, useState } from 'react'
import { cajaApi } from '@/services/api'
import { Panel, Boton, TextArea, useConfirm, useToast } from '@/shared/ui'
import { fmtMoneda } from '@/shared/lib/format'

// Denominaciones del Sol peruano (billetes y monedas).
const DENOMS = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1]

/**
 * Arqueo y cierre de caja.
 * El contador por denominación es lo que evita el error clásico de sumar
 * mentalmente: se cuentan billetes y el total se calcula solo.
 */
export default function ArqueoCaja({ sesion, efectivoEsperado, usuarioId, onCerrada }) {
  const confirmar = useConfirm()
  const toast = useToast()

  const [conteo, setConteo] = useState({})
  const [montoContado, setMontoContado] = useState('')
  const [notas, setNotas] = useState('')
  const [cerrando, setCerrando] = useState(false)

  const diferencia = Number(montoContado || 0) - efectivoEsperado
  const totalContado = useMemo(
    () => DENOMS.reduce((s, d) => s + d * (Number(conteo[d]) || 0), 0),
    [conteo],
  )

  const setDenominacion = (d, n) => {
    const cant = Math.max(0, Math.floor(Number(n) || 0))
    const siguiente = { ...conteo, [d]: cant }
    setConteo(siguiente)
    const total = DENOMS.reduce((s, x) => s + x * (Number(siguiente[x]) || 0), 0)
    setMontoContado(total ? total.toFixed(2) : '')
  }

  const cerrar = async () => {
    if (montoContado === '') {
      return toast.aviso('Ingresa el efectivo contado antes de cerrar')
    }

    const ok = await confirmar({
      titulo: 'Cerrar caja',
      mensaje:
        diferencia === 0
          ? 'El arqueo cuadra exacto. Al cerrar, esta sesión ya no admitirá más movimientos.'
          : `Hay un ${diferencia > 0 ? 'sobrante' : 'faltante'} de ${fmtMoneda(Math.abs(diferencia))}. Se registrará el descuadre y la sesión no admitirá más movimientos.`,
      accionLabel: 'Cerrar caja',
      peligro: diferencia !== 0,
    })
    if (!ok) return

    setCerrando(true)
    const { error } = await cajaApi.cerrar(sesion.id, {
      monto_final_contado: montoContado,
      efectivo_esperado: efectivoEsperado,
      diferencia,
      cerrada_por: usuarioId,
      notas,
    })
    setCerrando(false)

    if (error) return toast.error('No se pudo cerrar la caja', { detalle: error.message })

    setMontoContado('')
    setConteo({})
    setNotas('')
    onCerrada?.(diferencia)
  }

  return (
    <Panel className="max-w-2xl">
      <Panel.Cabecera
        titulo="Cerrar caja (arqueo)"
        descripcion="Cuenta el efectivo físico y compáralo con lo esperado"
      />

      <Panel.Cuerpo className="space-y-5">
        {/* Contador por denominación */}
        <section>
          <p className="mb-2 text-etiqueta font-semibold uppercase text-ink-500">
            Contar efectivo (opcional)
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DENOMS.map((d) => (
              <div
                key={d}
                className="flex items-center gap-2 rounded-lg border border-ink-800
                           bg-ink-950/50 px-2.5 py-1.5 transition-colors duration-rapida
                           focus-within:border-ink-600"
              >
                <span className="w-12 shrink-0 text-sm text-ink-400">
                  S/ {d % 1 === 0 ? d : d.toFixed(2)}
                </span>
                <span className="text-ink-600">×</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={conteo[d] ?? ''}
                  onChange={(e) => setDenominacion(d, e.target.value)}
                  className="input-base w-full px-2 py-1 text-sm"
                  placeholder="0"
                  aria-label={`Cantidad de ${d} soles`}
                />
              </div>
            ))}
          </div>

          {totalContado > 0 && (
            <p className="mt-2 text-right text-sm text-ink-400">
              Contado:{' '}
              <span className="cifras font-semibold text-white">{fmtMoneda(totalContado)}</span>
            </p>
          )}
        </section>

        {/* Total contado */}
        <section>
          <label className="etiqueta-campo">Efectivo contado en caja (S/)</label>
          <input
            type="number"
            min="0"
            step="0.10"
            inputMode="decimal"
            value={montoContado}
            onChange={(e) => {
              setMontoContado(e.target.value)
              setConteo({})
            }}
            className="input-base text-lg font-semibold"
            placeholder="0.00"
          />
        </section>

        {/* Resultado del arqueo */}
        {montoContado !== '' && (
          <div
            className={`animate-aparecer rounded-xl2 border p-4 ${
              diferencia === 0
                ? 'border-exito/30 bg-exito/10'
                : diferencia > 0
                  ? 'border-info/30 bg-info/10'
                  : 'border-peligro/30 bg-peligro/10'
            }`}
          >
            <div className="flex justify-between text-sm text-ink-400">
              <span>Efectivo esperado</span>
              <span className="cifras">{fmtMoneda(efectivoEsperado)}</span>
            </div>
            <div
              className={`mt-2 flex items-baseline justify-between font-semibold ${
                diferencia === 0 ? 'text-exito' : diferencia > 0 ? 'text-info' : 'text-peligro'
              }`}
            >
              <span>
                {diferencia === 0 ? 'Cuadra exacto' : diferencia > 0 ? 'Sobrante' : 'Faltante'}
              </span>
              <span className="cifras text-xl">
                {fmtMoneda(Math.abs(diferencia))}
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="etiqueta-campo">Notas del cierre (opcional)</label>
          <TextArea
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Explica el descuadre, incidencias del día…"
          />
        </div>

        <Boton variante="marca" onClick={cerrar} cargando={cerrando} className="w-full">
          Cerrar caja
        </Boton>
      </Panel.Cuerpo>
    </Panel>
  )
}
