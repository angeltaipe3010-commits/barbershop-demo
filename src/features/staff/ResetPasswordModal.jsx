import { useState } from 'react'
import { staffApi } from '@/services/api'
import { Modal, Boton, Campo, Input } from '@/shared/ui'
import { interpretarErrorStaff, AvisoError } from './errores'

// Genera una clave temporal legible: fácil de dictar en voz alta.
function claveSugerida() {
  const palabras = ['corte', 'navaja', 'tijera', 'fade', 'barba', 'peine']
  const palabra = palabras[Math.floor(Math.random() * palabras.length)]
  return `${palabra}${Math.floor(100 + Math.random() * 900)}`
}

export default function ResetPasswordModal({ miembro, onClose, onDone }) {
  const [password, setPassword] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const confirmar = async (e) => {
    e.preventDefault()
    if (password.length < 6) {
      return setError({ titulo: null, mensaje: 'La contraseña debe tener al menos 6 caracteres.' })
    }

    setError(null)
    setGuardando(true)

    const { data, error } = await staffApi.resetPassword(miembro.id, password)

    setGuardando(false)
    const msg = error?.message || data?.error
    if (msg) return setError(interpretarErrorStaff(msg, 'clave'))

    onDone?.(password)
  }

  return (
    <Modal
      abierto
      onClose={onClose}
      ancho="sm"
      titulo="Resetear contraseña"
      descripcion={`Nueva clave de acceso para ${miembro.nombre}`}
      pie={
        <>
          <Boton variante="sutil" onClick={onClose}>
            Cancelar
          </Boton>
          <Boton variante="marca" type="submit" form="form-reset" cargando={guardando}>
            Actualizar clave
          </Boton>
        </>
      }
    >
      <form id="form-reset" onSubmit={confirmar} className="space-y-4">
        <Campo etiqueta="Nueva contraseña" requerido ayuda="Mínimo 6 caracteres.">
          {(a11y) => (
            <Input
              {...a11y}
              type="text"
              minLength={6}
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mín. 6 caracteres"
            />
          )}
        </Campo>

        <Boton
          variante="ghost"
          tamano="sm"
          onClick={() => setPassword(claveSugerida())}
          className="w-full"
        >
          Sugerir una clave
        </Boton>

        <p className="rounded-lg border border-ink-800 bg-ink-950/50 px-3.5 py-2.5 text-xs text-ink-500">
          Anota la clave antes de guardar: no se podrá volver a consultar, solo cambiarla de nuevo.
        </p>

        <AvisoError info={error} />
      </form>
    </Modal>
  )
}
