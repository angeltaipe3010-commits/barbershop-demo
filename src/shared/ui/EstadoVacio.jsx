// ----------------------------------------------------------------------------
//  Estado vacío — nunca dejar una pantalla en blanco.
//  Siempre dice QUÉ falta y, cuando se puede, ofrece la acción para resolverlo.
// ----------------------------------------------------------------------------
export default function EstadoVacio({ icono, titulo, mensaje, accion, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-6 py-16 text-center animate-aparecer ${className}`}
    >
      {icono && (
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-ink-800 bg-ink-900/80 text-ink-500">
          {icono}
        </div>
      )}
      <div>
        <p className="font-semibold text-ink-200">{titulo}</p>
        {mensaje && <p className="mt-1 max-w-sm text-sm text-ink-500">{mensaje}</p>}
      </div>
      {accion && <div className="mt-1">{accion}</div>}
    </div>
  )
}

// Variante para errores de carga, con reintento.
export function EstadoError({ mensaje, onReintentar }) {
  return (
    <EstadoVacio
      icono={
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
      titulo="No se pudieron cargar los datos"
      mensaje={mensaje}
      accion={
        onReintentar && (
          <button onClick={onReintentar} className="btn-ghost">
            Reintentar
          </button>
        )
      }
    />
  )
}
