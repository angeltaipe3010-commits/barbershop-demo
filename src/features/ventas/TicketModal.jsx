import { useAuth } from '@/features/auth/AuthContext'
import { descripcionLinea } from './agruparTickets'
import { Modal, Boton } from '@/shared/ui'
import { fmtMoneda, fmtFecha, fmtHora, METODOS_PAGO } from '@/shared/lib/format'

/**
 * Comprobante (no fiscal) de una venta: se ve, se imprime en papel de 80 mm o
 * se envía por WhatsApp al cliente.
 */
export default function TicketModal({ ticket, onClose }) {
  const { config } = useAuth()
  const negocio = config?.nombre_negocio || 'Demo Barbershop'
  const metodo = METODOS_PAGO[ticket.metodo]?.label || ticket.metodo

  const lineas = ticket.filas.map((f) => ({
    desc: descripcionLinea(f),
    monto: Number(f.monto),
  }))

  const textoPlano = () => {
    const L = [`*${negocio}*`]
    if (config?.direccion) L.push(config.direccion)
    L.push('')
    L.push(`${fmtFecha(ticket.hora)} · ${fmtHora(ticket.hora)}`)
    if (ticket.cliente) L.push(`Cliente: ${ticket.cliente}`)
    if (ticket.barbero) L.push(`Atendió: ${ticket.barbero}`)
    L.push('--------------------------')
    lineas.forEach((l) => L.push(`${l.desc}  —  ${fmtMoneda(l.monto)}`))
    if (ticket.descuento > 0) L.push(`Descuento: -${fmtMoneda(ticket.descuento)}`)
    if (ticket.propina > 0) L.push(`Propina: ${fmtMoneda(ticket.propina)}`)
    L.push('--------------------------')
    L.push(`TOTAL: ${fmtMoneda(ticket.total)}`)
    L.push(`Pago: ${metodo}`)
    L.push('')
    L.push('¡Gracias por tu visita! 💈')
    return L.join('\n')
  }

  const whatsapp = () => {
    const tel = ticket.telefono ? '51' + String(ticket.telefono).replace(/\D/g, '') : ''
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(textoPlano())}`, '_blank')
  }

  const imprimir = () => {
    const w = window.open('', '_blank', 'width=340,height=640')
    if (!w) return

    // Escapa TODO lo que provenga de datos (nombre de cliente, de negocio, de
    // servicio…) antes de meterlo en el HTML del ticket. Sin esto, un cliente
    // llamado `<img src=x onerror=...>` ejecutaría script al imprimirlo: los
    // nombres los teclea cualquiera del staff, así que son entrada no confiable.
    const esc = (v) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

    const fila = (a, b, negrita) =>
      `<div style="display:flex;justify-content:space-between${negrita ? ';font-weight:bold;font-size:15px' : ''}"><span>${esc(a)}</span><span>${esc(b)}</span></div>`

    w.document.write(`<html><head><title>Ticket</title><meta charset="utf-8"><style>
      body{font-family:'Courier New',monospace;font-size:13px;width:280px;margin:0 auto;padding:14px;color:#000}
      h2{text-align:center;margin:2px 0;font-size:18px} .c{text-align:center;margin:2px 0}
      hr{border:none;border-top:1px dashed #000;margin:8px 0}
      @media print{@page{margin:4mm}}
    </style></head><body>
      <h2>${esc(negocio)}</h2>
      ${config?.direccion ? `<p class="c">${esc(config.direccion)}</p>` : ''}
      ${config?.telefono ? `<p class="c">${esc(config.telefono)}</p>` : ''}
      <p class="c">${esc(fmtFecha(ticket.hora))} · ${esc(fmtHora(ticket.hora))}</p>
      ${ticket.cliente ? `<p>Cliente: ${esc(ticket.cliente)}</p>` : ''}
      ${ticket.barbero ? `<p>Atendió: ${esc(ticket.barbero)}</p>` : ''}
      <hr/>
      ${lineas.map((l) => fila(l.desc, fmtMoneda(l.monto))).join('')}
      ${ticket.descuento > 0 ? fila('Descuento', '-' + fmtMoneda(ticket.descuento)) : ''}
      ${ticket.propina > 0 ? fila('Propina', fmtMoneda(ticket.propina)) : ''}
      <hr/>
      ${fila('TOTAL', fmtMoneda(ticket.total), true)}
      <p>Pago: ${esc(metodo)}</p>
      <p class="c">¡Gracias por tu visita!</p>
    </body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  return (
    <Modal
      abierto
      onClose={onClose}
      ancho="sm"
      titulo="Comprobante"
      pie={
        <>
          <Boton variante="sutil" onClick={onClose}>
            Cerrar
          </Boton>
          <Boton
            variante="ghost"
            onClick={imprimir}
            iconoIzq={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          >
            Imprimir
          </Boton>
          <Boton
            variante="marca"
            onClick={whatsapp}
            className="!bg-exito hover:!bg-emerald-600 !shadow-none"
          >
            WhatsApp
          </Boton>
        </>
      }
    >
      {/* Vista previa fiel al papel de 80 mm */}
      <div className="rounded-lg border border-ink-800 bg-ink-950 p-4 font-mono text-sm text-ink-200">
        <p className="text-center font-bold text-white">{negocio}</p>
        {config?.direccion && (
          <p className="text-center text-xs text-ink-500">{config.direccion}</p>
        )}
        <p className="text-center text-xs text-ink-500">
          {fmtFecha(ticket.hora)} · {fmtHora(ticket.hora)}
        </p>

        {ticket.cliente && <p className="mt-2 text-xs">Cliente: {ticket.cliente}</p>}
        {ticket.barbero && <p className="text-xs">Atendió: {ticket.barbero}</p>}

        <Separador />

        {lineas.map((l, i) => (
          <div key={i} className="flex justify-between gap-2">
            <span className="truncate">{l.desc}</span>
            <span className="cifras shrink-0">{fmtMoneda(l.monto)}</span>
          </div>
        ))}

        {ticket.descuento > 0 && (
          <div className="flex justify-between text-ink-500">
            <span>Descuento</span>
            <span className="cifras">−{fmtMoneda(ticket.descuento)}</span>
          </div>
        )}
        {ticket.propina > 0 && (
          <div className="flex justify-between text-ink-500">
            <span>Propina</span>
            <span className="cifras">{fmtMoneda(ticket.propina)}</span>
          </div>
        )}

        <Separador />

        <div className="flex justify-between text-base font-bold text-white">
          <span>TOTAL</span>
          <span className="cifras">{fmtMoneda(ticket.total)}</span>
        </div>
        <p className="text-xs text-ink-500">Pago: {metodo}</p>
        <p className="mt-3 text-center text-xs text-ink-500">¡Gracias por tu visita!</p>
      </div>
    </Modal>
  )
}

// Línea de puntos como la del papel térmico.
function Separador() {
  return <div className="my-3 border-t border-dashed border-ink-700" aria-hidden="true" />
}
