import { supabase } from '../supabase'
import { hoyISO } from '@/shared/lib/format'

const METODOS = ['efectivo', 'yape', 'plin', 'tarjeta', 'transferencia']

// ---- Caja diaria -----------------------------------------------------------
export const cajaApi = {
  // Sesión de caja abierta (o null).
  async abierta() {
    const { data } = await supabase
      .from('caja_sesiones')
      .select('*, abierta:usuarios_barberos!caja_sesiones_abierta_por_fkey(nombre)')
      .eq('estado', 'abierta')
      .maybeSingle()
    return data
  },

  async idAbierta() {
    const s = await this.abierta()
    return s?.id ?? null
  },

  abrir({ monto_inicial, abierta_por }) {
    return supabase
      .from('caja_sesiones')
      .insert({ monto_inicial: Number(monto_inicial) || 0, abierta_por })
      .select()
      .single()
  },

  cerrar(id, { monto_final_contado, efectivo_esperado, diferencia, cerrada_por, notas }) {
    return supabase
      .from('caja_sesiones')
      .update({
        estado: 'cerrada',
        monto_final_contado: Number(monto_final_contado) || 0,
        efectivo_esperado: efectivo_esperado != null ? Number(efectivo_esperado) : null,
        diferencia: diferencia != null ? Number(diferencia) : null,
        cerrada_por,
        notas: notas || null,
        cerrada_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
  },

  // Movimientos (ventas + gastos) de una sesión, para el arqueo.
  async resumen(sesionId) {
    const [{ data: ventas }, { data: gastos }] = await Promise.all([
      supabase.from('ventas').select('monto, propina, metodo_pago').eq('caja_sesion_id', sesionId),
      supabase.from('gastos').select('monto, metodo_pago').eq('caja_sesion_id', sesionId),
    ])

    const sumar = (arr, campo, metodo = null) =>
      (arr || [])
        .filter((x) => !metodo || x.metodo_pago === metodo)
        .reduce((s, x) => s + Number(x[campo] || 0), 0)

    const porMetodo = {}
    for (const m of METODOS) {
      porMetodo[m] = sumar(ventas, 'monto', m) + sumar(ventas, 'propina', m)
    }

    return {
      ingresos: sumar(ventas, 'monto') + sumar(ventas, 'propina'),
      ingresosEfectivo: sumar(ventas, 'monto', 'efectivo') + sumar(ventas, 'propina', 'efectivo'),
      gastos: sumar(gastos, 'monto'),
      gastosEfectivo: sumar(gastos, 'monto', 'efectivo'),
      numVentas: (ventas || []).length,
      porMetodo,
    }
  },

  historial(limite = 30) {
    return supabase
      .from('caja_sesiones')
      .select('*, abierta:usuarios_barberos!caja_sesiones_abierta_por_fkey(nombre)')
      .order('abierta_at', { ascending: false })
      .limit(limite)
  },
}

// ---- Gastos ----------------------------------------------------------------
export const gastosApi = {
  porFecha(fecha = hoyISO()) {
    return supabase
      .from('gastos')
      .select('*, registrado:usuarios_barberos(nombre)')
      .eq('fecha', fecha)
      .order('created_at', { ascending: false })
  },

  porRango(desde, hasta) {
    return supabase
      .from('gastos')
      .select('*')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
  },

  async crear(payload) {
    // Enlaza el gasto a la caja abierta para que aparezca en su arqueo.
    const cajaId = await cajaApi.idAbierta()
    return supabase.from('gastos').insert({ ...payload, caja_sesion_id: cajaId }).select().single()
  },

  eliminar(id) {
    return supabase.from('gastos').delete().eq('id', id)
  },
}
