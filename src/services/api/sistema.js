import { supabase } from '../supabase'
import { aISOLocal } from '@/shared/lib/format'

// ---- Configuración del negocio ---------------------------------------------
export const configApi = {
  async obtener() {
    const { data } = await supabase.from('configuracion').select('*').eq('id', 1).maybeSingle()
    return data
  },
  actualizar(payload) {
    return supabase
      .from('configuracion')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single()
  },
}

// ---- Datos: limpiar, respaldar y sembrar demo (solo admin) -----------------
const ZERO_UUID = '00000000-0000-0000-0000-000000000000'

// Orden de borrado: de las tablas que referencian hacia las referenciadas.
const TABLAS_OPERATIVAS = [
  'ventas',
  'gastos',
  'pagos_comision',
  'movimientos_inventario',
  'citas',
  'caja_sesiones',
  'clientes',
  'servicios',
  'productos_inventario',
]

const TABLAS_RESPALDO = [
  'configuracion',
  'usuarios_barberos',
  'clientes',
  'servicios',
  'productos_inventario',
  'movimientos_inventario',
  'citas',
  'ventas',
  'gastos',
  'caja_sesiones',
  'pagos_comision',
]

const elegir = (arr) => arr[Math.floor(Math.random() * arr.length)]
const entre = (min, max) => min + Math.floor(Math.random() * (max - min + 1))

// Catálogo base de la demo (precios referenciales de Perú, en Soles).
const SERVICIOS_DEMO = [
  { nombre: 'Corte Clásico', categoria: 'corte', precio: 25, duracion_min: 30, peso: 30 },
  { nombre: 'Taper Fade', categoria: 'corte', precio: 30, duracion_min: 35, peso: 22 },
  { nombre: 'Corte + Barba', categoria: 'combo', precio: 40, duracion_min: 50, peso: 18 },
  { nombre: 'Afeitado a Navaja', categoria: 'barba', precio: 20, duracion_min: 25, peso: 10 },
  { nombre: 'Perfilado de Barba', categoria: 'barba', precio: 18, duracion_min: 20, peso: 8 },
  { nombre: 'Tratamiento Capilar', categoria: 'tratamiento', precio: 35, duracion_min: 40, peso: 5 },
  { nombre: 'Corte Niño', categoria: 'corte', precio: 18, duracion_min: 25, peso: 7 },
]

const PRODUCTOS_DEMO = [
  { nombre: 'Cera Mate Fijación Fuerte', tipo: 'venta', stock: 30, stock_minimo: 6, precio_venta: 28 },
  { nombre: 'Pomada Brillo Clásica', tipo: 'venta', stock: 20, stock_minimo: 6, precio_venta: 25 },
  { nombre: 'Shampoo para Barba', tipo: 'venta', stock: 18, stock_minimo: 5, precio_venta: 22 },
  { nombre: 'Aceite para Barba', tipo: 'venta', stock: 12, stock_minimo: 5, precio_venta: 30 },
  { nombre: 'Gel Fijador', tipo: 'venta', stock: 25, stock_minimo: 6, precio_venta: 15 },
  { nombre: 'Tónico Capilar', tipo: 'venta', stock: 4, stock_minimo: 6, precio_venta: 32 },
  { nombre: 'Talco Aftershave', tipo: 'interno', stock: 9, stock_minimo: 4, precio_venta: 0 },
]

const NOMBRES_DEMO = [
  'Carlos Quispe', 'Luis Mamani', 'José Huamán', 'Miguel Flores', 'Jorge Rojas',
  'Pedro Vargas', 'Andrés Castillo', 'Diego Ramírez', 'Roberto Sosa', 'Fernando Ríos',
  'Álvaro Chávez', 'Renzo Paredes', 'Bruno Ticona', 'Iván Salazar', 'Marco Ayala',
  'Gonzalo Medina', 'Sergio Cárdenas', 'Rodrigo Peña', 'Néstor Cabrera', 'Julio Zapata',
]

