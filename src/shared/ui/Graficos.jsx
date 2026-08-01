import { fmtMoneda } from '../lib/format'

// ----------------------------------------------------------------------------
//  Gráficos ligeros en CSS puro (sin librerías: el bundle importa en un POS
//  que se usa desde el móvil del local).
//  Las barras crecen desde su origen al montar → se lee la magnitud relativa
//  antes que el número.
// ----------------------------------------------------------------------------

// Barras horizontales con etiqueta y valor. Ideal para rankings.
export function BarrasHorizontales({ datos, formato = fmtMoneda, vacio = 'Sin datos' }) {
  const max = Math.max(...datos.map((d) => Number(d.valor) || 0), 1)

  if (!datos.length) return <p className="py-6 text-center text-sm text-ink-500">{vacio}</p>

  return (
    <div className="space-y-4">
      {datos.map((d, i) => {
        const pct = ((Number(d.valor) || 0) / max) * 100
        return (
          <div key={d.etiqueta ?? i}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-ink-300">{d.etiqueta}</span>
              <span className="cifras shrink-0 font-semibold text-white">{formato(d.valor)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-800">
              <div
                className={`h-full origin-left rounded-full animate-crecer-barra ${d.color || 'bg-marca-600'}`}
                style={{ width: `${pct}%`, animationDelay: `${i * 70}ms` }}
                role="presentation"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Columnas verticales para series temporales (ventas por día).
export function Columnas({ datos, formato = fmtMoneda, alto = 'h-40' }) {
  const max = Math.max(...datos.map((d) => Number(d.valor) || 0), 1)

  if (!datos.length) return <p className="py-6 text-center text-sm text-ink-500">Sin datos</p>

  return (
    <div className={`flex items-end gap-1.5 ${alto}`}>
      {datos.map((d, i) => {
        const pct = ((Number(d.valor) || 0) / max) * 100
        return (
          <div key={d.etiqueta ?? i} className="group relative flex h-full flex-1 flex-col justify-end">
            {/* Tooltip al pasar el puntero */}
            <div
              className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full
                         whitespace-nowrap rounded-md border border-ink-700 bg-ink-850 px-2 py-1
                         text-xs text-white shadow-elevado group-hover:block"
            >
              <span className="cifras font-semibold">{formato(d.valor)}</span>
              <span className="ml-1 text-ink-400">{d.etiquetaLarga || d.etiqueta}</span>
            </div>
            <div
              className="w-full origin-bottom rounded-t bg-gradient-to-t from-marca-700 to-marca-500
                         animate-crecer-columna transition-opacity duration-rapida
                         group-hover:opacity-100 md:opacity-80"
              style={{ height: `${Math.max(pct, 2)}%`, animationDelay: `${i * 35}ms` }}
            />
            <span className="mt-1.5 truncate text-center text-[10px] text-ink-500">{d.etiqueta}</span>
          </div>
        )
      })}
    </div>
  )
}

// Distribución en una sola barra apilada (métodos de pago, categorías).
export function BarraApilada({ segmentos, total }) {
  const suma = total ?? segmentos.reduce((s, x) => s + (Number(x.valor) || 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-ink-800">
        {segmentos.map((s, i) => {
          const pct = suma ? ((Number(s.valor) || 0) / suma) * 100 : 0
          if (!pct) return null
          return (
            <div
              key={s.etiqueta ?? i}
              className={`h-full origin-left animate-crecer-barra ${s.color}`}
              style={{ width: `${pct}%`, animationDelay: `${i * 60}ms` }}
              title={`${s.etiqueta}: ${fmtMoneda(s.valor)}`}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segmentos.map((s, i) => (
          <span key={s.etiqueta ?? i} className="flex items-center gap-1.5 text-xs text-ink-400">
            <span className={`h-2 w-2 shrink-0 rounded-full ${s.color}`} aria-hidden="true" />
            <span className="capitalize">{s.etiqueta}</span>
            <span className="cifras font-semibold text-ink-200">{fmtMoneda(s.valor)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
