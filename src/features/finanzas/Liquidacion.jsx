import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { liquidacionApi } from '@/services/api'
import PagoComisionModal from './PagoComisionModal'
import {
  EncabezadoVista,
  Panel,
  StatCard,
  Tabla,
  Badge,
  Boton,
  Segmentado,
  Aparecer,
  EsqueletoTabla,
  useToast,
} from '@/shared/ui'
import { descargarCSV } from '@/shared/lib/exportar'
import { rangoDe } from '@/shared/lib/periodos'
import { fmtMoneda, fmtFecha, hoyISO, sumarDias, aISOLocal, iniciales } from '@/shared/lib/format'

const PERIODOS = [
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'quincena', etiqueta: 'Quincena' },
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'todo', etiqueta: 'Todo' },
]

// Rango de liquidación. La quincena son dos semanas completas (lun–dom) para
// que ninguna comisión quede partida entre dos períodos.
function rangoLiquidacion(periodo, ref) {
  if (periodo === 'todo') return { desde: null, hasta: null }
  if (periodo === 'quincena') {
    const sem = rangoDe('semana', ref)
    return { desde: sumarDias(sem.desde, -7), hasta: sem.hasta }
  }
  return rangoDe(periodo, ref)
}

export default function Liquidacion() {
  const { usuario } = useAuth()
  const toast = useToast()

  const [periodo, setPeriodo] = useState('semana')
  const [refFecha, setRefFecha] = useState(hoyISO())
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [pagando, setPagando] = useState(null)

  const { desde, hasta } = rangoLiquidacion(periodo, refFecha)
  const etiquetaPeriodo = PERIODOS.find((p) => p.valor === periodo)?.etiqueta || ''
  const esTodo = periodo === 'todo'

  const cargar = useCallback(async () => {
    setCargando(true)

    // Base: saldo acumulado real (ganado − pagado de todo el histórico).
    const { data: base } = await liquidacionApi.resumen()
    let out = (base || []).map((b) => ({
      ...b,
      generado: Number(b.ganado),
      pagadoPeriodo: Number(b.pagado),
    }))

    // Con un rango activo, generado/pagado pasan a ser los del período.
    if (!esTodo) {
      const [{ data: gen }, { data: pag }] = await Promise.all([
        liquidacionApi.generadoPorRango(desde, hasta),
        liquidacionApi.pagosPorRango(desde, hasta),
      ])

      const porBarbero = (filas, campo) =>
        (filas || []).reduce((acc, f) => {
          acc[f.barbero_id] = (acc[f.barbero_id] || 0) + Number(f[campo] || 0)
          return acc
        }, {})

      const genMap = porBarbero(gen, 'comision_monto')
      const pagMap = porBarbero(pag, 'monto')

      out = out.map((b) => ({
        ...b,
        generado: genMap[b.barbero_id] || 0,
        pagadoPeriodo: pagMap[b.barbero_id] || 0,
      }))
    }

    setFilas(out)
    setCargando(false)
  }, [esTodo, desde, hasta])

  useEffect(() => {
    cargar()
  }, [cargar])

  const navegar = (dir) => {
    if (esTodo) return
    if (periodo === 'mes') {
      const d = new Date(refFecha + 'T00:00:00')
      d.setMonth(d.getMonth() + dir)
      setRefFecha(aISOLocal(d))
    } else {
      setRefFecha(sumarDias(refFecha, dir * (periodo === 'quincena' ? 14 : 7)))
    }
  }

  const totalGenerado = filas.reduce((s, f) => s + Number(f.generado), 0)
  const totalPagado = filas.reduce((s, f) => s + Number(f.pagadoPeriodo), 0)
  const totalPendiente = filas.reduce((s, f) => s + Number(f.pendiente), 0)

  const exportar = () => {
    const lp = etiquetaPeriodo.toLowerCase()
    const columnas = [
      { key: 'barbero', label: 'Barbero' },
      { key: 'generado', label: `Generado ${lp} (S/)` },
      { key: 'pagado', label: `Pagado ${lp} (S/)` },
      { key: 'pendiente', label: 'Pendiente total (S/)' },
    ]
    const rows = filas.map((f) => ({
      barbero: f.nombre,
      generado: Number(f.generado).toFixed(2),
      pagado: Number(f.pagadoPeriodo).toFixed(2),
      pendiente: Number(f.pendiente).toFixed(2),
    }))
    descargarCSV(`liquidacion-${esTodo ? 'historico' : `${desde}_a_${hasta}`}.csv`, columnas, rows)
    toast.exito('Archivo descargado')
  }

  return (
    <div className="space-y-6">
      <EncabezadoVista
        titulo="Liquidación"
        descripcion={
          esTodo
            ? 'Comisiones acumuladas (todo el histórico)'
            : `${etiquetaPeriodo}: ${fmtFecha(desde)} — ${fmtFecha(hasta)}`
        }
        acciones={
          <>
            <Segmentado
              ariaLabel="Período de liquidación"
              valor={periodo}
              onChange={setPeriodo}
              opciones={PERIODOS}
            />
            {!esTodo && (
              <div className="flex items-center gap-1">
                <Boton variante="ghost" tamano="icono" onClick={() => navegar(-1)} title="Período anterior">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Boton>
                <Boton variante="ghost" tamano="sm" onClick={() => setRefFecha(hoyISO())}>
                  Hoy
                </Boton>
                <Boton variante="ghost" tamano="icono" onClick={() => navegar(1)} title="Período siguiente">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Boton>
              </div>
            )}
            <Boton variante="ghost" onClick={exportar} disabled={!filas.length}>
              Exportar
            </Boton>
          </>
        }
      />

      <div className="escalonar grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard titulo={`Generado (${etiquetaPeriodo.toLowerCase()})`} valor={totalGenerado} />
        <StatCard titulo={`Pagado (${etiquetaPeriodo.toLowerCase()})`} valor={totalPagado} />
        <StatCard
          titulo="Pendiente total"
          valor={totalPendiente}
          sub="Acumulado de todo el histórico"
          acento
        />
      </div>

      <Aparecer>
        <Panel className="overflow-hidden">
          <Panel.Cabecera
            titulo="Comisiones por barbero"
            descripcion="El pendiente es el saldo real acumulado, no solo el del período"
          />

          {cargando ? (
            <EsqueletoTabla filas={5} columnas={5} />
          ) : (
            <Tabla minAncho="680px">
              <Tabla.Cabecera pegajosa>
                <tr>
                  <th>Barbero</th>
                  <th className="text-right">Generado ({etiquetaPeriodo.toLowerCase()})</th>
                  <th className="text-right">Pagado ({etiquetaPeriodo.toLowerCase()})</th>
                  <th className="text-right">Pendiente total</th>
                  <th className="text-right">Acción</th>
                </tr>
              </Tabla.Cabecera>
              <Tabla.Cuerpo>
                {filas.map((f) => (
                  <tr key={f.barbero_id} className={f.activo ? '' : 'opacity-60'}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-800 text-[11px] font-bold text-ink-300">
                          {iniciales(f.nombre)}
                        </span>
                        <span className="font-medium text-white">{f.nombre}</span>
                        {!f.activo && <Badge tono="neutro">inactivo</Badge>}
                      </div>
                    </td>
                    <td className="cifras text-right text-ink-300">{fmtMoneda(f.generado)}</td>
                    <td className="cifras text-right text-ink-400">{fmtMoneda(f.pagadoPeriodo)}</td>
                    <td
                      className={`cifras text-right font-semibold ${
                        Number(f.pendiente) > 0 ? 'text-marca-400' : 'text-exito'
                      }`}
                    >
                      {fmtMoneda(f.pendiente)}
                    </td>
                    <td className="text-right">
                      <Boton variante="marca" tamano="sm" onClick={() => setPagando(f)}>
                        Pagar
                      </Boton>
                    </td>
                  </tr>
                ))}
              </Tabla.Cuerpo>
            </Tabla>
          )}
        </Panel>
      </Aparecer>

      {pagando && (
        <PagoComisionModal
          barbero={pagando}
          etiquetaPeriodo={etiquetaPeriodo}
          rango={esTodo ? null : { desde, hasta }}
          usuarioId={usuario.id}
          onClose={() => setPagando(null)}
          onDone={(monto) => {
            setPagando(null)
            toast.exito('Pago registrado', { detalle: fmtMoneda(monto) })
            cargar()
          }}
        />
      )}
    </div>
  )
}
