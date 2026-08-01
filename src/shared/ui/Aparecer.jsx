import { useEffect, useRef, useState } from 'react'

// ----------------------------------------------------------------------------
//  Aparecer — revela el contenido cuando entra en pantalla.
//  Para lo que está bajo el pliegue: animar al montar sería invisible (ya pasó
//  cuando el usuario llega). Con IntersectionObserver la aparición ocurre justo
//  cuando la mirada llega ahí. Se dispara UNA sola vez por elemento.
// ----------------------------------------------------------------------------
export default function Aparecer({
  as: Tag = 'div',
  retardo = 0,
  umbral = 0.12,
  className = '',
  children,
  ...props
}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Sin soporte (o test env): mostrar directamente, nunca dejarlo oculto.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const io = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return
        setVisible(true)
        io.disconnect()
      },
      { threshold: umbral, rootMargin: '0px 0px -40px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [umbral])

  return (
    <Tag
      ref={ref}
      className={`${visible ? 'animate-aparecer' : 'opacity-0'} ${className}`}
      style={visible && retardo ? { animationDelay: `${retardo}ms` } : undefined}
      {...props}
    >
      {children}
    </Tag>
  )
}
