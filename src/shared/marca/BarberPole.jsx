// ----------------------------------------------------------------------------
//  Acento del bastón de barbero (rojo / blanco / azul).
//  Decorativo: refuerza la identidad, no transmite información. Por eso va
//  siempre con aria-hidden.
// ----------------------------------------------------------------------------

export function BarberDivider({ className = '', animado = false }) {
  return (
    <div
      className={`barber-divider ${animado ? 'animate-baston-girar' : ''} ${className}`}
      aria-hidden="true"
    />
  )
}

// Franja vertical para el borde lateral de tarjetas destacadas.
export function BarberSpine({ className = '' }) {
  return (
    <div className={`w-1.5 self-stretch rounded-full barber-accent ${className}`} aria-hidden="true" />
  )
}

// Bastón que gira de verdad: se reserva para momentos de espera reales
// (arranque de la app), donde el giro comunica "trabajando".
export function BarberPoleGirando({ className = '' }) {
  return (
    <div
      className={`h-1.5 w-32 overflow-hidden rounded-full barber-accent animate-baston-girar ${className}`}
      aria-hidden="true"
    />
  )
}

export default BarberDivider
