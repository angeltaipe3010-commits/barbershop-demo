import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useCitas } from './useCitas'
import CitaModal from './CitaModal'
import CobroModal from '@/features/ventas/CobroModal'
import {
  EncabezadoVista,
  Panel,
  Badge,
  Boton,
  Segmentado,
  EstadoVacio,
  EstadoError,
  useToast,
  useConfirm,
} from '@/shared/ui'
import { fmtHora, fmtFecha, fmtMoneda, hoyISO, sumarDias, ESTADOS_CITA } from '@/shared/lib/format'

// Avance de estado previo al cobro (el paso a "completada" ocurre al cobrar).
const FLUJO = ['pendiente', 'confirmada', 'en_proceso']

export default function Agenda() {
  const { usuario, esAdmin } = useAuth()
  const toast = useToast()
  const confirmar = useConfirm()

  const [fecha, setFecha] = useState(hoyISO())
  const [nuevaCita, setNuevaCita] = useState(false)
  const [editarCita, setEditarCita] = useState(null)
  const [cobrando, setCobrando] = useState(null)

  // El admin ve todas las citas del día; el barbero solo las suyas (RLS + filtro).
  const { citas, cargando, error, cambiarEstado, recargar } = useCitas({
    fecha,
    barberoId: esAdmin ? null : usuario?.id,
  })

  const hoy = hoyISO()
  const manana = sumarDias(hoy, 1)
  const ayer = sumarDias(hoy, -1)

  const modo = fecha === hoy ? 'hoy' : fecha === manana ? 'manana' : fecha === ayer ? 'ayer' : 'otro'
  const etiquetaDia =
    modo === 'hoy' ? 'Hoy' : modo === 'manana' ? 'Mañana' : modo === 'ayer' ? 'Ayer' : fmtFecha(fecha)

  const activas = citas.filter((c) => !['completada', 'cancelada'].includes(c.estado))

  const avanzar = async (cita, siguiente) => {
    const { error } = await cambiarEstado(cita.id, siguiente)
    if (error) toast.error('No se pudo actualizar la cita', { detalle: error.message })
    else toast.info(`${cita.cliente?.nombre || 'Cita'} → ${ESTADOS_CITA[siguiente].label}`)
  }

  const cancelar = async (cita) => {
    const ok = await confirmar({
      titulo: 'Cancelar cita',
      mensaje: `¿Cancelar la cita de ${cita.cliente?.nombre || 'este cliente'} a las ${fmtHora(cita.fecha_hora)}?`,
      accionLabel: 'Cancelar cita',
      cancelarLabel: 'Volver',
      peligro: true,
    })
    if (!ok) return
    const { error } = await cambiarEstado(cita.id, 'cancelada')
    if (error) toast.error('No se pudo cancelar', { detalle: error.message })
    else toast.aviso('Cita cancelada')
  }

  return (
    <div className="space-y-6">
      <EncabezadoVista
        titulo="Agenda"
        descripcion={`${esAdmin ? 'Citas de toda la barbería' : 'Tus citas'} · ${etiquetaDia}`}
        acciones={
          <>
            <Segmentado
              ariaLabel="Día a mostrar"
              valor={modo === 'otro' ? '' : modo}
              onChange={(v) => setFecha(v === 'hoy' ? hoy : v === 'manana' ? manana : ayer)}
              opciones={[
                { valor: 'ayer', etiqueta: 'Ayer' },
                { valor: 'hoy', etiqueta: 'Hoy' },
                { valor: 'manana', etiqueta: 'Mañana' },
              ]}
            />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="input-base w-auto"
              aria-label="Ver otra fecha"
            />
            <Boton
              variante="marca"
              onClick={() => setNuevaCita(true)}
              iconoIzq={
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              }
            >
              Nueva cita
            </Boton>
          </>
        }
      />

      {/* Resumen del día */}
      {!cargando && citas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-400">
          <Badge tono="neutro">{citas.length} en total</Badge>
          <Badge tono={activas.length ? 'marca' : 'neutro'}>{activas.length} por atender</Badge>
          <Badge tono="exito">
            {citas.filter((c) => c.estado === 'completada').length} completadas
          </Badge>
        </div>
      )}

      {error ? (
        <Panel>
          <EstadoError mensaje={error} onReintentar={recargar} />
        </Panel>
      ) : cargando ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="esqueleto h-44 rounded-xl2" />
          ))}
        </div>
      ) : citas.length === 0 ? (
        <Panel>
          <EstadoVacio
            icono={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            titulo={`Sin citas para ${etiquetaDia.toLowerCase()}`}
            mensaje="Agenda la primera cita del día o revisa otra fecha en el calendario."
            accion={
              <Boton variante="marca" onClick={() => setNuevaCita(true)}>
                Agendar una cita
              </Boton>
            }
          />
        </Panel>
      ) : (
        <div className="escalonar grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {citas.map((c) => (
            <TarjetaCita
              key={c.id}
              cita={c}
              esAdmin={esAdmin}
              onAvanzar={avanzar}
              onCobrar={() => setCobrando(c)}
              onEditar={() => setEditarCita(c)}
              onCancelar={() => cancelar(c)}
            />
          ))}
        </div>
      )}

      {(nuevaCita || editarCita) && (
        <CitaModal
          esAdmin={esAdmin}
          usuario={usuario}
          cita={editarCita}
          fechaInicial={fecha}
          onClose={() => {
            setNuevaCita(false)
            setEditarCita(null)
          }}
          onDone={() => {
            toast.exito(editarCita ? 'Cita actualizada' : 'Cita agendada')
            setNuevaCita(false)
            setEditarCita(null)
            recargar()
          }}
        />
      )}

      {cobrando && (
        <CobroModal
          cita={cobrando}
          onClose={() => setCobrando(null)}
          onDone={(total) => {
            setCobrando(null)
            recargar()
            toast.exito('Cobro registrado', {
              detalle: total ? `Total ${fmtMoneda(total)}` : undefined,
            })
          }}
        />
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
//  Tarjeta de cita. El estado se lee por el badge y por la línea de color
//  lateral, para no depender solo del color del texto.
// ----------------------------------------------------------------------------
const COLOR_ESTADO = {
  pendiente: 'bg-ink-600',
  confirmada: 'bg-info',
  en_proceso: 'bg-aviso',
  completada: 'bg-exito',
  cancelada: 'bg-peligro',
}

function TarjetaCita({ cita, esAdmin, onAvanzar, onCobrar, onEditar, onCancelar }) {
  const est = ESTADOS_CITA[cita.estado]
  const idx = FLUJO.indexOf(cita.estado)
  const siguiente = idx >= 0 && idx < FLUJO.length - 1 ? FLUJO[idx + 1] : null
  const finalizada = ['completada', 'cancelada'].includes(cita.estado)

  return (
    <article
      className={`panel flex flex-col overflow-hidden p-5 transition-all duration-media ease-salida
                  hover:-translate-y-0.5 hover:border-ink-700 hover:shadow-elevado
                  ${finalizada ? 'opacity-65' : ''}`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1 ${COLOR_ESTADO[cita.estado]}`}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">
            {cita.cliente?.nombre || 'Sin cliente'}
          </p>
          <p className="truncate text-sm text-ink-400">{cita.servicio?.nombre}</p>
        </div>
        <Badge tono={est.tono}>{est.label}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-sm text-ink-400">
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" strokeLinecap="round" />
          </svg>
          <span className="cifras">{fmtHora(cita.fecha_hora)}</span>
        </span>

        <span className="cifras font-medium text-ink-300">
          {fmtMoneda(cita.servicio?.precio || 0)}
        </span>

        {esAdmin && cita.barbero?.nombre && (
          <span className="ml-auto truncate text-ink-500">{cita.barbero.nombre}</span>
        )}
      </div>

      {cita.notas && (
        <p className="mt-3 rounded-lg border border-ink-800 bg-ink-950/50 px-3 py-2 pl-3 text-xs text-ink-400">
          {cita.notas}
        </p>
      )}

      {!finalizada && (
        <div className="mt-4 flex flex-wrap gap-2 pl-1">
          <Boton variante="marca" tamano="sm" onClick={onCobrar} className="flex-1">
            Cobrar
          </Boton>
          {siguiente && (
            <Boton variante="ghost" tamano="sm" onClick={() => onAvanzar(cita, siguiente)}>
              → {ESTADOS_CITA[siguiente].label}
            </Boton>
          )}
          <Boton variante="sutil" tamano="sm" onClick={onEditar} title="Editar o reprogramar">
            Editar
          </Boton>
          <Boton variante="sutil" tamano="sm" onClick={onCancelar}>
            Cancelar
          </Boton>
        </div>
      )}
    </article>
  )
}
