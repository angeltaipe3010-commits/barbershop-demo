import Segmentado from './Segmentado'
import { PERIODOS } from '../lib/periodos'

// ----------------------------------------------------------------------------
//  Selector de período (Día / Semana / Mes) + fecha de referencia.
//  Compartido por Ventas, Reportes, Bóveda, Gastos y Liquidación: el control
//  se comporta igual en todas, así que se aprende una sola vez.
// ----------------------------------------------------------------------------
export default function PeriodoSelector({ periodo, setPeriodo, refFecha, setRefFecha }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmentado
        ariaLabel="Período"
        valor={periodo}
        onChange={setPeriodo}
        opciones={PERIODOS.map((p) => ({ valor: p.valor, etiqueta: p.etiqueta }))}
      />
      <input
        type="date"
        value={refFecha}
        onChange={(e) => setRefFecha(e.target.value)}
        className="input-base w-auto"
        aria-label="Fecha de referencia"
      />
    </div>
  )
}
