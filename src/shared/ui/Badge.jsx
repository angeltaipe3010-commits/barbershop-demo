// ----------------------------------------------------------------------------
//  Badge — estado en una palabra. El tono comunica el significado, así que
//  cada tono se declara una sola vez aquí y las vistas solo eligen intención.
// ----------------------------------------------------------------------------
const TONOS = {
  neutro: 'bg-ink-800 text-ink-200 ring-ink-700',
  marca: 'bg-marca-600/15 text-marca-400 ring-marca-600/30',
  exito: 'bg-exito/15 text-exito ring-exito/30',
  aviso: 'bg-aviso/15 text-aviso ring-aviso/30',
  peligro: 'bg-peligro/15 text-peligro ring-peligro/30',
  info: 'bg-info/15 text-info ring-info/30',
}

export default function Badge({ tono = 'neutro', punto = false, className = '', children }) {
  return (
    <span className={`badge ${TONOS[tono] || TONOS.neutro} ${className}`}>
      {punto && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
}

// Punto "en vivo": late y emite una onda. Se usa para caja abierta / conexión.
export function PuntoVivo({ tono = 'exito', className = '' }) {
  const color = { exito: 'bg-exito', aviso: 'bg-aviso', marca: 'bg-marca-500', info: 'bg-info' }[tono]
  return (
    <span className={`relative flex h-2 w-2 ${className}`} aria-hidden="true">
      <span className={`absolute inline-flex h-full w-full rounded-full ${color} animate-onda`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color} animate-latido`} />
    </span>
  )
}
