import { useCallback, useEffect, useMemo, useState } from 'react'
import { ventasApi } from '@/services/api'
import { hoyISO, sumarDias } from '@/shared/lib/format'

/**
 * Reporte del día para el panel del administrador.
 * Carga también el día anterior para poder mostrar la variación: un número
 * sin comparación no dice si el día va bien o mal.
 */
export function useReporteDiario(fecha = hoyISO()) {
  const [ventas, setVentas] = useState([])
  const [ventasAyer, setVentasAyer] = useState([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    const [{ data: hoy }, { data: ayer }] = await Promise.all([
      ventasApi.porFecha(fecha),
      ventasApi.porFecha(sumarDias(fecha, -1)),
    ])
    setVentas(hoy || [])
    setVentasAyer(ayer || [])
    setCargando(false)
  }, [fecha])

  useEffect(() => {
    cargar()
  }, [cargar])

  const datos = useMemo(() => {
    const sumar = (arr) => arr.reduce((s, v) => s + Number(v.monto), 0)

    const totalIngresos = sumar(ventas)
    const ingresosAyer = sumar(ventasAyer)
    const totalComisiones = ventas.reduce((s, v) => s + Number(v.comision_monto), 0)

    const porTurno = {
      manana: sumar(ventas.filter((v) => v.turno === 'manana')),
      tarde_noche: sumar(ventas.filter((v) => v.turno === 'tarde_noche')),
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

    // Variación vs ayer. Sin base de comparación no se muestra nada.
    const variacion = ingresosAyer > 0 ? ((totalIngresos - ingresosAyer) / ingresosAyer) * 100 : null

    return { totalIngresos, totalComisiones, ingresosAyer, variacion, porTurno, porBarbero }
  }, [ventas, ventasAyer])

  return {
    ventas,
    cargando,
    ...datos,
    numVentas: ventas.length,
    recargar: cargar,
  }
}
