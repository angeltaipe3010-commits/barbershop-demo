// ----------------------------------------------------------------------------
//  Isotipo + logotipo. Nombre y logo salen de la configuración del negocio,
//  con "El Negrote Barber Shop" por defecto.
// ----------------------------------------------------------------------------
export default function Logo({
  compacto = false,
  nombre = 'El Negrote Barber Shop',
  logoUrl = null,
  tamano = 'md',
}) {
  const cajas = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' }
  const iconos = { sm: 'h-5 w-5', md: 'h-6 w-6', lg: 'h-8 w-8' }
  const textos = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' }

  return (
    <div className="flex items-center gap-3">
      <div
        className={`group relative grid ${cajas[tamano]} shrink-0 place-items-center overflow-hidden
                    rounded-xl bg-gradient-to-br from-marca-500 to-marca-700 shadow-marca`}
      >
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 24 24" className={`${iconos[tamano]} text-white`} fill="currentColor">
            <path d="M14.7 6.3a1 1 0 0 1 1.4 0l5 5-1.4 1.4-3.1-3.1-2.5 2.5 1 1a3 3 0 1 1-1.4 1.4l-1.2-1.2-1.2 1.2a3 3 0 1 1-1.4-1.4l5.8-5.8-.9-.9 1.4-1.4-1.5-1.5 1.4-1.4 1.3 1.3-.2-.2zM6 16a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
          </svg>
        )}
        {/* Destello diagonal que cruza el isotipo al pasar el puntero */}
        <span
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r
                     from-transparent via-white/30 to-transparent transition-transform
                     duration-700 ease-salida group-hover:translate-x-full"
          aria-hidden="true"
        />
      </div>

      {!compacto && (
        <p
          className={`font-display ${textos[tamano]} uppercase leading-tight tracking-wide text-white`}
        >
          {nombre}
        </p>
      )}
    </div>
  )
}
