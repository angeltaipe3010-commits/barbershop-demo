// ----------------------------------------------------------------------------
//  Mapa de navegación — fuente ÚNICA de verdad.
//  El router y el menú lateral se generan de aquí, así que añadir una sección
//  es una sola línea y nunca pueden quedar desincronizados.
//
//  · roles  → quién ve la entrada (y quién puede entrar por URL directa)
//  · grupo  → encabezado bajo el que se agrupa en el menú
// ----------------------------------------------------------------------------

const Icono = ({ d }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5 shrink-0"
    aria-hidden="true"
  >
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
)

export const GRUPOS = {
  operacion: 'Operación',
  catalogo: 'Catálogo',
  finanzas: 'Finanzas',
  administracion: 'Administración',
}

export const NAVEGACION = [
  {
    to: '/',
    label: 'Inicio',
    grupo: 'operacion',
    roles: ['admin', 'barbero'],
    icono: <Icono d="M3 12l9-9 9 9M5 10v10h14V10" />,
  },
  {
    to: '/agenda',
    label: 'Agenda',
    grupo: 'operacion',
    roles: ['admin', 'barbero'],
    icono: <Icono d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />,
  },
  {
    to: '/clientes',
    label: 'Clientes',
    grupo: 'operacion',
    roles: ['admin', 'barbero'],
    icono: <Icono d="M17 20h5v-1a4 4 0 0 0-4-4h-1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm6 9H1v-1a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v1z" />,
  },
  {
    to: '/ventas',
    label: 'Ventas',
    grupo: 'operacion',
    roles: ['admin', 'barbero'],
    icono: <Icono d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />,
  },
  {
    to: '/mis-comisiones',
    label: 'Mis comisiones',
    grupo: 'operacion',
    roles: ['barbero'],
    icono: <Icono d="M3 3v18h18M7 16l4-4 3 3 5-6" />,
  },

  {
    to: '/servicios',
    label: 'Servicios',
    grupo: 'catalogo',
    roles: ['admin'],
    icono: <Icono d="M3 7h18M3 12h18M3 17h18" />,
  },
  {
    to: '/inventario',
    label: 'Inventario',
    grupo: 'catalogo',
    roles: ['admin'],
    // Insignia con el número de productos bajo mínimo.
    insignia: 'stockBajo',
    icono: <Icono d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
  },

  {
    to: '/caja',
    label: 'Caja',
    grupo: 'finanzas',
    roles: ['admin'],
    icono: <Icono d="M3 7h18v10H3zM3 11h18M7 15h2" />,
  },
  {
    to: '/gastos',
    label: 'Gastos',
    grupo: 'finanzas',
    roles: ['admin'],
    icono: <Icono d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  },
  {
    to: '/boveda',
    label: 'Bóveda',
    grupo: 'finanzas',
    roles: ['admin'],
    icono: <Icono d={['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2v2l1.5 1']} />,
  },
  {
    to: '/liquidacion',
    label: 'Liquidación',
    grupo: 'finanzas',
    roles: ['admin'],
    icono: <Icono d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6M9 9h6" />,
  },
  {
    to: '/reportes',
    label: 'Reportes',
    grupo: 'finanzas',
    roles: ['admin'],
    icono: <Icono d="M3 3v18h18M7 16l4-4 3 3 5-6" />,
  },

  {
    to: '/staff',
    label: 'Barberos',
    grupo: 'administracion',
    roles: ['admin'],
    icono: <Icono d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />,
  },
  {
    to: '/configuracion',
    label: 'Configuración',
    grupo: 'administracion',
    roles: ['admin'],
    icono: <Icono d={['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z']} />,
  },
]

// Entradas visibles para un rol, ya agrupadas y en el orden del menú.
export function navegacionPorRol(rol) {
  const visibles = NAVEGACION.filter((n) => n.roles.includes(rol))
  return Object.keys(GRUPOS)
    .map((clave) => ({
      clave,
      titulo: GRUPOS[clave],
      entradas: visibles.filter((n) => n.grupo === clave),
    }))
    .filter((g) => g.entradas.length > 0)
}

// Título de la sección activa, para la barra superior y el <title> del documento.
export function tituloDeRuta(pathname) {
  const exacta = NAVEGACION.find((n) => n.to === pathname)
  if (exacta) return exacta.label
  const parcial = NAVEGACION.find((n) => n.to !== '/' && pathname.startsWith(n.to))
  return parcial?.label || 'Inicio'
}
