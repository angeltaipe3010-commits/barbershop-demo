import { useState } from 'react'
import { useReporte } from './useReporte'
import {
  EncabezadoVista,
  Panel,
  StatCard,
  Boton,
  PeriodoSelector,
  Aparecer,
  EsqueletoTarjetas,
  EsqueletoTexto,
  EstadoVacio,
  BarrasHorizontales,
  Columnas,
  useToast,
} from '@/shared/ui'
import { descargarCSV } from '@/shared/lib/exportar'
import { fmtMoneda, fmtFecha, fmtFechaCorta, hoyISO, TURNOS } from '@/shared/lib/format'

export default function Reportes() {
  const toast = useToast()
  const [periodo, setPeriodo] = useState('dia')
  const [refFecha, setRefFecha] = useState(hoyISO())

  const {
    desde,
    hasta,
    ventas,
    cargando,
    totalIngresos,
    totalComisiones,
    totalPropinas,
    porTurno,
    porBarbero,
    porServicio,
    porProducto,
    porDia,
    numVentas,
  } = useReporte(periodo, refFecha)

  const esDia = periodo === 'dia'

  const exportar = () => {
    const columnas = [
      { key: 'fecha', label: 'Fecha' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'item', label: 'Servicio/Producto' },
      { key: 'barbero', label: 'Barbero' },
      { key: 'metodo_pago', label: 'Método de pago' },
      { key: 'monto', label: 'Monto (S/)' },
      { key: 'propina', label: 'Propina (S/)' },
      { key: 'comision_monto', label: 'Comisión (S/)' },
    ]
    const filas = ventas.map((v) => ({
      fecha: v.fecha,
      tipo: v.tipo || 'servicio',
      item: v.servicio?.nombre || v.producto?.nombre || 'Servicio',
      barbero: v.barbero?.nombre || '',
      metodo_pago: v.metodo_pago,
      monto: Number(v.monto).toFixed(2),
      propina: Number(v.propina || 0).toFixed(2),
      comision_monto: Number(v.comision_monto).toFixed(2),
    }))
    descargarCSV(`reporte-${periodo}-${desde}.csv`, columnas, filas)
    toast.exito('Archivo descargado', { detalle: `${filas.length} líneas exportadas` })
  }

  return (
    <div className="space-y-6">
      <EncabezadoVista
        titulo="Reportes de ventas"
        descripcion={esDia ? fmtFecha(desde) : `${fmtFecha(desde)} — ${fmtFecha(hasta)}`}
        acciones={
          <>
            <PeriodoSelector
              periodo={periodo}
              setPeriodo={setPeriodo}
              refFecha={refFecha}
              setRefFecha={setRefFecha}
            />
            <Boton variante="ghost" onClick={exportar} disabled={!ventas.length}>
              Exportar
            </Boton>
          </>
        }
      />

      {cargando ? (
        <EsqueletoTarjetas n={4} />
      ) : (
        <div className="escalonar grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            titulo="Ingresos"
            valor={totalIngresos}
            sub={`${numVentas} ${numVentas === 1 ? 'línea' : 'líneas'} de venta`}
            acento
          />
          <StatCard
            titulo="Comisiones"
            valor={totalComisiones}
            sub={totalPropinas > 0 ? `Incluye ${fmtMoneda(totalPropinas)} de propinas` : undefined}
          />
          <StatCard
            titulo="Utilidad bruta"
            valor={totalIngresos - totalComisiones}
            sub="Ingresos − comisiones"
          />
          <StatCard
            titulo="Ticket promedio"
            valor={numVentas ? totalIngresos / numVentas : 0}
          />
        </div>
      )}

      {/* Serie temporal */}
      {!esDia && (
        <Aparecer>
          <Panel>
            <Panel.Cabecera titulo="Ingresos por día" descripcion="Evolución dentro del período" />
            <Panel.Cuerpo>
              {cargando ? (
                <div className="esqueleto h-40" />
              ) : porDia.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-500">Sin ventas en el período.</p>
              ) : (
                <Columnas
                  datos={porDia.map((d) => ({
                    etiqueta: d.fecha.slice(8, 10),
                    etiquetaLarga: fmtFechaCorta(d.fecha),
                    valor: d.ingresos,
                  }))}
                />
              )}
            </Panel.Cuerpo>
          </Panel>
        </Aparecer>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Aparecer>
          <Panel className="h-full">
            <Panel.Cabecera titulo="Por turno" descripcion="Mañana vs. tarde/noche" />
            <Panel.Cuerpo>
              {cargando ? (
                <EsqueletoTexto lineas={2} />
              ) : totalIngresos === 0 ? (
                <p className="py-6 text-center text-sm text-ink-500">Sin ventas en el período.</p>
              ) : (
                <BarrasHorizontales
                  datos={Object.entries(porTurno).map(([turno, monto]) => ({
                    etiqueta: TURNOS[turno],
                    valor: monto,
                    color: turno === 'manana' ? 'bg-aviso' : 'bg-marca-600',
                  }))}
                />
              )}
            </Panel.Cuerpo>
          </Panel>
        </Aparecer>

        <Aparecer retardo={80}>
          <Panel className="h-full">
            <Panel.Cabecera titulo="Comisiones por barbero" />
            <Panel.Cuerpo>
              {cargando ? (
                <EsqueletoTexto lineas={4} />
              ) : porBarbero.length === 0 ? (
                <EstadoVacio
                  titulo="Sin ventas en el período"
                  mensaje="Prueba con otro rango de fechas."
                  className="py-6"
                />
              ) : (
                <ul className="escalonar space-y-2">
                  {porBarbero.map((b) => (
                    <li
                      key={b.nombre}
                      className="flex items-center justify-between gap-3 rounded-lg border
                                 border-ink-800 bg-ink-950/40 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{b.nombre}</p>
                        <p className="text-xs text-ink-500">
                          {b.servicios} servicios · {fmtMoneda(b.ingresos)}
                        </p>
                      </div>
                      <span className="cifras shrink-0 font-semibold text-marca-400">
                        {fmtMoneda(b.comision)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel.Cuerpo>
          </Panel>
        </Aparecer>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Ranking
          titulo="Servicios más vendidos"
          items={porServicio}
          cargando={cargando}
          vacio="Sin servicios vendidos en el período."
        />
        <Ranking
          titulo="Productos más vendidos"
          items={porProducto}
          cargando={cargando}
          vacio="Sin productos vendidos en el período."
          retardo={80}
        />
      </div>
    </div>
  )
}

// Ranking numerado: la posición se lee antes que la barra.
function Ranking({ titulo, items, cargando, vacio, retardo = 0 }) {
  const max = items[0]?.cantidad || 1

  return (
    <Aparecer retardo={retardo}>
      <Panel className="h-full">
        <Panel.Cabecera titulo={titulo} />
        <Panel.Cuerpo>
          {cargando ? (
            <EsqueletoTexto lineas={5} />
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">{vacio}</p>
          ) : (
            <div className="escalonar space-y-3">
              {items.slice(0, 8).map((s, i) => (
                <div key={s.nombre} className="flex items-center gap-3">
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-bold
                                ${i === 0 ? 'bg-marca-600/20 text-marca-400' : 'bg-ink-800 text-ink-500'}`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="truncate text-ink-200">{s.nombre}</span>
                      <span className="shrink-0 text-ink-400">
                        <span className="cifras font-semibold text-white">{s.cantidad}</span> ·{' '}
                        <span className="cifras">{fmtMoneda(s.ingresos)}</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
                      <div
                        className="h-full origin-left rounded-full bg-marca-600 animate-crecer-barra"
                        style={{
                          width: `${(s.cantidad / max) * 100}%`,
                          animationDelay: `${i * 60}ms`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel.Cuerpo>
      </Panel>
    </Aparecer>
  )
}
