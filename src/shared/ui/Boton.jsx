import { forwardRef } from 'react'

// ----------------------------------------------------------------------------
//  Botón — única fuente de verdad para acciones.
//  Variantes por INTENCIÓN (no por color): marca = acción principal,
//  ghost = secundaria, sutil = terciaria, peligro = destructiva.
// ----------------------------------------------------------------------------

const VARIANTES = {
  marca: 'btn-marca',
  ghost: 'btn-ghost',
  sutil: 'btn-sutil',
  peligro: 'btn-peligro',
}

const TAMANOS = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
  icono: 'h-9 w-9 p-0',
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-girar" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

const Boton = forwardRef(function Boton(
  {
    variante = 'ghost',
    tamano = 'md',
    cargando = false,
    iconoIzq = null,
    iconoDer = null,
    className = '',
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`${VARIANTES[variante] || VARIANTES.ghost} ${TAMANOS[tamano] || TAMANOS.md} ${className}`}
      {...props}
    >
      {cargando ? <Spinner /> : iconoIzq}
      {children}
      {!cargando && iconoDer}
    </button>
  )
})

export default Boton
