import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useMisComisiones } from './useMisComisiones'
import {
  EncabezadoVista,
  StatCard,
  Panel,
  Boton,
  PeriodoSelector,
  Aparecer,
  EstadoVacio,
  EsqueletoTarjetas,
  EsqueletoTexto,
  Columnas,
  BarrasHorizontales,
  useToast,
} from '@/shared/ui'
import { descargarCSV } from '@/shared/lib/exportar'
import { fmtMoneda, fmtFecha, fmtFechaCorta, hoyISO } from '@/shared/lib/format'

export default function MisComisiones() {
  const { usuario, perfil } = useAuth()
  const toast = useToast()
  const [periodo, setPeriodo] = useState('semana')
  const [refFecha, setRefFecha] = useState(hoyISO())

  const {
    desde,
    hasta,
    cargando,
    ventas,
    totalComision,
    totalPropinas,
    totalVendido,
    totalServicios,
    porDia,
    porServicio,
  } = useMisComisiones(periodo, refFecha, usuario?.id)

  const esDia = periodo === 'dia'

  const exportar = () => {
    const columnas = [
      { key: 'fecha', label: 'Fecha' },
      { key: 'detalle', label: 'Detalle' },
      { key: 'monto', label: 'Monto (S/)' },
      { key: 'comision', label: 'Mi comisión (S/)' },
    ]
    const filas = ventas.map((v) => ({
      fecha: v.fecha,
      detalle: v.servicio?.nombre || v.producto?.nombre || 'Servicio',
      monto: Number(v.monto).toFixed(2),
      comision: Number(v.comision_monto || 0).toFixed(2),
    }))
    descargarCSV(`mis-comisiones-${desde}_a_${hasta}.csv`, columnas, filas)
    toast.exito('Archivo descargado')
  }

  return (
    <div className="space-y-6">
      <EncabezadoVista
        titulo="Mis comisiones"
        descripcion={esDia ? fmtFecha(desde) : `${fmtFecha(desde)} — ${fmtFecha(hasta)}`}
        acciones={
          <>
            <PeriodoSelector
              periodo={periodo}
              setPeriodo={setPeriodo}
              refFecha={refFecha}
              setRefFecha={setRefFecha}
            />
            <Boton variante="ghost" onClick={exportar} disabled={!ventas.length}>
              Exportar
            </Boton>
          </>
        }
      />

      {cargando ? (
        <EsqueletoTarjetas n={4} />
      ) : (
        <div className="escalonar grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            titulo="Mi comisión"
            valor={totalComision}
            sub={totalPropinas > 0 ? `Incluye ${fmtMoneda(totalPropinas)} de propinas` : 'Incluye propinas'}
            acento
          />
          <StatCard titulo="Servicios atendidos" valor={totalServicios} formato="entero" />
          <StatCard titulo="Total vendido" valor={totalVendido} sub="Lo que generé al local" />
          <StatCard
            titulo="Mi porcentaje"
            valor={`${perfil?.porcentaje_comision ?? '—'}%`}
            formato="crudo"
            sub="Sobre cada servicio"
          />
        </div>
      )}

      {/* Evolución diaria */}
      {!esDia && (
        <Aparecer>
          <Panel>
            <Panel.Cabecera titulo="Comisión por día" descripcion="Cómo se reparte el período" />
            <Panel.Cuerpo>
              {cargando ? (
                <div className="esqueleto h-40" />
              ) : porDia.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-500">
                  Sin comisiones en el período.
                </p>
              ) : (
                <Columnas
                  datos={porDia.map((d) => ({
                    etiqueta: d.fecha.slice(8, 10),
                    etiquetaLarga: fmtFechaCorta(d.fecha),
                    valor: d.comision,
                  }))}
                />
              )}
            </Panel.Cuerpo>
          </Panel>
        </Aparecer>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Aparecer>
          <Panel className="h-full">
            <Panel.Cabecera titulo="Mis servicios más hechos" />
            <Panel.Cuerpo>
              {cargando ? (
                <EsqueletoTexto lineas={5} />
              ) : (
                <BarrasHorizontales
                  datos={porServicio.slice(0, 8).map((s) => ({
                    etiqueta: `${s.nombre} · ${s.cantidad}×`,
                    valor: s.comision,
                  }))}
                  vacio="Sin servicios en el período."
                />
              )}
            </Panel.Cuerpo>
          </Panel>
        </Aparecer>

        <Aparecer retardo={80}>
          <Panel className="h-full">
            <Panel.Cabecera
              titulo="Detalle"
              descripcion={`${ventas.length} ${ventas.length === 1 ? 'registro' : 'registros'}`}
            />
            <Panel.Cuerpo>
              {cargando ? (
                <EsqueletoTexto lineas={6} />
              ) : ventas.length === 0 ? (
                <EstadoVacio
                  titulo="Sin ventas en el período"
                  mensaje="Prueba con otro rango de fechas."
                  className="py-8"
                />
              ) : (
                <ul className="escalonar max-h-80 space-y-2 overflow-y-auto pr-1">
                  {ventas.map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-3 rounded-lg border
                                 border-ink-800 bg-ink-950/40 px-3.5 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-ink-100">
                          {v.servicio?.nombre ||
                            v.producto?.nombre ||
                            (v.tipo === 'producto' ? 'Producto' : 'Servicio')}
                        </p>
                        <p className="text-xs text-ink-500">
                          {fmtFecha(v.fecha)} · {fmtMoneda(v.monto)}
                        </p>
                      </div>
                      <span className="cifras shrink-0 font-semibold text-marca-400">
                        {Number(v.comision_monto) > 0 ? fmtMoneda(v.comision_monto) : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel.Cuerpo>
          </Panel>
        </Aparecer>
      </div>
    </div>
  )
}
