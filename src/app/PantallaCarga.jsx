import Logo from '@/shared/marca/Logo'
import { BarberPoleGirando } from '@/shared/marca/BarberPole'

// ----------------------------------------------------------------------------
//  Pantalla de arranque. Se muestra mientras se resuelve la sesión.
//  El bastón girando ocupa el hueco de espera con la identidad de la marca en
//  vez de un spinner genérico.
// ----------------------------------------------------------------------------
export default function PantallaCarga({ mensaje = 'Cargando…' }) {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-1000 px-4">
      <div className="flex animate-aparecer flex-col items-center gap-5">
        <Logo tamano="lg" compacto />
        <BarberPoleGirando />
        <p role="status" aria-live="polite" className="text-sm text-ink-500">
          {mensaje}
        </p>
      </div>
    </div>
  )
}
