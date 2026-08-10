// ----------------------------------------------------------------------------
//  Datos iniciales de la demo.
//
//  Se siembra una sola vez, la primera vez que se abre la app en el navegador.
//  El objetivo es que quien entra desde un portafolio encuentre la barbería ya
//  funcionando —dos meses de historial, agenda de hoy, inventario con un
//  producto bajo mínimos— en vez de formularios vacíos.
//
//  Es la misma forma de datos que genera `datosApi.sembrarDemo`, escrita aquí
//  aparte para no depender de la capa de API (que a su vez depende de esto).
// ----------------------------------------------------------------------------
import { enTransaccion, filas, uuid } from './motor'
import { aISOLocal } from '@/shared/lib/format'

// Ids fijos: así la demo es reproducible y se pueden citar en el README.
const ADMIN = '11111111-1111-4111-8111-111111111111'
const BARBERO_1 = '22222222-2222-4222-8222-222222222222'
const BARBERO_2 = '33333333-3333-4333-8333-333333333333'
const BARBERO_3 = '44444444-4444-4444-8444-444444444444'

export const CUENTAS_DEMO = [
  { id: ADMIN, username: 'admin', password: 'demo1234', nombre: 'Álvaro Negrete', rol: 'admin', porcentaje: 0, telefono: '987654321' },
  { id: BARBERO_1, username: 'juan', password: 'demo1234', nombre: 'Juan Pérez', rol: 'barbero', porcentaje: 45, telefono: '987111222' },
  { id: BARBERO_2, username: 'marco', password: 'demo1234', nombre: 'Marco Silva', rol: 'barbero', porcentaje: 40, telefono: '987333444' },
  { id: BARBERO_3, username: 'kevin', password: 'demo1234', nombre: 'Kevin Ramos', rol: 'barbero', porcentaje: 38, telefono: '987555666' },
]

const SERVICIOS = [
  { nombre: 'Corte Clásico', categoria: 'corte', precio: 25, duracion_min: 30, peso: 30 },
  { nombre: 'Taper Fade', categoria: 'corte', precio: 30, duracion_min: 35, peso: 22 },
  { nombre: 'Corte + Barba', categoria: 'combo', precio: 40, duracion_min: 50, peso: 18 },
  { nombre: 'Afeitado a Navaja', categoria: 'barba', precio: 20, duracion_min: 25, peso: 10 },
  { nombre: 'Perfilado de Barba', categoria: 'barba', precio: 18, duracion_min: 20, peso: 8 },
  { nombre: 'Tratamiento Capilar', categoria: 'tratamiento', precio: 35, duracion_min: 40, peso: 5 },
  { nombre: 'Corte Niño', categoria: 'corte', precio: 18, duracion_min: 25, peso: 7 },
]

const PRODUCTOS = [
  { nombre: 'Cera Mate Fijación Fuerte', tipo: 'venta', stock: 30, stock_minimo: 6, precio_venta: 28 },
  { nombre: 'Pomada Brillo Clásica', tipo: 'venta', stock: 20, stock_minimo: 6, precio_venta: 25 },
  { nombre: 'Shampoo para Barba', tipo: 'venta', stock: 18, stock_minimo: 5, precio_venta: 22 },
  { nombre: 'Aceite para Barba', tipo: 'venta', stock: 12, stock_minimo: 5, precio_venta: 30 },
  { nombre: 'Gel Fijador', tipo: 'venta', stock: 25, stock_minimo: 6, precio_venta: 15 },
  { nombre: 'Tónico Capilar', tipo: 'venta', stock: 4, stock_minimo: 6, precio_venta: 32 },
  { nombre: 'Talco Aftershave', tipo: 'interno', stock: 9, stock_minimo: 4, precio_venta: 0 },
]

