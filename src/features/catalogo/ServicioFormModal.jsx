import { useState } from 'react'
import { serviciosApi } from '@/services/api'
import { Modal, Boton, Campo, Input, Select } from '@/shared/ui'

const VACIO = { nombre: '', categoria: 'corte', precio: '', duracion_min: 30, activo: true }

const CATEGORIAS = [
  { valor: 'corte', label: 'Corte' },
  { valor: 'barba', label: 'Barba' },
  { valor: 'tratamiento', label: 'Tratamiento' },
  { valor: 'combo', label: 'Combo' },
]

export default function ServicioFormModal({ servicio, onClose, onDone }) {
  const editando = !!servicio
  const [form, setForm] = useState(() =>
    servicio
      ? {
          nombre: servicio.nombre,
          categoria: servicio.categoria || 'corte',
          precio: servicio.precio,
          duracion_min: servicio.duracion_min,
          activo: servicio.activo,
        }
      : VACIO,
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const actualizar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const guardar = async (e) => {
    e.preventDefault()
    setError(null)
    setGuardando(true)

    const payload = {
      ...form,
      nombre: form.nombre.trim(),
      precio: Number(form.precio),
      duracion_min: Number(form.duracion_min),
    }

    const { error } = editando
      ? await serviciosApi.actualizar(servicio.id, payload)
      : await serviciosApi.crear(payload)

    setGuardando(false)
    if (error) return setError(error.message)
    onDone?.(!editando)
  }

  return (
    <Modal
      abierto
      onClose={onClose}
      ancho="md"
      titulo={editando ? 'Editar servicio' : 'Nuevo servicio'}
      pie={
        <>
          <Boton variante="sutil" onClick={onClose}>
            Cancelar
          </Boton>
          <Boton variante="marca" type="submit" form="form-servicio" cargando={guardando}>
            {editando ? 'Guardar cambios' : 'Crear servicio'}
          </Boton>
        </>
      }
    >
      <form id="form-servicio" onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre" requerido className="sm:col-span-2">
          {(a11y) => (
            <Input
              {...a11y}
              required
              autoFocus
              value={form.nombre}
              onChange={actualizar('nombre')}
              placeholder="ej. Corte + Barba"
            />
          )}
        </Campo>

        <Campo etiqueta="Categoría" className="sm:col-span-2">
          {(a11y) => (
            <Select {...a11y} value={form.categoria} onChange={actualizar('categoria')}>
              {CATEGORIAS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.label}
                </option>
              ))}
            </Select>
          )}
        </Campo>

        <Campo etiqueta="Precio (S/)" requerido>
          {(a11y) => (
            <Input
              {...a11y}
              required
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.precio}
              onChange={actualizar('precio')}
            />
          )}
        </Campo>

        <Campo
          etiqueta="Duración (min)"
          requerido
          ayuda="Se usa para detectar cruces en la agenda."
        >
          {(a11y) => (
            <Input
              {...a11y}
              required
              type="number"
              min="1"
              inputMode="numeric"
              value={form.duracion_min}
              onChange={actualizar('duracion_min')}
            />
          )}
        </Campo>

        <label className="flex cursor-pointer items-center gap-2.5 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
            className="h-4 w-4 rounded border-ink-600 bg-ink-900 accent-marca-600"
          />
          <span className="text-sm text-ink-300">
            Disponible para agendar y cobrar
          </span>
        </label>

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
