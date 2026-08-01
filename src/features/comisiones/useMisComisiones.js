import { useCallback, useEffect, useMemo, useState } from 'react'
import { ventasApi } from '@/services/api'
import { hoyISO, sumarDias } from '@/shared/lib/format'
import { rangoDe } from '@/shared/lib/periodos'

/**
 * Comisiones del barbero en un período. Se filtra por su id y, además, la RLS
 * garantiza que un barbero solo vea sus propias ventas.
 */
export function useMisComisiones(periodo = 'dia', refISO = hoyISO(), barberoId = null) {
  const { desde, hasta } = rangoDe(periodo, refISO)
  const [ventas, setVentas] = useState([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    if (!barberoId) return
    setCargando(true)
    const { data } = await ventasApi.porRango(desde, hasta, barberoId)
    setVentas(data || [])
    setCargando(false)
  }, [desde, hasta, barberoId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const datos = useMemo(() => {
    const totalComision = ventas.reduce((s, v) => s + Number(v.comision_monto || 0), 0)
    const totalPropinas = ventas.reduce((s, v) => s + Number(v.propina || 0), 0)
    const totalVendido = ventas.reduce((s, v) => s + Number(v.monto || 0), 0)
    const totalServicios = ventas.filter((v) => v.tipo !== 'producto').length

    const porDia = Object.values(
      ventas.reduce((acc, v) => {
        acc[v.fecha] ??= { fecha: v.fecha, comision: 0 }
        acc[v.fecha].comision += Number(v.comision_monto || 0)
        return acc
      }, {}),
    ).sort((a, b) => a.fecha.localeCompare(b.fecha))

    const porServicio = Object.values(
      ventas
        .filter((v) => v.tipo !== 'producto')
        .reduce((acc, v) => {
          const n = v.servicio?.nombre || 'Servicio'
          acc[n] ??= { nombre: n, cantidad: 0, comision: 0 }
          acc[n].cantidad += 1
          acc[n].comision += Number(v.comision_monto || 0)
          return acc
        }, {}),
    ).sort((a, b) => b.cantidad - a.cantidad)

    return { totalComision, totalPropinas, totalVendido, totalServicios, porDia, porServicio }
  }, [ventas])

  return { desde, hasta, cargando, ventas, ...datos, recargar: cargar }
}

/**
 * Acumulado rápido del barbero: hoy y los últimos 7 días.
 * Alimenta las tarjetas del panel de inicio del barbero.
 */
export function useComisiones(barberoId) {
  const [hoy, setHoy] = useState({ ventas: 0, comision: 0 })
  const [semana, setSemana] = useState({ ventas: 0, comision: 0 })
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    if (!barberoId) return
    setCargando(true)
    const fecha = hoyISO()
    const [resHoy, resSemana] = await Promise.all([
      ventasApi.comisionesBarbero(barberoId, fecha, fecha),
      ventasApi.comisionesBarbero(barberoId, sumarDias(fecha, -6), fecha),
    ])
    if (resHoy.data) setHoy(resHoy.data)
    if (resSemana.data) setSemana(resSemana.data)
    setCargando(false)
  }, [barberoId])

  useEffect(() => {
    cargar()
  }, [cargar])

  return { hoy, semana, cargando, recargar: cargar }
}
