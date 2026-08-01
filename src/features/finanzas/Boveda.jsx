import { useState } from 'react'
import { useFinanzas } from './useFinanzas'
import {
  EncabezadoVista,
  Panel,
  StatCard,
  Tabla,
  PeriodoSelector,
  Aparecer,
  EsqueletoTarjetas,
  BarrasHorizontales,
  BarraApilada,
} from '@/shared/ui'
import { fmtMoneda, fmtFecha, hoyISO, METODOS_PAGO } from '@/shared/lib/format'

// ----------------------------------------------------------------------------
//  Bóveda: dónde está el dinero.
//  Separa el efectivo físico (lo que se cuenta en caja) del digital (lo que ya
//  está en Yape/Plin/banco), porque son dos bolsillos distintos.
// ----------------------------------------------------------------------------
export default function Boveda() {
  const [periodo, setPeriodo] = useState('mes')
  const [refFecha, setRefFecha] = useState(hoyISO())

  const {
    desde,
    hasta,
    cargando,
    porMetodo,
    efectivoNeto,
    totalDigitalNeto,
    totalIngresos,
    totalGastos,
    utilidad,
    porCategoria,
  } = useFinanzas(periodo, refFecha)

  const esDia = periodo === 'dia'

  return (
    <div className="space-y-6">
      <EncabezadoVista
        titulo="Bóveda"
        descripcion={`Tu dinero por método de pago · ${
          esDia ? fmtFecha(desde) : `${fmtFecha(desde)} — ${fmtFecha(hasta)}`
        }`}
        acciones={
          <PeriodoSelector
            periodo={periodo}
            setPeriodo={setPeriodo}
            refFecha={refFecha}
            setRefFecha={setRefFecha}
          />
        }
      />

      {cargando ? (
        <EsqueletoTarjetas n={4} />
      ) : (
        <div className="escalonar grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            titulo="En efectivo (neto)"
            valor={efectivoNeto}
            sub="Ventas efectivo − gastos efectivo"
            acento
            icono={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            }
          />
          <StatCard
            titulo="En plataformas (neto)"
            valor={totalDigitalNeto}
            sub="Yape + Plin + tarjeta + transferencia"
            icono={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <path d="M12 18h.01" strokeLinecap="round" />
              </svg>
            }
          />
          <StatCard titulo="Ingresos totales" valor={totalIngresos} sub="Incluye propinas" />
          <StatCard
            titulo="Utilidad neta"
            valor={utilidad}
            sub={`Gastos: ${fmtMoneda(totalGastos)}`}
          />
        </div>
      )}

      {/* Reparto del ingreso */}
      {!cargando && totalIngresos > 0 && (
        <Aparecer>
          <Panel>
            <Panel.Cabecera
              titulo="Cómo entró el dinero"
              descripcion="Proporción de cada método sobre el ingreso total"
            />
            <Panel.Cuerpo>
              <BarraApilada
                segmentos={porMetodo
                  .filter((m) => m.ingresos > 0)
                  .map((m) => ({
                    etiqueta: METODOS_PAGO[m.metodo]?.label || m.metodo,
                    valor: m.ingresos,
                    color: METODOS_PAGO[m.metodo]?.color || 'bg-ink-600',
                  }))}
              />
            </Panel.Cuerpo>
          </Panel>
        </Aparecer>
      )}

      {/* Detalle por método */}
      <Aparecer retardo={80}>
        <Panel className="overflow-hidden">
          <Panel.Cabecera titulo="Movimiento por método de pago" />

          <Tabla minAncho="560px">
            <Tabla.Cabecera>
              <tr>
                <th>Método</th>
                <th className="text-right">Ingresos</th>
                <th className="text-right">Gastos</th>
                <th className="text-right">Neto</th>
              </tr>
            </Tabla.Cabecera>
            <Tabla.Cuerpo>
              {porMetodo.map((m) => (
                <tr key={m.metodo}>
                  <td>
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${METODOS_PAGO[m.metodo]?.color || 'bg-ink-600'}`}
                        aria-hidden="true"
                      />
                      <span className="font-medium text-white">
                        {METODOS_PAGO[m.metodo]?.label || m.metodo}
                      </span>
                    </span>
                  </td>
                  <td className="cifras text-right text-ink-300">{fmtMoneda(m.ingresos)}</td>
                  <td className="cifras text-right text-ink-500">
                    {m.egresos ? `− ${fmtMoneda(m.egresos)}` : '—'}
                  </td>
                  <td
                    className={`cifras text-right font-semibold ${m.neto < 0 ? 'text-peligro' : 'text-white'}`}
                  >
                    {fmtMoneda(m.neto)}
                  </td>
                </tr>
              ))}
            </Tabla.Cuerpo>
          </Tabla>

          <p className="border-t border-ink-800/70 px-5 py-3 text-xs text-ink-500">
            El <b className="text-exito">efectivo</b> es el dinero físico de la caja; lo digital ya
            está en tus cuentas. El efectivo total en caja incluye además el fondo con que se abrió.
          </p>
        </Panel>
      </Aparecer>

      {/* Gastos por categoría */}
      <Aparecer retardo={140}>
        <Panel>
          <Panel.Cabecera
            titulo="Gastos por categoría"
            descripcion="En qué se va el dinero del período"
          />
          <Panel.Cuerpo>
            {cargando ? (
              <div className="esqueleto h-32" />
            ) : (
              <BarrasHorizontales
                datos={porCategoria.map((c) => ({
                  etiqueta: `${c.categoria} · ${c.n} ${c.n === 1 ? 'gasto' : 'gastos'}`,
                  valor: c.monto,
                  color: 'bg-aviso',
                }))}
                vacio="Sin gastos en el período."
              />
            )}
          </Panel.Cuerpo>
        </Panel>
      </Aparecer>
    </div>
  )
}
