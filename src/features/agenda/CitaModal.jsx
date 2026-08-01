import { useEffect, useState } from 'react'
import { clientesApi, serviciosApi, staffApi, citasApi } from '@/services/api'
import { useAuth } from '@/features/auth/AuthContext'
import { hoyISO, fmtMoneda } from '@/shared/lib/format'
import { Modal, Boton, Campo, Input, Select, TextArea } from '@/shared/ui'

const pad = (n) => String(n).padStart(2, '0')
const NOMBRE_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/**
 * Alta y edición de citas. El admin elige el barbero; un barbero solo puede
 * agendarse a sí mismo. Antes de guardar comprueba solapes de horario.
 */
export default function CitaModal({
  esAdmin,
  usuario,
  cita = null,
  fechaInicial = null,
  onClose,
  onDone,
}) {
  const { horaCorte, perfil } = useAuth()
  const editando = !!cita

  const [clientes, setClientes] = useState([])
  const [servicios, setServicios] = useState([])
  const [barberos, setBarberos] = useState([])
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState(() => {
    if (cita) {
      const d = new Date(cita.fecha_hora)
      return {
        cliente_id: cita.cliente_id || '',
        barbero_id: cita.barbero_id,
        servicio_id: cita.servicio_id || '',
        fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        notas: cita.notas || '',
      }
    }
    return {
      cliente_id: '',
      barbero_id: esAdmin ? '' : usuario?.id || '',
      servicio_id: '',
      fecha: fechaInicial || hoyISO(),
      hora: '10:00',
      notas: '',
    }
  })

  useEffect(() => {
    clientesApi.listar().then(({ data }) => setClientes(data || []))
    serviciosApi.activos().then(({ data }) => setServicios(data || []))
    if (esAdmin) staffApi.activos().then(({ data }) => setBarberos(data || []))
  }, [esAdmin])

  const actualizar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const servicioSel = servicios.find((s) => s.id === form.servicio_id)
  const barberoSel = esAdmin ? barberos.find((b) => b.id === form.barbero_id) : perfil

  // Aviso NO bloqueante: se puede agendar fuera de horario como excepción,
  // pero conviene que quien agenda lo sepa antes de confirmar.
  const avisoDisponibilidad = (() => {
    if (!barberoSel || !form.fecha || !form.hora) return null
    const dias = Array.isArray(barberoSel.dias_laborables) ? barberoSel.dias_laborables : null
    const dow = new Date(form.fecha + 'T00:00:00').getDay()
    const nombre = barberoSel.nombre || 'El barbero'

    if (dias && !dias.includes(dow)) return `${nombre} no trabaja los ${NOMBRE_DIA[dow]}.`

    const ini = (barberoSel.hora_inicio || '').slice(0, 5)
    const fin = (barberoSel.hora_fin || '').slice(0, 5)
    if (ini && fin && (form.hora < ini || form.hora >= fin))
      return `${nombre} atiende de ${ini} a ${fin}.`

    return null
  })()

  const guardar = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.servicio_id) return setError('Selecciona un servicio.')
    if (!form.barbero_id) return setError('Selecciona un barbero.')

    setGuardando(true)

    // Lima = UTC-5: se envía la hora local con offset explícito para que la
    // fecha del reporte diario coincida con la de la cita.
    const fechaHora = `${form.fecha}T${form.hora}:00-05:00`
    const duracion = servicioSel?.duracion_min || 30
    const turno = Number(form.hora.slice(0, 2)) < horaCorte ? 'manana' : 'tarde_noche'

    const conflicto = await citasApi.hayConflicto(form.barbero_id, fechaHora, duracion, cita?.id)
    if (conflicto) {
      setGuardando(false)
      return setError('Ese barbero ya tiene una cita que se cruza con ese horario.')
    }

    const payload = {
      cliente_id: form.cliente_id || null,
      barbero_id: form.barbero_id,
      servicio_id: form.servicio_id,
      fecha_hora: fechaHora,
      turno,
      notas: form.notas.trim() || null,
    }

    const { error } = editando
      ? await citasApi.actualizar(cita.id, payload)
      : await citasApi.crear({ ...payload, estado: 'pendiente' })

    setGuardando(false)
    if (error) return setError(error.message)
    onDone?.()
  }

  return (
    <Modal
      abierto
      onClose={onClose}
      ancho="md"
      titulo={editando ? 'Editar cita' : 'Nueva cita'}
      descripcion={editando ? 'Reprograma o corrige los datos de la cita.' : undefined}
      pie={
        <>
          <Boton variante="sutil" onClick={onClose}>
            Cancelar
          </Boton>
          <Boton variante="marca" type="submit" form="form-cita" cargando={guardando}>
            {editando ? 'Guardar cambios' : 'Agendar cita'}
          </Boton>
        </>
      }
    >
      <form id="form-cita" onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Cliente" className="sm:col-span-2" ayuda="Opcional: para clientes de paso.">
          {(a11y) => (
            <Select {...a11y} value={form.cliente_id} onChange={actualizar('cliente_id')}>
              <option value="">— Sin registrar —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          )}
        </Campo>

        {esAdmin && (
          <Campo etiqueta="Barbero" requerido className="sm:col-span-2">
            {(a11y) => (
              <Select {...a11y} required value={form.barbero_id} onChange={actualizar('barbero_id')}>
                <option value="">Selecciona…</option>
                {barberos.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Campo>
        )}

        <Campo
          etiqueta="Servicio"
          requerido
          className="sm:col-span-2"
          ayuda={
            servicioSel
              ? `${servicioSel.duracion_min} min · ${fmtMoneda(servicioSel.precio)}`
              : undefined
          }
        >
          {(a11y) => (
            <Select {...a11y} required value={form.servicio_id} onChange={actualizar('servicio_id')}>
              <option value="">Selecciona…</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} · {s.duracion_min} min
                </option>
              ))}
            </Select>
          )}
        </Campo>

        <Campo etiqueta="Fecha" requerido>
          {(a11y) => (
            <Input {...a11y} required type="date" value={form.fecha} onChange={actualizar('fecha')} />
          )}
        </Campo>

        <Campo etiqueta="Hora" requerido>
          {(a11y) => (
            <Input {...a11y} required type="time" value={form.hora} onChange={actualizar('hora')} />
          )}
        </Campo>

        <Campo etiqueta="Notas" className="sm:col-span-2">
          {(a11y) => (
            <TextArea
              {...a11y}
              rows={2}
              value={form.notas}
              onChange={actualizar('notas')}
              placeholder="Preferencias, recordatorios…"
            />
          )}
        </Campo>

        {avisoDisponibilidad && (
          <div
            className="animate-aparecer-bajar rounded-lg border border-aviso/40 bg-aviso/10
                       px-3 py-2.5 text-sm text-aviso sm:col-span-2"
          >
            {avisoDisponibilidad} Puedes agendar igual si es una excepción.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="animate-aparecer-bajar rounded-lg border border-peligro/40 bg-peligro/10
                       px-3 py-2.5 text-sm text-peligro sm:col-span-2"
          >
            {error}
          </div>
        )}
      </form>
    </Modal>
  )
}
