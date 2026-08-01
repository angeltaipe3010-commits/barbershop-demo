import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { cajaApi } from '@/services/api'
import ArqueoCaja from './ArqueoCaja'
import {
  EncabezadoVista,
  Panel,
  StatCard,
  Tabla,
  Badge,
  PuntoVivo,
  Boton,
  Campo,
  Input,
  Aparecer,
  EstadoVacio,
  EsqueletoTarjetas,
  BarraApilada,
  useToast,
} from '@/shared/ui'
import { fmtMoneda, fmtFecha, fmtHora, METODOS_PAGO } from '@/shared/lib/format'

export default function Caja() {
  const { usuario } = useAuth()
  const toast = useToast()

  const [sesion, setSesion] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  const [montoInicial, setMontoInicial] = useState('')
  const [abriendo, setAbriendo] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    const s = await cajaApi.abierta()
    setSesion(s)
    setResumen(s ? await cajaApi.resumen(s.id) : null)
    const { data } = await cajaApi.historial()
    setHistorial(data || [])
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const abrir = async (e) => {
    e.preventDefault()
    setAbriendo(true)
    const { error } = await cajaApi.abrir({
      monto_inicial: montoInicial,
      abierta_por: usuario.id,
    })
    setAbriendo(false)
    if (error) return toast.error('No se pudo abrir la caja', { detalle: error.message })
    toast.exito('Caja abierta', { detalle: `Fondo inicial ${fmtMoneda(montoInicial || 0)}` })
    setMontoInicial('')
    await cargar()
  }

  const efectivoEsperado =
    sesion && resumen
      ? Number(sesion.monto_inicial) + resumen.ingresosEfectivo - resumen.gastosEfectivo
      : 0

  return (
    <div className="space-y-6">
      <EncabezadoVista
        titulo="Caja diaria"
        descripcion="Apertura, arqueo y cierre del efectivo"
      />

      {cargando ? (
        <EsqueletoTarjetas n={4} />
      ) : !sesion ? (
        <AbrirCaja
          montoInicial={montoInicial}
          setMontoInicial={setMontoInicial}
          onAbrir={abrir}
          abriendo={abriendo}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tono="exito">
              <PuntoVivo />
              Caja abierta
            </Badge>
            <span className="text-ink-400">
              desde las {fmtHora(sesion.abierta_at)} · por {sesion.abierta?.nombre || '—'}
            </span>
          </div>

          <div className="escalonar grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard titulo="Fondo inicial" valor={Number(sesion.monto_inicial)} acento />
            <StatCard
              titulo="Ingresos"
              valor={resumen.ingresos}
              sub={`${resumen.numVentas} ${resumen.numVentas === 1 ? 'venta' : 'ventas'}`}
            />
            <StatCard titulo="Gastos" valor={resumen.gastos} />
            <StatCard
              titulo="Efectivo esperado"
              valor={efectivoEsperado}
              sub="Fondo + ventas efectivo − gastos efectivo"
            />
          </div>

          <Aparecer>
            <Panel>
              <Panel.Cabecera
                titulo="Ingresos por método de pago"
                descripcion="En la caja física solo se cuenta el efectivo"
              />
              <Panel.Cuerpo>
                <BarraApilada
                  segmentos={Object.entries(resumen.porMetodo || {})
                    .filter(([, monto]) => monto > 0)
                    .map(([metodo, monto]) => ({
                      etiqueta: METODOS_PAGO[metodo]?.label || metodo,
                      valor: monto,
                      color: METODOS_PAGO[metodo]?.color || 'bg-ink-600',
                    }))}
                />
                <p className="mt-4 rounded-lg border border-ink-800 bg-ink-950/50 px-3.5 py-2.5 text-xs text-ink-500">
                  Yape, Plin, tarjeta y transferencia ya están en tus cuentas digitales: no forman
                  parte del arqueo físico.
                </p>
              </Panel.Cuerpo>
            </Panel>
          </Aparecer>

          <Aparecer retardo={80}>
            <ArqueoCaja
              sesion={sesion}
              efectivoEsperado={efectivoEsperado}
              usuarioId={usuario.id}
              onCerrada={async (diferencia) => {
                toast.exito('Caja cerrada', {
                  detalle:
                    diferencia === 0
                      ? 'El arqueo cuadró exacto'
                      : `${diferencia > 0 ? 'Sobrante' : 'Faltante'} de ${fmtMoneda(Math.abs(diferencia))}`,
                })
                await cargar()
              }}
            />
          </Aparecer>
        </>
      )}

      {/* Historial */}
      <Aparecer retardo={140}>
        <Panel className="overflow-hidden">
          <Panel.Cabecera titulo="Historial de cajas" descripcion="Últimas 30 sesiones" />

          {historial.length === 0 ? (
            <EstadoVacio
              titulo="Sin sesiones registradas"
              mensaje="Al cerrar la primera caja aparecerá aquí su arqueo."
            />
          ) : (
            <Tabla minAncho="720px">
              <Tabla.Cabecera>
                <tr>
                  <th>Fecha</th>
                  <th>Abierta por</th>
                  <th className="text-right">Inicial</th>
                  <th className="text-right">Contado</th>
                  <th className="text-right">Diferencia</th>
                  <th className="text-center">Estado</th>
                </tr>
              </Tabla.Cabecera>
              <Tabla.Cuerpo>
                {historial.map((h) => (
                  <tr key={h.id}>
                    <td className="whitespace-nowrap text-ink-300">{fmtFecha(h.abierta_at)}</td>
                    <td className="text-ink-400">{h.abierta?.nombre || '—'}</td>
                    <td className="cifras text-right">{fmtMoneda(h.monto_inicial)}</td>
                    <td className="cifras text-right">
                      {h.monto_final_contado != null ? fmtMoneda(h.monto_final_contado) : '—'}
                    </td>
                    <td className="text-right">
                      <Diferencia valor={h.diferencia} />
                    </td>
                    <td className="text-center">
                      <Badge tono={h.estado === 'abierta' ? 'exito' : 'neutro'} className="capitalize">
                        {h.estado}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </Tabla.Cuerpo>
            </Tabla>
          )}
        </Panel>
      </Aparecer>
    </div>
  )
}

// Descuadre del cierre: signo y color dicen si sobró o faltó.
function Diferencia({ valor }) {
  if (valor == null) return <span className="text-ink-600">—</span>

  const n = Number(valor)
  if (n === 0) return <span className="cifras text-exito">✓ {fmtMoneda(0)}</span>

  return (
    <span className={`cifras font-medium ${n > 0 ? 'text-info' : 'text-peligro'}`}>
      {n > 0 ? '+' : '−'}
      {fmtMoneda(Math.abs(n))}
    </span>
  )
}

// Estado inicial: la caja del día todavía no se abrió.
function AbrirCaja({ montoInicial, setMontoInicial, onAbrir, abriendo }) {
  return (
    <Aparecer>
      <Panel className="max-w-md overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 barber-accent" aria-hidden="true" />
        <Panel.Cabecera
          titulo="Abrir caja"
          descripcion="Registra el efectivo con el que empieza el día"
        />
        <Panel.Cuerpo>
          <form onSubmit={onAbrir} className="space-y-4">
            <Campo
              etiqueta="Fondo inicial en efectivo (S/)"
              ayuda="El sencillo que dejas para dar vuelto."
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  type="number"
                  min="0"
                  step="0.10"
                  inputMode="decimal"
                  autoFocus
                  value={montoInicial}
                  onChange={(e) => setMontoInicial(e.target.value)}
                  placeholder="0.00"
                />
              )}
            </Campo>
            <Boton variante="marca" type="submit" cargando={abriendo} className="w-full">
              Abrir caja
            </Boton>
          </form>
        </Panel.Cuerpo>
      </Panel>
    </Aparecer>
  )
}
