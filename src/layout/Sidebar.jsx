import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { inventarioApi } from '@/services/api'
import { navegacionPorRol } from '@/app/navegacion'
import Logo from '@/shared/marca/Logo'
import { BarberDivider } from '@/shared/marca/BarberPole'
import { Badge, Boton } from '@/shared/ui'
import { iniciales } from '@/shared/lib/format'

// ----------------------------------------------------------------------------
//  Menú lateral. Fijo en escritorio, cajón deslizante en móvil.
//  Las entradas salen del mapa de navegación, agrupadas por área de trabajo:
//  con 15 secciones, agrupar es lo que evita que el menú se lea como una lista.
// ----------------------------------------------------------------------------
export default function Sidebar({ abierto, onCerrar }) {
  const { rol, perfil, esAdmin, logout, config } = useAuth()
  const grupos = navegacionPorRol(rol)
  const [stockBajo, setStockBajo] = useState(0)

  useEffect(() => {
    if (!esAdmin) return
    inventarioApi.stockBajo().then(({ data }) => setStockBajo((data || []).length))
  }, [esAdmin])

  const insignias = { stockBajo }

  return (
    <>
      {/* Telón del cajón móvil */}
      {abierto && (
        <div
          className="fixed inset-0 z-overlay animate-fundido bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onCerrar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-sidebar flex w-[17rem] flex-col
                    border-r border-ink-800/80 bg-ink-950/95 backdrop-blur-xl
                    transition-transform duration-media ease-salida
                    lg:z-topbar lg:translate-x-0
                    ${abierto ? 'translate-x-0 shadow-elevado' : '-translate-x-full'}`}
        aria-label="Navegación principal"
      >
        {/* Marca */}
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <Logo nombre={config?.nombre_negocio} logoUrl={config?.logo_url} />
          <button
            onClick={onCerrar}
            aria-label="Cerrar menú"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400
                       transition-colors duration-rapida hover:bg-ink-800 hover:text-white lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-5">
          <BarberDivider />
        </div>

        {/* Secciones */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {grupos.map((grupo) => (
            <div key={grupo.clave}>
              <p className="mb-1.5 px-3 text-etiqueta font-semibold uppercase text-ink-600">
                {grupo.titulo}
              </p>
              <ul className="escalonar space-y-0.5">
                {grupo.entradas.map((item) => (
                  <li key={item.to}>
                    <EnlaceNav item={item} insignia={insignias[item.insignia]} onIr={onCerrar} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Perfil + salida */}
        <div className="border-t border-ink-800/80 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full
                         bg-gradient-to-br from-marca-500 to-marca-700 text-xs font-bold text-white"
            >
              {perfil?.foto_url ? (
                <img src={perfil.foto_url} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                iniciales(perfil?.nombre)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {perfil?.nombre || 'Usuario'}
              </p>
              <Badge tono={esAdmin ? 'marca' : 'info'} className="mt-0.5">
                {esAdmin ? 'Administrador' : 'Barbero'}
              </Badge>
            </div>
          </div>

          <Boton
            variante="ghost"
            tamano="sm"
            onClick={logout}
            className="w-full"
            iconoIzq={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          >
            Cerrar sesión
          </Boton>
        </div>
      </aside>
    </>
  )
}

// Enlace del menú. El indicador activo es una barra que crece desde la
// izquierda: señala la sección sin depender solo del color de fondo.
function EnlaceNav({ item, insignia, onIr }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onIr}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
         transition-all duration-rapida ease-salida
         ${
           isActive
             ? 'bg-marca-600/12 text-white'
             : 'text-ink-400 hover:bg-ink-800/70 hover:text-ink-50'
         }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`absolute left-0 top-1/2 w-0.5 -translate-y-1/2 rounded-r-full bg-marca-500
                        transition-all duration-media ease-salida
                        ${isActive ? 'h-6 opacity-100' : 'h-0 opacity-0'}`}
            aria-hidden="true"
          />
          <span
            className={`transition-transform duration-media ease-salida
                        ${isActive ? 'text-marca-500' : 'group-hover:translate-x-0.5'}`}
          >
            {item.icono}
          </span>
          <span className="flex-1 truncate">{item.label}</span>
          {insignia > 0 && (
            <span
              className="grid h-5 min-w-[1.25rem] shrink-0 place-items-center rounded-full
                         bg-marca-600 px-1 text-[11px] font-bold text-white shadow-marca-sm"
              title={`${insignia} producto(s) bajo el mínimo`}
            >
              {insignia}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