const NOMBRES = [
  'Carlos Quispe', 'Luis Mamani', 'José Huamán', 'Miguel Flores', 'Jorge Rojas',
  'Pedro Vargas', 'Andrés Castillo', 'Diego Ramírez', 'Roberto Sosa', 'Fernando Ríos',
  'Álvaro Chávez', 'Renzo Paredes', 'Bruno Ticona', 'Iván Salazar', 'Marco Ayala',
  'Gonzalo Medina', 'Sergio Cárdenas', 'Rodrigo Peña', 'Néstor Cabrera', 'Julio Zapata',
]

const PREFERENCIAS = [
  'Fade bajo, máquina 1 a los lados',
  'Tijera arriba, sin máquina',
  'Barba perfilada con navaja',
  'Corte escolar, rápido',
  null,
]

const GASTOS = [
  'Insumos de corte', 'Limpieza del local', 'Agua y luz',
  'Café y snacks', 'Mantenimiento de máquinas', 'Publicidad en redes',
]

const elegir = (arr) => arr[Math.floor(Math.random() * arr.length)]
const entre = (min, max) => min + Math.floor(Math.random() * (max - min + 1))

function ponderado(items, pesos) {
  const total = pesos.reduce((s, p) => s + p, 0)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= pesos[i]
    if (r <= 0) return items[i]
  }
  return items[0]
}

/** ¿La base ya tiene datos? Evita volver a sembrar en cada recarga. */
async function yaSembrada() {
  const [{ n }] = await filas('select count(*) as n from usuarios_barberos')
  return n > 0
}

export async function sembrarSiHaceFalta() {
  if (await yaSembrada()) return false
  await sembrar()
  return true
}

