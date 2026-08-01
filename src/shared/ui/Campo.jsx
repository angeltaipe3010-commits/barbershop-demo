import { forwardRef, useId } from 'react'

// ----------------------------------------------------------------------------
//  Campos de formulario.
//  `Campo` envuelve etiqueta + control + ayuda/error y enlaza los `id`/aria
//  automáticamente: ningún formulario de la app tiene que acordarse de hacerlo.
// ----------------------------------------------------------------------------

export function Campo({ etiqueta, ayuda, error, requerido, className = '', children }) {
  const id = useId()
  const idAyuda = ayuda || error ? `${id}-ayuda` : undefined

  return (
    <div className={className}>
      {etiqueta && (
        <label htmlFor={id} className="etiqueta-campo">
          {etiqueta}
          {requerido && <span className="ml-0.5 text-marca-500">*</span>}
        </label>
      )}
      {children({ id, 'aria-describedby': idAyuda, 'aria-invalid': !!error || undefined })}
      {(error || ayuda) && (
        <p
          id={idAyuda}
          className={`mt-1.5 text-xs ${error ? 'text-peligro' : 'text-ink-500'}`}
        >
          {error || ayuda}
        </p>
      )}
    </div>
  )
}

export const Input = forwardRef(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`input-base ${className}`} {...props} />
})

export const TextArea = forwardRef(function TextArea({ className = '', rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={`input-base resize-y ${className}`} {...props} />
})

export const Select = forwardRef(function Select({ className = '', children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={`input-base cursor-pointer appearance-none pr-9 ${className}`}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
})

// Campo de búsqueda con icono y botón de limpiar.
export function Buscador({ valor, onChange, placeholder = 'Buscar…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input-base pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {valor && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center
                     rounded-md text-ink-500 transition-colors duration-rapida
                     hover:bg-ink-800 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
