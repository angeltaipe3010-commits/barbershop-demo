import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useCitas } from '@/features/agenda/useCitas'
import { useComisiones } from '@/features/comisiones/useMisComisiones'
import CobroModal from '@/features/ventas/CobroModal'
import {
  EncabezadoVista,
  StatCard,
  Panel,
  Badge,
  Boton,
  Aparecer,
  EstadoVacio,
  EsqueletoTarjetas,
  useToast,
} from '@/shared/ui'
import { fmtMoneda, fmtHora, ESTADOS_CITA } from '@/shared/lib/format'

// ----------------------------------------------------------------------------
//  Panel del barbero: lo que gana hoy y a quién atiende ahora.
//  La siguiente cita se destaca porque es la única decisión inmediata.
// ----------------------------------------------------------------------------
export default function DashboardBarbero() {
  const { usuario, perfil } = useAuth()
  const toast = useToast()
  const barberoId = usuario?.id

  const { citas, cargando, recargar } = useCitas({ barberoId })
  const { hoy, semana, cargando: cargandoComisiones, recargar: recargarComisiones } =
    useComisiones(barberoId)
  const [cobrando, setCobrando] = useState(null)

  const activas = citas.filter((c) => !['completada', 'cancelada'].includes(c.estado))
  const siguiente = activas[0]

  const alCobrar = (total) => {
    setCobrando(null)
    recargar()
    recargarComisiones()
    toast.exito('Cobro registrado', { detalle: `Total ${fmtMoneda(total)}` })
  }

  return (
    <div className="space-y-6">
      <EncabezadoVista
        titulo="Mi jornada"
        descripcion="Tu agenda de hoy y tus comisiones acumuladas"
        acciones={
          <Link to="/mis-comisiones" className="btn-ghost">
            Ver mis comisiones
          </Link>
        }
      />

      {cargandoComisiones ? (
        <EsqueletoTarjetas n={3} className="xl:grid-cols-3" />
      ) : (
        <div className="escalonar grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            titulo="Comisión de hoy"
            valor={hoy.comision}
            sub={`${fmtMoneda(hoy.ventas)} vendidos`}
            acento
            icono={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" />
              </svg>
            }
          />
          <StatCard titulo="Últimos 7 días" valor={semana.comision} sub="Comisión acumulada" />
          <StatCard
            titulo="Mi porcentaje"
            valor={`${perfil?.porcentaje_comision ?? '—'}%`}
            formato="crudo"
            sub="Sobre cada servicio"
          />
        </div>
      )}

      {/* Siguiente cita: la acción del momento */}
      {siguiente && !cargando && (
        <Aparecer>
          <Panel className="overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-1 barber-accent" aria-hidden="true" />
            <div className="flex flex-wrap items-center gap-4 p-5 pl-6">
              <div className="grid h-14 w-16 shrink-0 place-items-center rounded-xl border border-marca-600/30 bg-marca-600/10">
                <span className="cifras text-sm font-bold text-marca-400">
                  {fmtHora(siguiente.fecha_hora)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-etiqueta font-semibold uppercase text-ink-500">Siguiente cita</p>
                <p className="truncate text-lg font-semibold text-white">
                  {siguiente.cliente?.nombre || 'Cliente sin registrar'}
                </p>
                <p className="truncate text-sm text-ink-400">
                  {siguiente.servicio?.nombre} · {fmtMoneda(siguiente.servicio?.precio || 0)}
                </p>
              </div>
              <Boton variante="marca" onClick={() => setCobrando(siguiente)}>
                Cobrar
              </Boton>
            </div>
          </Panel>
        </Aparecer>
      )}

      {/* Agenda del día */}
      <Aparecer retardo={80}>
        <Panel className="overflow-hidden">
          <Panel.Cabecera
            titulo="Citas de hoy"
            accion={
              <Badge tono={activas.length ? 'marca' : 'neutro'}>
                {activas.length} {activas.length === 1 ? 'pendiente' : 'pendientes'}
              </Badge>
            }
          />

          {cargando ? (
            <div className="space-y-2 p-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="esqueleto h-16 rounded-lg" />
              ))}
            </div>
          ) : citas.length === 0 ? (
            <EstadoVacio
              icono={
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              titulo="Sin citas para hoy"
              mensaje="Cuando se agende una cita a tu nombre aparecerá aquí."
              accion={
                <Link to="/agenda" className="btn-ghost">
                  Abrir la agenda
                </Link>
              }
            />
          ) : (
            <ul className="escalonar space-y-2 p-5">
              {citas.map((c) => {
                const est = ESTADOS_CITA[c.estado]
                const finalizada = ['completada', 'cancelada'].includes(c.estado)
                return (
                  <li
                    key={c.id}
                    className={`flex flex-wrap items-center gap-3 rounded-lg border border-ink-800
                                bg-ink-950/40 p-3.5 transition-colors duration-rapida
                                hover:border-ink-700 hover:bg-ink-900/60
                                ${finalizada ? 'opacity-60' : ''}`}
                  >
                    <div className="grid h-11 w-14 shrink-0 place-items-center rounded-lg bg-ink-800">
                      <span className="cifras text-sm font-bold text-white">
                        {fmtHora(c.fecha_hora)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">
                        {c.cliente?.nombre || 'Cliente sin registrar'}
                      </p>
                      <p className="truncate text-sm text-ink-400">
                        {c.servicio?.nombre || 'Servicio'} · {fmtMoneda(c.servicio?.precio || 0)}
                      </p>
                    </div>

                    <Badge tono={est.tono}>{est.label}</Badge>

                    {!finalizada && (
                      <Boton variante="marca" tamano="sm" onClick={() => setCobrando(c)}>
                        Cobrar
                      </Boton>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </Aparecer>

      {cobrando && (
        <CobroModal cita={cobrando} onClose={() => setCobrando(null)} onDone={alCobrar} />
      )}
    </div>
  )
}