// Elige un servicio respetando la popularidad relativa (peso).
function servicioPonderado(servicios, pesos) {
  const total = pesos.reduce((s, p) => s + p, 0)
  let r = Math.random() * total
  for (let i = 0; i < servicios.length; i++) {
    r -= pesos[i]
    if (r <= 0) return servicios[i]
  }
  return servicios[0]
}

export const datosApi = {
  // Borra TODOS los datos operativos y de catálogo (conserva staff y config).
  async limpiarTodo() {
    for (const t of TABLAS_OPERATIVAS) {
      const { error } = await supabase.from(t).delete().neq('id', ZERO_UUID)
      if (error) return { error: `${t}: ${error.message}` }
    }
    return { ok: true }
  },

  // Respaldo completo de los datos del negocio (JSON).
  async respaldo() {
    const data = { _generado: new Date().toISOString(), _version: 2 }
    for (const t of TABLAS_RESPALDO) {
      const { data: filas, error } = await supabase.from(t).select('*')
      if (error) return { error: `${t}: ${error.message}` }
      data[t] = filas || []
    }
    return { data }
  },

  /**
   * Limpia y siembra datos de demostración realistas.
   * Genera `dias` de historial: ventas con tickets, propinas y métodos de pago
   * mezclados, gastos, cajas cerradas con su arqueo, y agenda de hoy y mañana.
   */
  async sembrarDemo({ dias = 60, onProgreso } = {}) {
    const avisar = (m) => onProgreso?.(m)

    avisar('Limpiando datos actuales…')
    const limp = await this.limpiarTodo()
    if (limp.error) return limp

    avisar('Creando catálogo…')
    const { data: serv, error: eServ } = await supabase
      .from('servicios')
      // `peso` solo sirve para la distribución local: no es columna de la tabla.
      .insert(SERVICIOS_DEMO.map(({ peso: _peso, ...s }) => s))
      .select()
    if (eServ) return { error: 'servicios: ' + eServ.message }

    const pesos = SERVICIOS_DEMO.map((s) => s.peso)

    const { data: prod, error: eProd } = await supabase
      .from('productos_inventario')
      .insert(PRODUCTOS_DEMO)
      .select()
    if (eProd) return { error: 'productos: ' + eProd.message }

    const productosVenta = (prod || []).filter((p) => p.tipo === 'venta')

    avisar('Creando clientes…')
    const { data: cli, error: eCli } = await supabase
      .from('clientes')
      .insert(
        NOMBRES_DEMO.map((nombre, i) => ({
          nombre,
          telefono: `9${String(11000000 + i * 137911).slice(0, 8)}`,
          preferencias: elegir([
            'Fade bajo, máquina 1 a los lados',
            'Tijera arriba, sin máquina',
            'Barba perfilada con navaja',
            'Corte escolar, rápido',
            null,
          ]),
        })),
      )
      .select()
    if (eCli) return { error: 'clientes: ' + eCli.message }

    const { data: barberos } = await supabase
      .from('usuarios_barberos')
      .select('id, porcentaje_comision')
      .eq('activo', true)

    if (!serv?.length || !cli?.length || !barberos?.length) {
      return { error: 'Falta catálogo o barberos activos para sembrar la demo.' }
    }

    avisar(`Generando ${dias} días de operación…`)
    const ventas = []
    const gastos = []
    const hoy = new Date()

    for (let d = dias - 1; d >= 0; d--) {
      const dia = new Date(hoy)
      dia.setDate(hoy.getDate() - d)
      const fecha = aISOLocal(dia)
      const diaSemana = dia.getDay()

      if (diaSemana === 0) continue // domingo cerrado

      // Viernes y sábado son los días fuertes de una barbería.
      const factor = diaSemana === 5 ? 1.6 : diaSemana === 6 ? 1.9 : 1
      const nAtenciones = Math.round(entre(4, 9) * factor)

      for (let i = 0; i < nAtenciones; i++) {
        const b = elegir(barberos)
        const s = servicioPonderado(serv, pesos)
        const c = elegir(cli)
        const hora = entre(9, 20)
        const turno = hora < 14 ? 'manana' : 'tarde_noche'
        const metodo = elegir([
          'efectivo', 'efectivo', 'efectivo',
          'yape', 'yape', 'yape',
          'plin', 'tarjeta', 'transferencia',
        ])
        const propina = Math.random() < 0.28 ? elegir([2, 3, 5, 5, 10]) : 0
        const descuento = Math.random() < 0.08 ? 5 : 0
        const monto = Number(s.precio)
        const ticket = crypto.randomUUID()

        ventas.push({
          barbero_id: b.id,
          cliente_id: c.id,
          servicio_id: s.id,
          tipo: 'servicio',
          cantidad: 1,
          monto,
          comision_monto: Math.round(monto * Number(b.porcentaje_comision)) / 100,
          propina,
          descuento,
          metodo_pago: metodo,
          turno,
          fecha,
          ticket_id: ticket,
        })

        // ~22% de las atenciones se lleva además un producto.
        if (productosVenta.length && Math.random() < 0.22) {
          const p = elegir(productosVenta)
          ventas.push({
            barbero_id: b.id,
            cliente_id: c.id,
            producto_id: p.id,
            tipo: 'producto',
            cantidad: 1,
            monto: Number(p.precio_venta),
            comision_monto: 0,
            propina: 0,
            descuento: 0,
            metodo_pago: metodo,
            turno,
            fecha,
            ticket_id: ticket,
          })
        }
      }

      if (Math.random() < 0.45) {
        gastos.push({
          descripcion: elegir([
            'Insumos de corte', 'Limpieza del local', 'Agua y luz',
            'Café y snacks', 'Mantenimiento de máquinas', 'Publicidad en redes',
          ]),
          categoria: 'Operación',
          monto: entre(10, 60),
          metodo_pago: elegir(['efectivo', 'efectivo', 'yape']),
          fecha,
        })
      }
    }

    // Alquiler mensual: el gasto fijo que hace realista la utilidad neta.
    for (let m = 0; m <= Math.floor(dias / 30); m++) {
      const f = new Date(hoy.getFullYear(), hoy.getMonth() - m, 1)
      gastos.push({
        descripcion: 'Alquiler del local',
        categoria: 'Fijo',
        monto: 800,
        metodo_pago: 'transferencia',
        fecha: aISOLocal(f),
      })
    }

    avisar(`Registrando ${ventas.length} ventas…`)
    for (let i = 0; i < ventas.length; i += 300) {
      const { error } = await supabase.from('ventas').insert(ventas.slice(i, i + 300))
      if (error) return { error: 'ventas: ' + error.message }
    }

    const { error: eGastos } = await supabase.from('gastos').insert(gastos)
    if (eGastos) return { error: 'gastos: ' + eGastos.message }

    // ---- Agenda: hoy y mañana con citas en distintos estados ---------------
    avisar('Armando la agenda…')
    const citas = []
    const manana = new Date(hoy)
    manana.setDate(hoy.getDate() + 1)

    for (const [offset, base] of [[0, hoy], [1, manana]]) {
      const fecha = aISOLocal(base)
      const n = offset === 0 ? 7 : 5
      for (let i = 0; i < n; i++) {
        const b = elegir(barberos)
        const s = servicioPonderado(serv, pesos)
        const c = elegir(cli)
        const hora = 9 + i * 2 - (i > 3 ? 1 : 0)
        citas.push({
          barbero_id: b.id,
          cliente_id: c.id,
          servicio_id: s.id,
          fecha_hora: `${fecha}T${String(Math.min(hora, 20)).padStart(2, '0')}:${elegir(['00', '30'])}:00-05:00`,
          estado:
            offset === 0
              ? elegir(['pendiente', 'confirmada', 'confirmada', 'en_proceso'])
              : elegir(['pendiente', 'confirmada']),
          turno: hora < 14 ? 'manana' : 'tarde_noche',
          notas: Math.random() < 0.2 ? elegir(['Cliente frecuente', 'Pidió el mismo corte', 'Viene con su hijo']) : null,
        })
      }
    }

    const { error: eCitas } = await supabase.from('citas').insert(citas)
    if (eCitas) return { error: 'citas: ' + eCitas.message }

    return { ok: true, ventas: ventas.length, gastos: gastos.length, citas: citas.length }
  },
}
