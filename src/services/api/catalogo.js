import { supabase } from '../supabase'

// ---- Servicios -------------------------------------------------------------
export const serviciosApi = {
  listar() {
    return supabase.from('servicios').select('*').order('nombre')
  },
  activos() {
    return supabase.from('servicios').select('*').eq('activo', true).order('nombre')
  },
  crear(payload) {
    return supabase.from('servicios').insert(payload).select().single()
  },
  actualizar(id, payload) {
    return supabase.from('servicios').update(payload).eq('id', id).select().single()
  },
  eliminar(id) {
    return supabase.from('servicios').delete().eq('id', id)
  },
}

// ---- Inventario ------------------------------------------------------------
export const inventarioApi = {
  listar() {
    return supabase.from('productos_inventario').select('*').order('nombre')
  },
  stockBajo() {
    return supabase.from('productos_stock_bajo').select('*')
  },
  // El trigger de la BD ajusta el stock automáticamente al insertar.
  registrarMovimiento(payload) {
    return supabase.from('movimientos_inventario').insert(payload).select().single()
  },
  movimientos(productoId, limite = 20) {
    return supabase
      .from('movimientos_inventario')
      .select('*, barbero:usuarios_barberos(nombre)')
      .eq('producto_id', productoId)
      .order('created_at', { ascending: false })
      .limit(limite)
  },
  crearProducto(payload) {
    return supabase.from('productos_inventario').insert(payload).select().single()
  },
  actualizarProducto(id, payload) {
    return supabase.from('productos_inventario').update(payload).eq('id', id).select().single()
  },
  eliminarProducto(id) {
    return supabase.from('productos_inventario').delete().eq('id', id)
  },
}

// ---- Storage (fotos) -------------------------------------------------------
export const fotosApi = {
  // Sube un archivo al bucket "fotos" y devuelve su URL pública.
  async subir(file, carpeta = 'general') {
    const ext = file.name.split('.').pop()
    const ruta = `${carpeta}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('fotos').upload(ruta, file, { upsert: true })
    if (error) return { error }
    const { data } = supabase.storage.from('fotos').getPublicUrl(ruta)
    return { url: data.publicUrl }
  },
}
