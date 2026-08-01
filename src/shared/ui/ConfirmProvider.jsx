import { createContext, useCallback, useContext, useState } from 'react'
import Modal from './Modal'
import Boton from './Boton'

const ConfirmContext = createContext(null)

/**
 * confirm() basado en promesa, con el modal de la app (reemplaza al nativo).
 *
 *   const confirmar = useConfirm()
 *   if (await confirmar({ titulo, mensaje, accionLabel, peligro })) { … }
 *
 * Se apoya en <Modal>, así que hereda foco, Escape y bloqueo de scroll.
 */
export function ConfirmProvider({ children }) {
  const [estado, setEstado] = useState(null)

  const confirmar = useCallback(
    (opts) => new Promise((resolve) => setEstado({ ...opts, resolve })),
    [],
  )

  const cerrar = (valor) => {
    estado?.resolve(valor)
    setEstado(null)
  }

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      {estado && (
        <Modal
          abierto
          onClose={() => cerrar(false)}
          ancho="sm"
          titulo={estado.titulo}
          pie={
            <>
              <Boton variante="sutil" onClick={() => cerrar(false)}>
                {estado.cancelarLabel || 'Cancelar'}
              </Boton>
              <Boton
                variante={estado.peligro ? 'peligro' : 'marca'}
                onClick={() => cerrar(true)}
                autoFocus
              >
                {estado.accionLabel || 'Confirmar'}
              </Boton>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-ink-300">{estado.mensaje}</p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>')
  return ctx
}
