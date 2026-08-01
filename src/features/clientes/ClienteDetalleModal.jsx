import { useEffect, useMemo, useState } from 'react'
import { clientesApi } from '@/services/api'
import { Modal, Boton, Badge, EstadoVacio, EsqueletoTexto } from '@/shared/ui'
import { fmtMoneda, fmtFecha, iniciales, METODOS_PAGO } from '@/shared/lib/format'

/**
 * Ficha del cliente: datos, resumen de valor y su historial de visitas.
 * Lo que un barbero necesita saber antes de atenderlo, en una pantalla.
 */
export default function ClienteDetalleModal({ cliente, onClose, onEditar }) {
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    setCargando(true)
    clientesApi.historial(cliente.id).then(({ data }) => {
      setHistorial(data || [])
      setCargando(false)
    })
  }, [cliente.id])

  const resumen = useMemo(() => {
    const servicios = historial.filter((v) => v.tipo === 'servicio')
    const totalGastado = historial.reduce(
      (s, v) => s + Number(v.monto) + Number(v.propina || 0),
      0,
    )

    // Servicio más repetido: el "de siempre" del cliente.
    const frecuencia = {}
    for (const v of servicios) {
      const n = v.servicio?.nombre
      if (n) frecuencia[n] = (frecuencia[n] || 0) + 1
    }
    const favorito = Object.entries(frecuencia).sort((a, b) => b[1] - a[1])[0]?.[0]

    return {
      visitas: servicios.length,
      totalGastado,
      ultima: historial[0]?.fecha,
      favorito,
      ticketPromedio: servicios.length ? totalGastado / servicios.length : 0,
    }
  }, [historial])

  return (
    <Modal
      abierto
      onClose={onClose}
      ancho="md"
      titulo={cliente.nombre}
      descripcion={
        [cliente.telefono, cliente.email].filter(Boolean).join(' · ') || 'Sin datos de contacto'
      }
      pie={
        <>
          <Boton variante="sutil" onClick={onClose}>
            Cerrar
          </Boton>
          <Boton variante="ghost" onClick={() => onEditar(cliente)}>
            Editar ficha
          </Boton>
        </>
      }
    >
      <div className="space-y-5">
        {/* Identidad */}
        <div className="flex items-center gap-4">
          <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl
                       bg-gradient-to-br from-marca-500 to-marca-700 text-lg font-bold text-white"
          >
            {iniciales(cliente.nombre)}
          </div>
          <div className="min-w-0 flex-1">
            {resumen.favorito ? (
              <p className="text-sm text-ink-400">
                Suele pedir <span className="font-medium text-white">{resumen.favorito}</span>
              </p>
            ) : (
              <p className="text-sm text-ink-500">Sin historial suficiente todavía.</p>
            )}
            {resumen.visitas >= 5 && (
              <Badge tono="marca" className="mt-1.5">
                Cliente frecuente
              </Badge>
            )}
          </div>
        </div>

        {cliente.preferencias && (
          <p className="rounded-lg border border-ink-800 bg-ink-950/50 px-3.5 py-2.5 text-sm text-ink-300">
            <span className="text-ink-500">Preferencias: </span>
            {cliente.preferencias}
          </p>
        )}

        {cliente.notas && (
          <p className="rounded-lg border border-ink-800 bg-ink-950/50 px-3.5 py-2.5 text-sm text-ink-300">
            <span className="text-ink-500">Notas: </span>
            {cliente.notas}
          </p>
        )}

        {/* Resumen de valor */}
        <div className="escalonar grid grid-cols-3 gap-3">
          <Metrica valor={resumen.visitas} etiqueta="Visitas" />
          <Metrica valor={fmtMoneda(resumen.totalGastado)} etiqueta="Total gastado" acento />
          <Metrica
            valor={resumen.ultima ? fmtFecha(resumen.ultima) : '—'}
            etiqueta="Última visita"
            pequeno
          />
        </div>

        {/* Historial */}
        <section>
          <h3 className="mb-2 text-etiqueta font-semibold uppercase text-ink-500">
            Historial de visitas
          </h3>

          {cargando ? (
            <EsqueletoTexto lineas={4} />
          ) : historial.length === 0 ? (
            <EstadoVacio
              titulo="Sin visitas registradas"
              mensaje="Aparecerán aquí en cuanto se le cobre un servicio."
              className="py-8"
            />
          ) : (
            <ul className="escalonar max-h-64 space-y-2 overflow-y-auto pr-1">
              {historial.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-3 rounded-lg border
                             border-ink-800 bg-ink-950/40 px-3.5 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-ink-100">
                      {v.servicio?.nombre ||
                        v.producto?.nombre ||
                        (v.tipo === 'producto' ? 'Producto' : 'Servicio')}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {fmtFecha(v.fecha)}
                      {v.metodo_pago && ` · ${METODOS_PAGO[v.metodo_pago]?.label || v.metodo_pago}`}
                      {v.barbero?.nombre && ` · ${v.barbero.nombre}`}
                    </p>
                  </div>
                  <span className="cifras shrink-0 font-semibold text-ink-200">
                    {fmtMoneda(v.monto)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  )
}

function Metrica({ valor, etiqueta, acento = false, pequeno = false }) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-950/40 p-3 text-center">
      <p
        className={`cifras truncate font-bold ${pequeno ? 'text-sm' : 'text-xl'} ${
          acento ? 'text-marca-400' : 'text-white'
        }`}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-xs text-ink-500">{etiqueta}</p>
    </div>
  )
}
