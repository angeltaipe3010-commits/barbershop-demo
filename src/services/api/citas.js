import { supabase } from '../supabase'
import { hoyISO } from '@/shared/lib/format'

// Relaciones que necesita cualquier tarjeta de cita.
const SELECT_CITA =
  '*, cliente:clientes(id, nombre, telefono), servicio:servicios(id, nombre, precio, duracion_min), barbero:usuarios_barberos(id, nombre, porcentaje_comision)'

export const citasApi = {
  // Citas de un día concreto (por defecto hoy). RLS filtra por barbero si aplica.
  delDia(fecha = hoyISO(), barberoId = null) {
    let q = supabase
      .from('citas')
      .select(SELECT_CITA)
      .gte('fecha_hora', `${fecha}T00:00:00`)
      .lte('fecha_hora', `${fecha}T23:59:59`)
      .order('fecha_hora', { ascending: true })

    if (barberoId) q = q.eq('barbero_id', barberoId)
    return q
  },

  // Próximas citas a partir de ahora (para el panel de inicio del barbero).
  proximas(barberoId = null, limite = 5) {
    let q = supabase
      .from('citas')
      .select(SELECT_CITA)
      .gte('fecha_hora', new Date().toISOString())
      .not('estado', 'in', '(completada,cancelada)')
      .order('fecha_hora', { ascending: true })
      .limit(limite)

    if (barberoId) q = q.eq('barbero_id', barberoId)
    return q
  },

  crear(payload) {
    return supabase.from('citas').insert(payload).select().single()
  },

  actualizar(id, payload) {
    return supabase.from('citas').update(payload).eq('id', id).select().single()
  },

  // ¿El barbero ya tiene una cita que se solape con el horario propuesto?
  async hayConflicto(barberoId, inicioISO, duracionMin = 30, excluirId = null) {
    const inicio = new Date(inicioISO)
    const fin = new Date(inicio.getTime() + duracionMin * 60000)
    const dia = inicio.toISOString().slice(0, 10)

    let q = supabase
      .from('citas')
      .select('id, fecha_hora, servicio:servicios(duracion_min)')
      .eq('barbero_id', barberoId)
      .neq('estado', 'cancelada')
      .gte('fecha_hora', `${dia}T00:00:00`)
      .lte('fecha_hora', `${dia}T23:59:59`)
    if (excluirId) q = q.neq('id', excluirId)

    const { data } = await q
    return (data || []).some((c) => {
      const cI = new Date(c.fecha_hora)
      const cF = new Date(cI.getTime() + (c.servicio?.duracion_min || 30) * 60000)
      return inicio < cF && cI < fin // se solapan
    })
  },

  // Cambia el estado; al pasar a 'completada' el trigger registra la venta
  // (solo si no se registró antes vía cobro).
  cambiarEstado(id, estado) {
    return supabase.from('citas').update({ estado }).eq('id', id).select().single()
  },
}
