import { useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { tituloDeRuta } from '@/app/navegacion'
import { Badge, PuntoVivo } from '@/shared/ui'
import { fmtFechaLarga } from '@/shared/lib/format'

// ----------------------------------------------------------------------------
//  Barra superior. Se queda pegada arriba con desenfoque: en listas largas
//  siempre se sabe en qué sección se está y el saludo no ocupa espacio fijo.
// ----------------------------------------------------------------------------
export default function Topbar({ onAbrirMenu, offline, pendientes }) {
  const { perfil } = useAuth()
  const { pathname } = useLocation()
  const nombre = perfil?.nombre?.split(' ')[0]

  return (
    <header
      className="sticky top-0 z-topbar flex h-16 items-center gap-3 border-b border-ink-800/70
                 bg-ink-1000/80 px-4 backdrop-blur-xl lg:px-8"
    >
      <button
        onClick={onAbrirMenu}
        aria-label="Abrir menú"
        className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-300
                   transition-colors duration-rapida hover:bg-ink-800 hover:text-white lg:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        {/* En móvil manda la sección; en escritorio ya está en el menú, así que
            el espacio se usa para el saludo. */}
        <p className="truncate font-semibold text-white lg:hidden">{tituloDeRuta(pathname)}</p>
        <p className="hidden truncate text-sm text-ink-400 lg:block">
          Bienvenido, <span className="font-semibold text-white">{nombre || 'staff'}</span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <EstadoConexion offline={offline} pendientes={pendientes} />
        {/* `first-letter` y no `capitalize`: en español solo va en mayúscula la
            primera letra ("jueves, 30 de julio"), no cada palabra. */}
        <span className="hidden text-xs text-ink-500 first-letter:uppercase sm:block">
          {fmtFechaLarga()}
        </span>
      </div>
    </header>
  )
}

// Solo aparece cuando hay algo que decir: sin conexión o con cobros en cola.
function EstadoConexion({ offline, pendientes }) {
  if (!offline && !pendientes) return null

  return (
    <Badge
      tono={offline ? 'aviso' : 'info'}
      className="animate-aparecer-bajar"
      title={
        offline
          ? 'Sin internet. Los cobros se guardan en este dispositivo y se envían al reconectar.'
          : 'Enviando los cobros que quedaron guardados sin conexión.'
      }
    >
      <PuntoVivo tono={offline ? 'aviso' : 'info'} />
      <span className="hidden sm:inline">{offline ? 'Sin conexión' : 'Sincronizando'}</span>
      {pendientes > 0 && <span className="cifras">{pendientes}</span>}
    </Badge>
  )
}