async function sembrar() {
  const hoy = new Date()
  const DIAS = 60

  // Catálogo con ids resueltos por adelantado: así las ventas pueden
  // referenciarlos sin volver a consultar la base.
  const servicios = SERVICIOS.map((s) => ({ ...s, id: uuid() }))
  const productos = PRODUCTOS.map((p) => ({ ...p, id: uuid() }))
  const clientes = NOMBRES.map((nombre, i) => ({
    id: uuid(),
    nombre,
    telefono: `9${String(11000000 + i * 137911).slice(0, 8)}`,
    preferencias: elegir(PREFERENCIAS),
  }))

  const pesos = SERVICIOS.map((s) => s.peso)
  const barberos = CUENTAS_DEMO.filter((c) => c.rol === 'barbero')
  const productosVenta = productos.filter((p) => p.tipo === 'venta')

  await enTransaccion((bd) => {
    // ---- Negocio -----------------------------------------------------------
    bd.run(
      `update configuracion
          set nombre_negocio = ?, direccion = ?, telefono = ?, hora_corte_turno = 14
        where id = 1`,
      ['Demo Barbershop', 'Av. Ejército 512, Arequipa', '(054) 25-4180'],
    )

    // ---- Staff y credenciales ---------------------------------------------
    for (const c of CUENTAS_DEMO) {
      bd.run(
        `insert into usuarios_barberos (id, username, nombre, telefono, rol, porcentaje_comision, activo)
         values (?, ?, ?, ?, ?, ?, 1)`,
        [c.id, c.username, c.nombre, c.telefono, c.rol, c.porcentaje],
      )
      bd.run('insert into demo_credenciales (id, username, password) values (?, ?, ?)', [
        c.id,
        c.username,
        c.password,
      ])
    }

    // ---- Catálogo ----------------------------------------------------------
    for (const s of servicios) {
      bd.run(
        'insert into servicios (id, nombre, categoria, precio, duracion_min, activo) values (?,?,?,?,?,1)',
        [s.id, s.nombre, s.categoria, s.precio, s.duracion_min],
      )
    }
    for (const p of productos) {
      bd.run(
        `insert into productos_inventario (id, nombre, tipo, stock, stock_minimo, precio_venta)
         values (?,?,?,?,?,?)`,
        [p.id, p.nombre, p.tipo, p.stock, p.stock_minimo, p.precio_venta],
      )
    }
    for (const c of clientes) {
      bd.run('insert into clientes (id, nombre, telefono, preferencias) values (?,?,?,?)', [
        c.id,
        c.nombre,
        c.telefono,
        c.preferencias,
      ])
    }

    // ---- Sesiones de caja --------------------------------------------------
    // Van ANTES que las ventas: las claves foráneas se comprueban al instante,
    // así que la caja tiene que existir cuando la venta la referencia. Los
    // importes del arqueo se calculan luego, cuando ya hay algo que contar.
    //
    // Solo los días recientes llevan caja, y nunca hoy: la de hoy la abre quien
    // visita la demo.
    const DIAS_CON_CAJA = 6
    const MONTO_INICIAL = 100
    const cajaPorFecha = new Map()

    for (let d = Math.min(DIAS_CON_CAJA, DIAS - 1); d >= 1; d--) {
      const dia = new Date(hoy)
      dia.setDate(hoy.getDate() - d)
      if (dia.getDay() === 0) continue // domingo cerrado

      const fecha = aISOLocal(dia)
      const cajaId = uuid()
      cajaPorFecha.set(fecha, cajaId)

      bd.run(
        `insert into caja_sesiones (
           id, fecha, abierta_por, cerrada_por, monto_inicial, estado, abierta_at, cerrada_at
         ) values (?, ?, ?, ?, ?, 'cerrada', ?, ?)`,
        [cajaId, fecha, ADMIN, ADMIN, MONTO_INICIAL, `${fecha}T09:00:00.000Z`, `${fecha}T21:30:00.000Z`],
      )
    }

    // ---- Operación diaria --------------------------------------------------
    for (let d = DIAS - 1; d >= 0; d--) {
      const dia = new Date(hoy)
      dia.setDate(hoy.getDate() - d)
      const fecha = aISOLocal(dia)
      const diaSemana = dia.getDay()

      if (diaSemana === 0) continue // domingo cerrado

      const cajaId = cajaPorFecha.get(fecha) ?? null

      // Viernes y sábado son los días fuertes de una barbería.
      const factor = diaSemana === 5 ? 1.6 : diaSemana === 6 ? 1.9 : 1
      const atenciones = Math.round(entre(4, 9) * factor)

      for (let i = 0; i < atenciones; i++) {
        const b = elegir(barberos)
        const s = ponderado(servicios, pesos)
        const c = elegir(clientes)
        const hora = entre(9, 20)
        const turno = hora < 14 ? 'manana' : 'tarde_noche'
        const metodo = elegir([
          'efectivo', 'efectivo', 'efectivo',
          'yape', 'yape', 'yape',
          'plin', 'tarjeta', 'transferencia',
        ])
        const propina = Math.random() < 0.28 ? elegir([2, 3, 5, 5, 10]) : 0
        const descuento = Math.random() < 0.08 ? 5 : 0
        const ticket = uuid()

        bd.run(
          `insert into ventas (
             id, ticket_id, barbero_id, cliente_id, servicio_id, tipo, cantidad, monto,
             comision_monto, propina, descuento, metodo_pago, turno, fecha, caja_sesion_id
           ) values (?,?,?,?,?, 'servicio', 1, ?,?,?,?,?,?,?,?)`,
          [
            uuid(), ticket, b.id, c.id, s.id, s.precio,
            Math.round(s.precio * b.porcentaje) / 100,
            propina, descuento, metodo, turno, fecha, cajaId,
          ],
        )

        // ~22% de las atenciones se lleva además un producto.
        if (productosVenta.length && Math.random() < 0.22) {
          const p = elegir(productosVenta)
          bd.run(
            `insert into ventas (
               id, ticket_id, barbero_id, cliente_id, producto_id, tipo, cantidad, monto,
               comision_monto, propina, descuento, metodo_pago, turno, fecha, caja_sesion_id
             ) values (?,?,?,?,?, 'producto', 1, ?, 0, 0, 0, ?,?,?,?)`,
            [uuid(), ticket, b.id, c.id, p.id, p.precio_venta, metodo, turno, fecha, cajaId],
          )
        }
      }

      if (Math.random() < 0.45) {
        bd.run(
          `insert into gastos (id, descripcion, categoria, monto, metodo_pago, fecha, caja_sesion_id, registrado_por)
           values (?,?, 'Operación', ?,?,?,?,?)`,
          [uuid(), elegir(GASTOS), entre(10, 60), elegir(['efectivo', 'efectivo', 'yape']), fecha, cajaId, ADMIN],
        )
      }
    }

    // Alquiler mensual: el gasto fijo que hace realista la utilidad neta.
    for (let m = 0; m <= Math.floor(DIAS / 30); m++) {
      const f = new Date(hoy.getFullYear(), hoy.getMonth() - m, 1)
      bd.run(
        `insert into gastos (id, descripcion, categoria, monto, metodo_pago, fecha, registrado_por)
         values (?, 'Alquiler del local', 'Fijo', 800, 'transferencia', ?, ?)`,
        [uuid(), aISOLocal(f), ADMIN],
      )
    }

    // ---- Arqueo de las cajas ya cerradas -----------------------------------
    // Ahora que existen las ventas y los gastos del día, se puede cuadrar.
    for (const cajaId of cajaPorFecha.values()) {
      const [{ efectivo = 0 } = {}] = leerUno(
        bd,
        `select coalesce(sum(monto + propina), 0) as efectivo from ventas
          where caja_sesion_id = ? and metodo_pago = 'efectivo'`,
        [cajaId],
      )
      const [{ salidas = 0 } = {}] = leerUno(
        bd,
        `select coalesce(sum(monto), 0) as salidas from gastos
          where caja_sesion_id = ? and metodo_pago = 'efectivo'`,
        [cajaId],
      )

      const esperado = MONTO_INICIAL + efectivo - salidas
      // Un descuadre pequeño de vez en cuando: así el arqueo no parece de juguete.
      const diferencia = Math.random() < 0.3 ? elegir([-2, -1, 1, 2]) : 0

      bd.run(
        `update caja_sesiones
            set efectivo_esperado = ?, monto_final_contado = ?, diferencia = ?
          where id = ?`,
        [esperado, esperado + diferencia, diferencia, cajaId],
      )
    }

    // ---- Agenda de hoy y mañana -------------------------------------------
    const manana = new Date(hoy)
    manana.setDate(hoy.getDate() + 1)

    for (const [offset, base] of [[0, hoy], [1, manana]]) {
      const fecha = aISOLocal(base)
      const cuantas = offset === 0 ? 7 : 5

      for (let i = 0; i < cuantas; i++) {
        const b = elegir(barberos)
        const s = ponderado(servicios, pesos)
        const c = elegir(clientes)
        const hora = Math.min(9 + i * 2 - (i > 3 ? 1 : 0), 20)

        bd.run(
          `insert into citas (id, cliente_id, barbero_id, servicio_id, fecha_hora, estado, turno, notas)
           values (?,?,?,?,?,?,?,?)`,
          [
            uuid(), c.id, b.id, s.id,
            `${fecha}T${String(hora).padStart(2, '0')}:${elegir(['00', '30'])}:00-05:00`,
            offset === 0
              ? elegir(['pendiente', 'confirmada', 'confirmada', 'en_proceso'])
              : elegir(['pendiente', 'confirmada']),
            hora < 14 ? 'manana' : 'tarde_noche',
            Math.random() < 0.2
              ? elegir(['Cliente frecuente', 'Pidió el mismo corte', 'Viene con su hijo'])
              : null,
          ],
        )
      }
    }
  })
}

/** Lectura puntual dentro de una transacción ya abierta. */
function leerUno(bd, sql, params) {
  const stmt = bd.prepare(sql)
  try {
    stmt.bind(params)
    const salida = []
    while (stmt.step()) salida.push(stmt.getAsObject())
    return salida.length ? salida : [{}]
  } finally {
    stmt.free()
  }
}
