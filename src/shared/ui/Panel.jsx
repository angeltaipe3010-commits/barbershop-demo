// ----------------------------------------------------------------------------
//  Panel — la superficie base de la app.
//  `Panel.Cabecera` y `Panel.Cuerpo` dan un ritmo interno consistente para que
//  todas las secciones respiren igual sin repetir paddings en cada vista.
// ----------------------------------------------------------------------------
export default function Panel({
  interactivo = false,
  className = '',
  children,
  ...props
}) {
  return (
    <section
      className={`${interactivo ? 'panel-interactivo' : 'panel'} ${className}`}
      {...props}
    >
      {children}
    </section>
  )
}

Panel.Cabecera = function PanelCabecera({ titulo, descripcion, accion, className = '' }) {
  return (
    <header
      className={`flex flex-wrap items-center justify-between gap-3 border-b border-ink-800/70 px-5 py-4 ${className}`}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-white">{titulo}</h2>
        {descripcion && <p className="mt-0.5 text-sm text-ink-400">{descripcion}</p>}
      </div>
      {accion}
    </header>
  )
}

Panel.Cuerpo = function PanelCuerpo({ className = '', children }) {
  return <div className={`p-5 ${className}`}>{children}</div>
}
