import { useContadorAnimado } from '../hooks/useContadorAnimado'
import { fmtMoneda } from '../lib/format'

// ----------------------------------------------------------------------------
//  Tarjeta de indicador (KPI).
//  El valor cuenta hasta su cifra final para que la vista tenga un punto focal
//  claro al cargar. Acepta un número (formateado como moneda o entero) o un
//  nodo ya formateado cuando el dato no es numérico.
// ----------------------------------------------------------------------------
export default function StatCard({
  titulo,
  valor,
  sub,
  formato = 'moneda',       // 'moneda' | 'entero' | 'crudo'
  acento = false,
  tendencia,                // número: % de variación (+/−)
  icono,
  className = '',
}) {
  const esNumero = typeof valor === 'number' && formato !== 'crudo'
  const animado = useContadorAnimado(esNumero ? valor : 0)

  const mostrado = !esNumero
    ? valor
    : formato === 'entero'
      ? Math.round(animado).toLocaleString('es-PE')
      : fmtMoneda(animado)

  return (
    <article
      className={`panel group overflow-hidden p-5 transition-all duration-media ease-salida
                  hover:-translate-y-0.5 hover:border-ink-700 hover:shadow-elevado ${className}`}
    >
      {/* Halo de marca en la tarjeta destacada */}
      {acento && (
        <div
          className="pointer-events-none absolute inset-0 bg-marca-glow opacity-70"
          aria-hidden="true"
        />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <p className="text-etiqueta font-semibold uppercase text-ink-500">{titulo}</p>
        {icono && (
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg
                        ${acento ? 'bg-marca-600/15 text-marca-400' : 'bg-ink-800/80 text-ink-400'}
                        transition-transform duration-media ease-rebote group-hover:scale-110`}
          >
            {icono}
          </span>
        )}
      </div>

      <p
        className={`relative mt-2.5 cifras text-2xl font-bold tracking-tight
                    ${acento ? 'text-white' : 'text-ink-50'}`}
      >
        {mostrado}
      </p>

      <div className="relative mt-1.5 flex items-center gap-2">
        {tendencia != null && Number.isFinite(tendencia) && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold
                        ${tendencia >= 0 ? 'text-exito' : 'text-peligro'}`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-3 w-3 ${tendencia >= 0 ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              aria-hidden="true"
            >
              <path d="m5 15 7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {Math.abs(tendencia).toFixed(0)}%
          </span>
        )}
        {sub && <p className="truncate text-xs text-ink-500">{sub}</p>}
      </div>

      {/* Línea de acento inferior que se despliega al pasar el puntero */}
      <span
        className={`absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0
                    transition-transform duration-media ease-salida group-hover:scale-x-100
                    ${acento ? 'bg-marca-600' : 'bg-ink-700'}`}
        aria-hidden="true"
      />
    </article>
  )
}
