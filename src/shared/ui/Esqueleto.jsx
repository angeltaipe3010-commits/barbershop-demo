// ----------------------------------------------------------------------------
//  Esqueletos de carga.
//  Reservan el espacio real del contenido para que nada salte al llegar los
//  datos: la percepción de velocidad viene de no ver un layout moverse.
// ----------------------------------------------------------------------------
export default function Esqueleto({ className = '' }) {
  return <div className={`esqueleto ${className}`} aria-hidden="true" />
}

export function EsqueletoTexto({ lineas = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lineas }).map((_, i) => (
        <div
          key={i}
          className="esqueleto h-3.5"
          style={{ width: i === lineas - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  )
}

export function EsqueletoTarjetas({ n = 4, alto = 'h-28', className = '' }) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className={`esqueleto ${alto} rounded-xl2`} aria-hidden="true" />
      ))}
    </div>
  )
}

export function EsqueletoTabla({ filas = 6, columnas = 4 }) {
  return (
    <div className="p-5" aria-hidden="true">
      <div className="space-y-3">
        {Array.from({ length: filas }).map((_, f) => (
          <div key={f} className="flex gap-4">
            {Array.from({ length: columnas }).map((_, c) => (
              <div
                key={c}
                className="esqueleto h-4 flex-1"
                style={{ opacity: 1 - f * 0.1, maxWidth: c === 0 ? '30%' : undefined }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Región accesible: anuncia la carga a lectores de pantalla sin mostrar texto.
export function AnuncioCarga({ mensaje = 'Cargando…' }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {mensaje}
    </span>
  )
}
