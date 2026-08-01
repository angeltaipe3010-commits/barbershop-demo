import { useState } from 'react'
import { inventarioApi } from '@/services/api'
import { Modal, Boton, Campo, Input } from '@/shared/ui'

const MOTIVOS = {
  entrada: ['Reabastecimiento', 'Devolución', 'Ajuste de conteo'],
  salida: ['Consumo interno', 'Merma', 'Ajuste de conteo'],
}

/**
 * Entrada o salida de stock con cantidad y motivo.
 * El trigger de la base ajusta el stock del producto al insertar.
 */
export default function MovimientoModal({ producto, tipo, barberoId, onClose, onDone }) {
  const esEntrada = tipo === 'entrada'
  const [cantidad, setCantidad] = useState('1')
  const [motivo, setMotivo] = useState(MOTIVOS[tipo][0])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const n = Number(cantidad)
  const stockResultante = esEntrada ? producto.stock + (n || 0) : producto.stock - (n || 0)

  const guardar = async (e) => {
    e.preventDefault()
    if (!n || n <= 0) return setError('Ingresa una cantidad válida.')
    if (!esEntrada && n > producto.stock) return setError(`Solo hay ${producto.stock} en stock.`)

    setError(null)
    setGuardando(true)

    const { error } = await inventarioApi.registrarMovimiento({
      producto_id: producto.id,
      tipo,
      cantidad: n,
      motivo,
      barbero_id: barberoId,
    })

    setGuardando(false)
    if (error) return setError(error.message)
    onDone?.(n)
  }

  return (
    <Modal
      abierto
      onClose={onClose}
      ancho="sm"
      titulo={esEntrada ? 'Entrada de stock' : 'Salida de stock'}
      descripcion={`${producto.nombre} · stock actual: ${producto.stock}`}
      pie={
        <>
          <Boton variante="sutil" onClick={onClose}>
            Cancelar
          </Boton>
          <Boton variante="marca" type="submit" form="form-movimiento" cargando={guardando}>
            {esEntrada ? 'Registrar entrada' : 'Registrar salida'}
          </Boton>
        </>
      }
    >
      <form id="form-movimiento" onSubmit={guardar} className="space-y-4">
        <Campo etiqueta="Cantidad" requerido>
          {(a11y) => (
            <Input
              {...a11y}
              type="number"
              min="1"
              inputMode="numeric"
              autoFocus
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          )}
        </Campo>

        <Campo etiqueta="Motivo">
          {(a11y) => (
            <>
              <Input {...a11y} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {MOTIVOS[tipo].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivo(m)}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-all duration-rapida
                                active:scale-95
                                ${
                                  motivo === m
                                    ? 'border-marca-600 bg-marca-600/15 text-marca-400'
                                    : 'border-ink-700 text-ink-400 hover:border-ink-600 hover:text-ink-100'
                                }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </>
          )}
        </Campo>

        {/* Efecto de la operación, antes de confirmarla. */}
        {n > 0 && (
          <p className="rounded-lg border border-ink-800 bg-ink-950/50 px-3.5 py-2.5 text-sm text-ink-400">
            El stock quedará en{' '}
            <b className={`cifras ${stockResultante <= producto.stock_minimo ? 'text-aviso' : 'text-white'}`}>
              {Math.max(0, stockResultante)}
            </b>
            {stockResultante <= producto.stock_minimo && ' — por debajo del mínimo'}
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-peligro">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
