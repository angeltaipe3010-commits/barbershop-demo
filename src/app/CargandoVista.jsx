import { EsqueletoTarjetas } from '@/shared/ui'

// ----------------------------------------------------------------------------
//  Relleno mientras se descarga el código de una sección (lazy route).
//  Imita la forma de una vista típica —título, KPIs, panel— para que el salto
//  al contenido real sea mínimo.
// ----------------------------------------------------------------------------
export default function CargandoVista() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span role="status" aria-live="polite" className="sr-only">
        Cargando sección…
      </span>

      <div className="space-y-2">
        <div className="esqueleto h-8 w-56" />
        <div className="esqueleto h-4 w-72" />
      </div>

      <EsqueletoTarjetas n={4} />

      <div className="esqueleto h-64 rounded-xl2" />
    </div>
  )
}
