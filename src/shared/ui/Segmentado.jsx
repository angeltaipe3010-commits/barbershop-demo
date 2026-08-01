import { useLayoutEffect, useRef, useState } from 'react'

// ----------------------------------------------------------------------------
//  Control segmentado — el indicador se DESLIZA entre opciones en vez de
//  parpadear. Ese desplazamiento continuo es lo que hace legible el cambio.
// ----------------------------------------------------------------------------
export default function Segmentado({ opciones, valor, onChange, className = '', ariaLabel }) {
  const contenedorRef = useRef(null)
  const [indicador, setIndicador] = useState({ left: 0, width: 0, listo: false })

  const indiceActivo = opciones.findIndex((o) => o.valor === valor)

  // Mide el botón activo y coloca el indicador debajo.
  useLayoutEffect(() => {
    const cont = contenedorRef.current
    if (!cont) return

    const medir = () => {
      const botones = cont.querySelectorAll('[data-seg]')
      const activo = botones[indiceActivo]
      if (!activo) return setIndicador((p) => ({ ...p, listo: false }))
      setIndicador({ left: activo.offsetLeft, width: activo.offsetWidth, listo: true })
    }

    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(cont)
    return () => ro.disconnect()
  }, [indiceActivo, opciones])

  return (
    <div
      ref={contenedorRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`relative inline-flex shrink-0 rounded-lg border border-ink-800 bg-ink-900/70 p-1 ${className}`}
    >
      {indicador.listo && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1 rounded-md bg-marca-600 shadow-marca-sm
                     transition-all duration-media ease-salida"
          style={{ left: indicador.left, width: indicador.width }}
        />
      )}

      {opciones.map((o) => {
        const activo = o.valor === valor
        return (
          <button
            key={o.valor}
            data-seg
            role="tab"
            type="button"
            aria-selected={activo}
            onClick={() => onChange(o.valor)}
            title={o.titulo}
            className={`relative z-10 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium
                        transition-colors duration-media
                        ${activo ? 'text-white' : 'text-ink-400 hover:text-ink-100'}`}
          >
            {o.etiqueta}
          </button>
        )
      })}
    </div>
  )
}
