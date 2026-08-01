import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// ----------------------------------------------------------------------------
//  Avisos (toasts) — confirmación de que una acción ocurrió.
//  Sin esto el usuario guarda algo y no sabe si pasó; con esto cada operación
//  tiene un cierre visible. Se apilan, se auto-descartan y son descartables.
// ----------------------------------------------------------------------------

const ToastContext = createContext(null)

const ESTILOS = {
  exito: {
    barra: 'bg-exito',
    icono: (
      <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    ),
    color: 'text-exito',
  },
  error: {
    barra: 'bg-peligro',
    icono: <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />,
    color: 'text-peligro',
  },
  aviso: {
    barra: 'bg-aviso',
    icono: <path d="M12 8v5m0 4h.01" strokeLinecap="round" />,
    color: 'text-aviso',
  },
  info: {
    barra: 'bg-info',
    icono: <path d="M12 16v-5m0-4h.01" strokeLinecap="round" />,
    color: 'text-info',
  },
}

export function ToastProvider({ children }) {
  const [avisos, setAvisos] = useState([])
  const idRef = useRef(0)

  const descartar = useCallback((id) => {
    setAvisos((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const mostrar = useCallback(
    (mensaje, { tipo = 'info', duracion = 4000, detalle } = {}) => {
      const id = ++idRef.current
      setAvisos((prev) => [...prev.slice(-3), { id, mensaje, tipo, detalle }])
      if (duracion > 0) setTimeout(() => descartar(id), duracion)
      return id
    },
    [descartar],
  )

  // Atajos por intención: `toast.exito('Guardado')`.
  const api = useMemo(
    () => ({
      mostrar,
      exito: (m, o) => mostrar(m, { ...o, tipo: 'exito' }),
      error: (m, o) => mostrar(m, { ...o, tipo: 'error', duracion: 6000 }),
      aviso: (m, o) => mostrar(m, { ...o, tipo: 'aviso' }),
      info: (m, o) => mostrar(m, { ...o, tipo: 'info' }),
    }),
    [mostrar],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col items-center gap-2
                     p-4 pb-[max(1rem,env(safe-area-inset-bottom))]
                     sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end sm:justify-start"
          role="region"
          aria-label="Notificaciones"
        >
          {avisos.map((a) => {
            const estilo = ESTILOS[a.tipo] || ESTILOS.info
            return (
              <div
                key={a.id}
                role="status"
                aria-live="polite"
                className="panel pointer-events-auto flex w-full max-w-sm items-start gap-3 overflow-hidden
                           bg-ink-900/95 p-3.5 pl-4 shadow-elevado animate-aparecer"
              >
                <span className={`absolute inset-y-0 left-0 w-1 ${estilo.barra}`} aria-hidden="true" />
                <svg
                  viewBox="0 0 24 24"
                  className={`mt-0.5 h-4 w-4 shrink-0 ${estilo.color}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  {estilo.icono}
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-50">{a.mensaje}</p>
                  {a.detalle && <p className="mt-0.5 text-xs text-ink-400">{a.detalle}</p>}
                </div>
                <button
                  onClick={() => descartar(a.id)}
                  aria-label="Descartar aviso"
                  className="-mr-1 -mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-md
                             text-ink-500 transition-colors duration-rapida hover:bg-ink-800 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
