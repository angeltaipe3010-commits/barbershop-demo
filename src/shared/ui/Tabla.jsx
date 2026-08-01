// ----------------------------------------------------------------------------
//  Tabla — envoltura con scroll horizontal contenido.
//  El desbordamiento vive DENTRO de la tabla, nunca en el <body>: en móvil se
//  desliza la tabla, no la página entera.
// ----------------------------------------------------------------------------
export default function Tabla({ minAncho = '640px', className = '', children }) {
  return (
    <div className={`-mx-px overflow-x-auto ${className}`}>
      <table className="tabla" style={{ minWidth: minAncho }}>
        {children}
      </table>
    </div>
  )
}

// Cabecera pegajosa: al recorrer una lista larga, los títulos siguen visibles.
Tabla.Cabecera = function TablaCabecera({ children, pegajosa = false }) {
  return (
    <thead
      className={`bg-ink-900/80 ${pegajosa ? 'sticky top-0 z-10 backdrop-blur' : ''}`}
    >
      {children}
    </thead>
  )
}

// Las filas aparecen escalonadas al montar la tabla.
Tabla.Cuerpo = function TablaCuerpo({ children, animar = true }) {
  return <tbody className={animar ? 'escalonar' : undefined}>{children}</tbody>
}
