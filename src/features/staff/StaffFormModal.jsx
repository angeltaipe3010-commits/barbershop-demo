import { useState } from 'react'
import { staffApi } from '@/services/api'
import { Modal, Boton, Campo, Input, Select } from '@/shared/ui'
import { interpretarErrorStaff, AvisoError } from './errores'

// Días en convención JS getDay() (0=domingo), mostrados de lunes a domingo.
const DIAS = [
  { v: 1, l: 'Lun' },
  { v: 2, l: 'Mar' },
  { v: 3, l: 'Mié' },
  { v: 4, l: 'Jue' },
  { v: 5, l: 'Vie' },
  { v: 6, l: 'Sáb' },
  { v: 0, l: 'Dom' },
]

const VACIO = {
  username: '',
  nombre: '',
  telefono: '',
  rol: 'barbero',
  porcentaje: 40,
  password: '',
  dias_laborables: [1, 2, 3, 4, 5, 6],
  hora_inicio: '09:00',
  hora_fin: '21:00',
}

// Dominio con el que se arma el correo interno a partir del nombre de usuario.
const DOMINIO = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'demo.com'

// El campo pide un usuario, pero es natural teclear un correo. En vez de
// fallar creando "juan@demo.com@demo.com", se queda con la parte de delante.
//
// Se aplica al SALIR del campo, nunca en cada tecla: recortando en la marcha,
// al escribir "juan@demo.com" la @ desaparece y el resto se pega al usuario
// ("juandemo.com").
const limpiarUsuario = (valor) =>
  valor.trim().toLowerCase().split('@')[0].replace(/[^a-z0-9._-]/g, '')


