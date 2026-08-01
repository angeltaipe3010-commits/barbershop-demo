// ----------------------------------------------------------------------------
//  Formato y vocabulario de dominio.
//  Configuración regional: Perú por defecto (Soles / es-PE). Se puede
//  sobreescribir por entorno con VITE_LOCALE y VITE_CURRENCY.
// ----------------------------------------------------------------------------
export const LOCALE = import.meta.env.VITE_LOCALE || 'es-PE'
export const CURRENCY = import.meta.env.VITE_CURRENCY || 'PEN' // Sol peruano (S/)

// Los formateadores de Intl son caros de construir: se crean una sola vez.
const fmtMonedaIntl = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 2,
})

const fmtEnteroIntl = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })

// Moneda — en es-PE se muestra como "S/ 1,234.00".
export const fmtMoneda = (valor) => fmtMonedaIntl.format(Number(valor) || 0)

// Moneda compacta para espacios estrechos: "S/ 12.5k".
export const fmtMonedaCorta = (valor) => {
  const n = Number(valor) || 0
  if (Math.abs(n) >= 1000) return `S/ ${(n / 1000).toFixed(1)}k`
  return fmtMonedaIntl.format(n)
}

export const fmtEntero = (valor) => fmtEnteroIntl.format(Number(valor) || 0)

// Las fechas "YYYY-MM-DD" se parsean como hora LOCAL (no UTC) para evitar que
// se muestren un día antes en zonas con offset negativo (Perú = UTC-5).
const aFecha = (iso) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + 'T00:00:00') : new Date(iso)

export const fmtFecha = (iso) => {
  if (!iso) return '—'
  return aFecha(iso).toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Fecha corta para ejes de gráficos y tablas densas: "12 jun".
export const fmtFechaCorta = (iso) => {
  if (!iso) return '—'
  return aFecha(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })
}

export const fmtHora = (iso) =>
  iso ? new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' }) : '—'

// Fecha larga para la barra superior (ej. "jueves, 4 de junio").
export const fmtFechaLarga = (date = new Date()) =>
  date.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })

// Tiempo relativo humano ("hace 5 min"). Para listas de actividad reciente.
export const fmtRelativo = (iso) => {
  if (!iso) return '—'
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`
  return fmtFecha(iso)
}

// Iniciales para los avatares (máximo 2 letras).
export const iniciales = (nombre) =>
  String(nombre || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

// Determina el turno a partir de una hora dada (antes de las 14:00 = mañana).
export const turnoDe = (iso, horaCorte = 14) => {
  const h = new Date(iso).getHours()
  return h < horaCorte ? 'manana' : 'tarde_noche'
}

export const TURNOS = {
  manana: 'Mañana',
  tarde_noche: 'Tarde / Noche',
}

// Catálogo de estados de cita con su tono de Badge.
export const ESTADOS_CITA = {
  pendiente: { label: 'Pendiente', tono: 'neutro' },
  confirmada: { label: 'Confirmada', tono: 'info' },
  en_proceso: { label: 'En proceso', tono: 'aviso' },
  completada: { label: 'Completada', tono: 'exito' },
  cancelada: { label: 'Cancelada', tono: 'peligro' },
}

// Métodos de pago: etiqueta legible y color para los gráficos.
export const METODOS_PAGO = {
  efectivo: { label: 'Efectivo', color: 'bg-exito' },
  yape: { label: 'Yape', color: 'bg-purple-500' },
  plin: { label: 'Plin', color: 'bg-cyan-500' },
  tarjeta: { label: 'Tarjeta', color: 'bg-info' },
  transferencia: { label: 'Transferencia', color: 'bg-aviso' },
}

// Fecha de hoy en formato YYYY-MM-DD (zona local).
export const hoyISO = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

const _pad = (n) => String(n).padStart(2, '0')

// Convierte un Date a YYYY-MM-DD respetando la zona local.
export const aISOLocal = (d) => `${d.getFullYear()}-${_pad(d.getMonth() + 1)}-${_pad(d.getDate())}`

// Suma (o resta, con n negativo) días a una fecha YYYY-MM-DD.
export const sumarDias = (iso, n) => {
  const base = aFecha(iso)
  base.setDate(base.getDate() + n)
  return aISOLocal(base)
}
