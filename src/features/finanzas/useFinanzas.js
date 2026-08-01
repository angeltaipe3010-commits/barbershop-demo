import { useCallback, useEffect, useMemo, useState } from 'react'
import { ventasApi, gastosApi } from '@/services/api'
import { hoyISO } from '@/shared/lib/format'
import { rangoDe } from '@/shared/lib/periodos'

export const METODOS = ['efectivo', 'yape', 'plin', 'tarjeta', 'transferencia']

/**
 * Consolida el dinero del negocio en un período: ingresos y gastos por método
 * de pago, saldo neto en efectivo vs plataformas, y gastos por categoría.
 */
export function useFinanzas(periodo = 'dia', refISO = hoyISO()) {
  const { desde, hasta } = rangoDe(periodo, refISO)
  const [ventas, setVentas] = useState([])
  const [gastos, setGastos] = useState([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    const [{ data: v }, { data: g }] = await Promise.all([
      ventasApi.porRango(desde, hasta),
      gastosApi.porRango(desde, hasta),
    ])
    setVentas(v || [])
    setGastos(g || [])
    setCargando(false)
  }, [desde, hasta])

  useEffect(() => {
    cargar()
  }, [cargar])

  const datos = useMemo(() => {
    const sum = (arr, campo, metodo) =>
      arr
        .filter((x) => !metodo || x.metodo_pago === metodo)
        .reduce((s, x) => s + Number(x[campo] || 0), 0)

    // Ingresos = monto + propina (lo que efectivamente entró por cada método).
    const porMetodo = METODOS.map((m) => {
      const ingresos = sum(ventas, 'monto', m) + sum(ventas, 'propina', m)
      const egresos = sum(gastos, 'monto', m)
      return { metodo: m, ingresos, egresos, neto: ingresos - egresos }
    })

    const efectivo = porMetodo.find((x) => x.metodo === 'efectivo')
    const totalDigitalNeto = porMetodo
      .filter((x) => x.metodo !== 'efectivo')
      .reduce((s, x) => s + x.neto, 0)
    const totalIngresos = sum(ventas, 'monto') + sum(ventas, 'propina')
    const totalGastos = sum(gastos, 'monto')

    const porCategoria = Object.values(
      gastos.reduce((acc, g) => {
        const c = g.categoria || 'Sin categoría'
        acc[c] ??= { categoria: c, monto: 0, n: 0 }
        acc[c].monto += Number(g.monto)
        acc[c].n += 1
        return acc
      }, {}),
    ).sort((a, b) => b.monto - a.monto)

    return {
      porMetodo,
      efectivoNeto: efectivo?.neto || 0,
      totalDigitalNeto,
      totalIngresos,
      totalGastos,
      utilidad: totalIngresos - totalGastos,
      porCategoria,
    }
  }, [ventas, gastos])

  return { desde, hasta, cargando, ...datos, recargar: cargar }
}
