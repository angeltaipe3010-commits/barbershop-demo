import { useEffect, useRef, useState } from 'react'
import { useMovimientoReducido } from './useMovimientoReducido'

// ----------------------------------------------------------------------------
//  Cuenta desde el valor anterior hasta el nuevo con desaceleración.
//  Se usa en los KPI: el número "aterriza" en vez de aparecer de golpe, lo que
//  dirige la mirada a lo que cambió. Con movimiento reducido, salta al valor.
// ----------------------------------------------------------------------------
export function useContadorAnimado(valor, { duracion = 750 } = {}) {
  const objetivo = Number(valor) || 0
  const reducido = useMovimientoReducido()
  const [actual, setActual] = useState(objetivo)
  const desdeRef = useRef(objetivo)
  const rafRef = useRef(null)

  useEffect(() => {
    if (reducido || duracion <= 0) {
      desdeRef.current = objetivo
      setActual(objetivo)
      return
    }

    const desde = desdeRef.current
    if (desde === objetivo) return

    const inicio = performance.now()
    // easeOutCubic: rápido al principio, se asienta al final.
    const suavizar = (t) => 1 - Math.pow(1 - t, 3)

    const paso = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / duracion)
      setActual(desde + (objetivo - desde) * suavizar(t))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(paso)
      } else {
        desdeRef.current = objetivo
      }
    }

    rafRef.current = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(rafRef.current)
  }, [objetivo, duracion, reducido])

  return actual
}
