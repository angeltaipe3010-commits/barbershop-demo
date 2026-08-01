import { BarberDivider } from '../marca/BarberPole'

// ----------------------------------------------------------------------------
//  Encabezado de vista — mismo ancla visual en las 15 pantallas.
//  Título en display, subtítulo de contexto y zona de acciones a la derecha.
// ----------------------------------------------------------------------------
export default function EncabezadoVista({ titulo, descripcion, acciones, divisor = true }) {
  return (
    <header className="animate-aparecer">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="titulo-vista">{titulo}</h1>
          {descripcion && <p className="mt-1 text-sm text-ink-400">{descripcion}</p>}
        </div>
        {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
      {divisor && <BarberDivider className="mt-5" />}
    </header>
  )
}