export default function StaffFormModal({ miembro, onClose, onDone }) {
  const editando = !!miembro

  const [form, setForm] = useState(() =>
    miembro
      ? {
          username: miembro.username || '',
          nombre: miembro.nombre || '',
          telefono: miembro.telefono || '',
          rol: miembro.rol,
          porcentaje: miembro.porcentaje_comision,
          password: '',
          dias_laborables: Array.isArray(miembro.dias_laborables)
            ? miembro.dias_laborables
            : [1, 2, 3, 4, 5, 6],
          hora_inicio: (miembro.hora_inicio || '09:00').slice(0, 5),
          hora_fin: (miembro.hora_fin || '21:00').slice(0, 5),
        }
      : VACIO,
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const actualizar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const alternarDia = (v) =>
    setForm((f) => ({
      ...f,
      dias_laborables: f.dias_laborables.includes(v)
        ? f.dias_laborables.filter((x) => x !== v)
        : [...f.dias_laborables, v].sort((a, b) => a - b),
    }))

  const guardar = async (e) => {
    e.preventDefault()
    setError(null)
    setGuardando(true)

    if (editando) {
      // El usuario y la contraseña no se tocan aquí (viven en Auth).
      const { error } = await staffApi.actualizar(miembro.id, {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || null,
        rol: form.rol,
        porcentaje_comision: Number(form.porcentaje),
        dias_laborables: form.dias_laborables,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
      })
      setGuardando(false)
      if (error) return setError(interpretarErrorStaff(error.message))
    } else {
      const { data, error } = await staffApi.crear({
        // Normalizado también aquí: el envío no debe depender de que el campo
        // haya perdido el foco antes de pulsar Crear.
        username: limpiarUsuario(form.username),
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        rol: form.rol,
        porcentaje: Number(form.porcentaje),
        password: form.password,
      })
      setGuardando(false)
      const msg = error?.message || data?.error
      if (msg) return setError(interpretarErrorStaff(msg, 'crear'))
    }

    onDone?.(!editando)
  }

  return (
    <Modal
      abierto
      onClose={onClose}
      ancho="lg"
      titulo={editando ? 'Editar barbero' : 'Añadir barbero'}
      pie={
        <>
          <Boton variante="sutil" onClick={onClose}>
            Cancelar
          </Boton>
          <Boton variante="marca" type="submit" form="form-staff" cargando={guardando}>
            {editando ? 'Guardar cambios' : 'Crear barbero'}
          </Boton>
        </>
      }
    >
      <form id="form-staff" onSubmit={guardar} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {!editando && (
            <Campo
              etiqueta="Usuario"
              requerido
              // Mostrar el correo resultante quita la duda de si hay que
              // escribirlo entero o no.
              ayuda={
                limpiarUsuario(form.username)
                  ? `Entrará escribiendo "${limpiarUsuario(form.username)}" · cuenta: ${limpiarUsuario(form.username)}@${DOMINIO}`
                  : 'Solo el nombre de usuario, sin correo. La app añade el dominio.'
              }
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  required
                  autoFocus
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value.trimStart().toLowerCase() }))
                  }
                  onBlur={(e) =>
                    setForm((f) => ({ ...f, username: limpiarUsuario(e.target.value) }))
                  }
                  placeholder="ej. pedro"
                  autoCapitalize="none"
                  spellCheck="false"
                />
              )}
            </Campo>
          )}

          <Campo etiqueta="Nombre" requerido className={editando ? 'sm:col-span-2' : ''}>
            {(a11y) => (
              <Input {...a11y} required value={form.nombre} onChange={actualizar('nombre')} />
            )}
          </Campo>

          <Campo etiqueta="Celular">
            {(a11y) => (
              <Input
                {...a11y}
                type="tel"
                inputMode="numeric"
                value={form.telefono}
                onChange={actualizar('telefono')}
                placeholder="987 654 321"
              />
            )}
          </Campo>

          <Campo
            etiqueta="Rol"
            ayuda={form.rol === 'admin' ? 'Verá finanzas y toda la administración.' : undefined}
          >
            {(a11y) => (
              <Select {...a11y} value={form.rol} onChange={actualizar('rol')}>
                <option value="barbero">Barbero</option>
                <option value="admin">Administrador</option>
              </Select>
            )}
          </Campo>

          <Campo etiqueta="% de comisión" ayuda="Sobre cada servicio que cobre.">
            {(a11y) => (
              <Input
                {...a11y}
                type="number"
                min="0"
                max="100"
                inputMode="numeric"
                value={form.porcentaje}
                onChange={actualizar('porcentaje')}
              />
            )}
          </Campo>

          {!editando && (
            <Campo etiqueta="Contraseña" requerido ayuda="Mínimo 6 caracteres.">
              {(a11y) => (
                <Input
                  {...a11y}
                  required
                  type="text"
                  minLength={6}
                  value={form.password}
                  onChange={actualizar('password')}
                  placeholder="mín. 6 caracteres"
                />
              )}
            </Campo>
          )}
        </div>

        {/* La disponibilidad solo aplica a perfiles ya creados. */}
        {editando && (
          <section className="rounded-xl2 border border-ink-800 bg-ink-950/40 p-4">
            <p className="mb-3 text-sm font-medium text-ink-200">Disponibilidad</p>

            <label className="etiqueta-campo text-xs">Días que trabaja</label>
            <div className="flex flex-wrap gap-2">
              {DIAS.map((d) => {
                const activo = form.dias_laborables.includes(d.v)
                return (
                  <button
                    type="button"
                    key={d.v}
                    onClick={() => alternarDia(d.v)}
                    aria-pressed={activo}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium
                                transition-all duration-rapida active:scale-95
                                ${
                                  activo
                                    ? 'border-marca-600 bg-marca-600/15 text-marca-400'
                                    : 'border-ink-700 text-ink-400 hover:border-ink-600 hover:bg-ink-800'
                                }`}
                  >
                    {d.l}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Campo etiqueta="Hora inicio">
                {(a11y) => (
                  <Input
                    {...a11y}
                    type="time"
                    value={form.hora_inicio}
                    onChange={actualizar('hora_inicio')}
                  />
                )}
              </Campo>
              <Campo etiqueta="Hora fin">
                {(a11y) => (
                  <Input
                    {...a11y}
                    type="time"
                    value={form.hora_fin}
                    onChange={actualizar('hora_fin')}
                  />
                )}
              </Campo>
            </div>

            <p className="mt-3 text-xs text-ink-500">
              Al agendar fuera de este horario la app avisa, pero no lo impide.
            </p>
          </section>
        )}

        <AvisoError info={error} />
      </form>
    </Modal>
  )
}
