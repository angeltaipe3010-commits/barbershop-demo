import { Link } from 'react-router-dom'
import { useReporteDiario } from './useReporteDiario'
import {
  EncabezadoVista,
  StatCard,
  Panel,
  Tabla,
  Badge,
  Aparecer,
  EsqueletoTarjetas,
  EsqueletoTabla,
  EstadoVacio,
  BarrasHorizontales,
} from '@/shared/ui'
import { fmtMoneda, TURNOS, iniciales } from '@/shared/lib/format'

// ----------------------------------------------------------------------------
//  Panel del administrador: cómo va el día, en un vistazo.
//  Orden de lectura: cuánto entró → cómo se reparte → quién lo hizo.
// ----------------------------------------------------------------------------
export default function DashboardAdmin() {
  const {
    cargando,
    totalIngresos,
    totalComisiones,
    variacion,
    porTurno,
    porBarbero,
    numVentas,
  } = useReporteDiario()

  const utilidadNeta = totalIngresos - totalComisiones
  const ticketPromedio = numVentas ? totalIngresos / numVentas : 0

  return (
    <div className="space-y-6">
      <EncabezadoVista
        titulo="Panel del día"
        descripcion="Resumen financiero y operativo de hoy"
        acciones={
          <Link to="/reportes" className="btn-ghost">
            Ver reportes
          </Link>
        }
      />

      {cargando ? (
        <EsqueletoTarjetas n={4} />
      ) : (
        <div className="escalonar grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            titulo="Ingresos del día"
            valor={totalIngresos}
            sub={`${numVentas} ${numVentas === 1 ? 'venta' : 'ventas'}`}
            tendencia={variacion}
            acento
            icono={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" />
              </svg>
            }
          />
          <StatCard
            titulo="Comisiones"
            valor={totalComisiones}
            sub="A pagar a los barberos"
            icono={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <StatCard
            titulo="Utilidad neta"
            valor={utilidadNeta}
            sub="Ingresos − comisiones"
            icono={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18M7 16l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <StatCard
            titulo="Ticket promedio"
            valor={ticketPromedio}
            sub="Por venta registrada"
            icono={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Turnos */}
        <Aparecer className="lg:col-span-2">
          <Panel className="h-full">
            <Panel.Cabecera titulo="Ingresos por turno" descripcion="Dónde se concentra el día" />
            <Panel.Cuerpo>
              {cargando ? (
                <div className="space-y-4">
                  <div className="esqueleto h-10" />
                  <div className="esqueleto h-10" />
                </div>
              ) : totalIngresos === 0 ? (
                <p className="py-6 text-center text-sm text-ink-500">
                  Aún no hay ingresos registrados hoy.
                </p>
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

        {/* Ranking de barberos */}
        <Aparecer retardo={80} className="lg:col-span-3">
          <Panel className="h-full overflow-hidden">
            <Panel.Cabecera
              titulo="Desempeño por barbero"
              descripcion="Ordenado por ingresos generados"
              accion={
                <Link to="/liquidacion" className="btn-sutil text-xs">
                  Liquidar
                </Link>
              }
            />

            {cargando ? (
              <EsqueletoTabla filas={4} columnas={4} />
            ) : porBarbero.length === 0 ? (
              <EstadoVacio
                icono={
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
                titulo="Sin ventas registradas hoy"
                mensaje="En cuanto se cobre la primera cita aparecerá aquí el desempeño del equipo."
                accion={
                  <Link to="/agenda" className="btn-marca">
                    Ir a la agenda
                  </Link>
                }
              />
            ) : (
              <Tabla minAncho="520px">
                <Tabla.Cabecera>
                  <tr>
                    <th>Barbero</th>
                    <th className="text-right">Servicios</th>
                    <th className="text-right">Ingresos</th>
                    <th className="text-right">Comisión</th>
                  </tr>
                </Tabla.Cabecera>
                <Tabla.Cuerpo>
                  {porBarbero.map((b, i) => (
                    <tr key={b.nombre}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-full
                                       bg-ink-800 text-[11px] font-bold text-ink-300"
                          >
                            {iniciales(b.nombre)}
                          </span>
                          <span className="truncate font-medium text-white">{b.nombre}</span>
                          {i === 0 && (
                            <Badge tono="marca" className="hidden sm:inline-flex">
                              Top
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="cifras text-right">{b.servicios}</td>
                      <td className="cifras text-right">{fmtMoneda(b.ingresos)}</td>
                      <td className="cifras text-right font-semibold text-marca-400">
                        {fmtMoneda(b.comision)}
                      </td>
                    </tr>
                  ))}
                </Tabla.Cuerpo>
              </Tabla>
            )}
          </Panel>
        </Aparecer>
      </div>

      <AccesosRapidos />
    </div>
  )
}

// Atajos a lo que un administrador hace varias veces al día.
function AccesosRapidos() {
  const accesos = [
    { to: '/agenda', label: 'Agenda', desc: 'Citas y cobros', d: 'M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' },
    { to: '/caja', label: 'Caja', desc: 'Apertura y arqueo', d: 'M3 7h18v10H3zM3 11h18M7 15h2' },
    { to: '/gastos', label: 'Gastos', desc: 'Registrar salidas', d: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
    { to: '/inventario', label: 'Inventario', desc: 'Stock y productos', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  ]

  return (
    <Aparecer retardo={140}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {accesos.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="panel-interactivo group flex items-center gap-3 p-4"
          >
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-800/80
                         text-ink-400 transition-all duration-media ease-rebote
                         group-hover:scale-110 group-hover:bg-marca-600/15 group-hover:text-marca-400"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={a.d} />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">{a.label}</span>
              <span className="block truncate text-xs text-ink-500">{a.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </Aparecer>
  )
}
