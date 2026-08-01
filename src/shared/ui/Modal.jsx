import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

// ----------------------------------------------------------------------------
//  Modal — diálogo accesible con movimiento adaptado al dispositivo.
//  · Escritorio: aparece con una escala mínima (0.96 → 1). No "salta".
//  · Móvil: entra como hoja inferior, que es donde el pulgar puede cerrarla.
//  Gestiona foco (trampa + restauración), Escape, y bloqueo de scroll.
// ----------------------------------------------------------------------------

const ANCHOS = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

const FOCUSABLES =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({
  abierto = true,
  onClose,
  titulo,
  descripcion,
  ancho = 'md',
  pie = null,
  cerrarAlClicarFuera = true,
  children,
}) {
  const panelRef = useRef(null)
  const focoPrevioRef = useRef(null)

  const cerrar = useCallback(() => onClose?.(), [onClose])

  // Bloquea el scroll del documento mientras el diálogo está abierto,
  // compensando el ancho de la barra para que el fondo no dé un salto.
  useEffect(() => {
    if (!abierto) return
    const { body } = document
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    const overflowPrevio = body.style.overflow
    const paddingPrevio = body.style.paddingRight
    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
    return () => {
      body.style.overflow = overflowPrevio
      body.style.paddingRight = paddingPrevio
    }
  }, [abierto])

  // Foco: lo lleva al diálogo al abrir y lo devuelve al cerrar.
  useEffect(() => {
    if (!abierto) return
    focoPrevioRef.current = document.activeElement
    const primero = panelRef.current?.querySelector(FOCUSABLES)
    ;(primero || panelRef.current)?.focus({ preventScroll: true })
    return () => focoPrevioRef.current?.focus?.({ preventScroll: true })
  }, [abierto])

  // Escape para cerrar + trampa de foco con Tab.
  useEffect(() => {
    if (!abierto) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        cerrar()
        return
      }
      if (e.key !== 'Tab') return
      const focusables = [...(panelRef.current?.querySelectorAll(FOCUSABLES) || [])].filter(
        (el) => el.offsetParent !== null,
      )
      if (!focusables.length) return
      const primero = focusables[0]
      const ultimo = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [abierto, cerrar])

  if (!abierto) return null

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-end justify-center sm:items-center sm:p-4">
      {/* Telón */}
      <div
        className="absolute inset-0 animate-fundido bg-black/70 backdrop-blur-sm"
        onClick={cerrarAlClicarFuera ? cerrar : undefined}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof titulo === 'string' ? titulo : undefined}
        tabIndex={-1}
        className={`panel relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden
                    rounded-b-none rounded-t-2xl border-ink-800 bg-ink-900 shadow-elevado
                    animate-subir-hoja
                    sm:rounded-2xl sm:animate-escalar ${ANCHOS[ancho] || ANCHOS.md}`}
      >
        {/* Acento del bastón: firma de marca en cada diálogo */}
        <div className="h-1 shrink-0 barber-accent" aria-hidden="true" />

        {/* Asa visual de la hoja en móvil */}
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-ink-700 sm:hidden" aria-hidden="true" />

        {(titulo || descripcion) && (
          <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-4">
            <div className="min-w-0">
              {titulo && <h2 className="text-lg font-semibold text-white">{titulo}</h2>}
              {descripcion && <p className="mt-1 text-sm text-ink-400">{descripcion}</p>}
            </div>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar"
              className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg
                         text-ink-400 transition-colors duration-rapida
                         hover:bg-ink-800 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </header>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>

        {pie && (
          <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-ink-800/80 bg-ink-900/80 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {pie}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
