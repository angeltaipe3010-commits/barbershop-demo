import { useEffect, useState } from 'react'

// Indica si el sistema pide reducir el movimiento. Las animaciones decorativas
// (contadores, barras que crecen) se saltan cuando devuelve true.
export function useMovimientoReducido() {
  const [reducido, setReducido] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e) => setReducido(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reducido
}
