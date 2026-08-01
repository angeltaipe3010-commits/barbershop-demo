import { useCallback, useEffect, useState } from 'react'
import { citasApi } from '@/services/api'
import { hoyISO } from '@/shared/lib/format'

/**
 * Agenda de citas de un día. Con `barberoId` filtra por barbero (en el panel
 * del barbero coincide con su propio id; la RLS lo refuerza en la base).
 */
export function useCitas({ fecha = hoyISO(), barberoId = null } = {}) {
  const [citas, setCitas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    const { data, error } = await citasApi.delDia(fecha, barberoId)
    if (error) setError(error.message)
    else setCitas(data || [])
    setCargando(false)
  }, [fecha, barberoId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const cambiarEstado = async (id, estado) => {
    // Optimista: la tarjeta responde al instante y se confirma con el servidor.
    const previas = citas
    setCitas((cs) => cs.map((c) => (c.id === id ? { ...c, estado } : c)))

    const { error } = await citasApi.cambiarEstado(id, estado)
    if (error) {
      setCitas(previas) // revertir
      return { error }
    }
    // Recargar: al completar, el trigger puede haber generado venta y comisión.
    await cargar()
    return { ok: true }
  }

  return { citas, cargando, error, recargar: cargar, cambiarEstado }
}
