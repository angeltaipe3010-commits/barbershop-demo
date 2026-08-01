import { useCallback, useEffect, useMemo, useState } from 'react'
import { ventasApi } from '@/services/api'
import { hoyISO } from '@/shared/lib/format'
import { rangoDe } from '@/shared/lib/periodos'

/**
 * Reporte de ventas agregado para un período (día / semana / mes).
 * Desglosa por turno, barbero, servicio, producto y día.
 * Los agregados se memorizan: recalcular sobre miles de filas en cada render
 * se nota en el móvil del local.
 */
export function useReporte(periodo = 'dia', refISO = hoyISO()) {
  const [ventas, setVentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const { desde, hasta } = rangoDe(periodo, refISO)

  const cargar = useCallback(async () => {
    setCargando(true)
    const { data } = await ventasApi.porRango(desde, hasta)
    setVentas(data || [])
    setCargando(false)
  }, [desde, hasta])

  useEffect(() => {
    cargar()
  }, [cargar])

  const agregados = useMemo(() => {
    const totalIngresos = ventas.reduce((s, v) => s + Number(v.monto), 0)
    const totalComisiones = ventas.reduce((s, v) => s + Number(v.comision_monto), 0)
    const totalPropinas = ventas.reduce((s, v) => s + Number(v.propina || 0), 0)

    const porTurno = {
      manana: ventas.filter((v) => v.turno === 'manana').reduce((s, v) => s + Number(v.monto), 0),
      tarde_noche: ventas
        .filter((v) => v.turno === 'tarde_noche')
        .reduce((s, v) => s + Number(v.monto), 0),
    }

    const porBarbero = Object.values(
      ventas.reduce((acc, v) => {
        const nombre = v.barbero?.nombre || 'Sin asignar'
        acc[nombre] ??= { nombre, ingresos: 0, comision: 0, servicios: 0 }
        acc[nombre].ingresos += Number(v.monto)
        acc[nombre].comision += Number(v.comision_monto)
        acc[nombre].servicios += 1
        return acc
      }, {}),
    ).sort((a, b) => b.ingresos - a.ingresos)

    const porServicio = Object.values(
      ventas
        .filter((v) => v.tipo !== 'producto')
        .reduce((acc, v) => {
          const nombre = v.servicio?.nombre || 'Servicio'
          acc[nombre] ??= { nombre, cantidad: 0, ingresos: 0 }
          acc[nombre].cantidad += 1
          acc[nombre].ingresos += Number(v.monto)
          return acc
        }, {}),
    ).sort((a, b) => b.cantidad - a.cantidad)

    const porProducto = Object.values(
      ventas
        .filter((v) => v.tipo === 'producto')
        .reduce((acc, v) => {
          const nombre = v.producto?.nombre || 'Producto'
          acc[nombre] ??= { nombre, cantidad: 0, ingresos: 0 }
          acc[nombre].cantidad += Number(v.cantidad || 1)
          acc[nombre].ingresos += Number(v.monto)
          return acc
        }, {}),
    ).sort((a, b) => b.cantidad - a.cantidad)

    const porDia = Object.values(
      ventas.reduce((acc, v) => {
        acc[v.fecha] ??= { fecha: v.fecha, ingresos: 0 }
        acc[v.fecha].ingresos += Number(v.monto)
        return acc
      }, {}),
    ).sort((a, b) => a.fecha.localeCompare(b.fecha))

    return {
      totalIngresos,
      totalComisiones,
      totalPropinas,
      porTurno,
      porBarbero,
      porServicio,
      porProducto,
      porDia,
    }
  }, [ventas])

  return {
    desde,
    hasta,
    ventas,
    cargando,
    ...agregados,
    numVentas: ventas.length,
    recargar: cargar,
  }
}
