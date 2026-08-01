import { useState } from 'react'
import { clientesApi } from '@/services/api'
import { Modal, Boton, Campo, Input, TextArea } from '@/shared/ui'

const VACIO = { nombre: '', telefono: '', email: '', preferencias: '', notas: '' }

// Alta y edición de la ficha de un cliente.
export default function ClienteFormModal({ cliente, onClose, onDone }) {
  const editando = !!cliente
  const [form, setForm] = useState(() =>
    cliente
      ? {
          nombre: cliente.nombre || '',
          telefono: cliente.telefono || '',
          email: cliente.email || '',
          preferencias: cliente.preferencias || '',
          notas: cliente.notas || '',
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

    // Los campos vacíos se guardan como null, no como cadena vacía: así las
    // consultas y los "—" de la tabla funcionan igual para todos los registros.
    const payload = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      preferencias: form.preferencias.trim() || null,
      notas: form.notas.trim() || null,
    }

    const { error } = editando
      ? await clientesApi.actualizar(cliente.id, payload)
      : await clientesApi.crear(payload)

    setGuardando(false)
    if (error) return setError(error.message)
    onDone?.(payload.nombre, !editando)
  }

  return (
    <Modal
      abierto
      onClose={onClose}
      ancho="md"
      titulo={editando ? 'Editar cliente' : 'Nuevo cliente'}
      pie={
        <>
          <Boton variante="sutil" onClick={onClose}>
            Cancelar
          </Boton>
          <Boton variante="marca" type="submit" form="form-cliente" cargando={guardando}>
            {editando ? 'Guardar cambios' : 'Registrar cliente'}
          </Boton>
        </>
      }
    >
      <form id="form-cliente" onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre" requerido className="sm:col-span-2">
          {(a11y) => (
            <Input
              {...a11y}
              required
              autoFocus
              value={form.nombre}
              onChange={actualizar('nombre')}
              placeholder="Nombre y apellido"
            />
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

        <Campo etiqueta="Correo">
          {(a11y) => (
            <Input
              {...a11y}
              type="email"
              value={form.email}
              onChange={actualizar('email')}
              placeholder="opcional"
            />
          )}
        </Campo>

        <Campo
          etiqueta="Preferencias"
          className="sm:col-span-2"
          ayuda="Lo que el barbero debería recordar antes de atenderlo."
        >
          {(a11y) => (
            <Input
              {...a11y}
              value={form.preferencias}
              onChange={actualizar('preferencias')}
              placeholder="Corte habitual, productos, alergias…"
            />
          )}
        </Campo>

        <Campo etiqueta="Notas" className="sm:col-span-2">
          {(a11y) => (
            <TextArea {...a11y} rows={2} value={form.notas} onChange={actualizar('notas')} />
          )}
        </Campo>

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
