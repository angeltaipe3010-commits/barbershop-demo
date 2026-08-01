import { supabase } from '../supabase'

export const clientesApi = {
  listar() {
    return supabase.from('clientes').select('*').order('nombre')
  },
  crear(payload) {
    return supabase.from('clientes').insert(payload).select().single()
  },
  actualizar(id, payload) {
    return supabase.from('clientes').update(payload).eq('id', id).select().single()
  },
  eliminar(id) {
    return supabase.from('clientes').delete().eq('id', id)
  },
  // Historial de visitas (ventas) de un cliente.
  historial(clienteId) {
    return supabase
      .from('ventas')
      .select('*, servicio:servicios(nombre), producto:productos_inventario(nombre), barbero:usuarios_barberos(nombre)')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false })
  },
}
