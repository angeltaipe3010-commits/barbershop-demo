import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import CargandoVista from '@/app/CargandoVista'
import { tituloDeRuta } from '@/app/navegacion'
import { iniciarAutoSync, estaOffline } from '@/services/offline'

// ----------------------------------------------------------------------------
//  Estructura de la zona autenticada: menú lateral + barra superior + contenido.
//  Aquí viven tres responsabilidades transversales: el estado del menú móvil,
//  el indicador de conexión/cola offline y el título del documento.
// ----------------------------------------------------------------------------
export default function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [pendientes, setPendientes] = useState(0)
  const [offline, setOffline] = useState(estaOffline())
  const { pathname } = useLocation()

  // Estado de conexión + sincronización de cobros encolados.
  useEffect(() => {
    const actualizar = () => setOffline(estaOffline())
    window.addEventListener('online', actualizar)
    window.addEventListener('offline', actualizar)
    const detener = iniciarAutoSync(setPendientes)
    return () => {
      window.removeEventListener('online', actualizar)
      window.removeEventListener('offline', actualizar)
      detener()
    }
  }, [])

  // Al cambiar de sección: cerrar el menú móvil, subir el scroll y actualizar
  // el título de la pestaña (útil con varias pestañas abiertas en el local).
  useEffect(() => {
    setMenuAbierto(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.title = `${tituloDeRuta(pathname)} · Demo Barbershop`
  }, [pathname])

  return (
    <div className="min-h-screen">
      {/* Salto directo al contenido: primera parada del teclado. */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-toast
                   focus:rounded-lg focus:bg-marca-600 focus:px-4 focus:py-2 focus:text-sm
                   focus:font-semibold focus:text-white"
      >
        Saltar al contenido
      </a>

      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />

      <div className="lg:pl-[17rem]">
        <Topbar
          onAbrirMenu={() => setMenuAbierto(true)}
          offline={offline}
          pendientes={pendientes}
        />

        <main id="contenido" className="p-4 pb-16 sm:p-6 lg:p-8">
          {/* `key` en la ruta: cada sección vuelve a montar y reproduce su
              animación de aparición, dando una transición de página clara. */}
          <div key={pathname} className="mx-auto max-w-[1600px] animate-aparecer">
            <Suspense fallback={<CargandoVista />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
