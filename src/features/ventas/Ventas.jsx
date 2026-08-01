import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { ventasApi, staffApi } from '@/services/api'
import { agruparTickets, descripcionLinea } from './agruparTickets'
import VentaRapidaModal from './VentaRapidaModal'
import TicketModal from './TicketModal'
import {
  EncabezadoVista,
  Panel,
  StatCard,
  Badge,
  Boton,
  Select,
  PeriodoSelector,
  EstadoVacio,
  useConfirm,
  useToast,
} from '@/shared/ui'
import { descargarCSV } from '@/shared/lib/exportar'
import { rangoDe } from '@/shared/lib/periodos'
import { fmtMoneda, fmtHora, fmtFecha, hoyISO, METODOS_PAGO } from '@/shared/lib/format'

const TONO_METODO = {
  efectivo: 'exito',
  yape: 'marca',
  plin: 'info',
  tarjeta: 'info',
  transferencia: 'neutro',
}

export default function Ventas() {
  const { usuario, esAdmin } = useAuth()
  const confirmar = useConfirm()
  const toast = useToast()

  const [periodo, setPeriodo] = useState('dia')
  const [refFecha, setRefFecha] = useState(hoyISO())
  const [tickets, setTickets] = useState([])
  const [cargando, setCargando] = useState(true)
  const [ventaRapida, setVentaRapida] = useState(false)
  const [verTicket, setVerTicket] = useState(null)
  const [barberos, setBarberos] = useState([])
  const [barberoFiltro, setBarberoFiltro] = useState('')

  const { desde, hasta } = rangoDe(periodo, refFecha)
  const esDia = periodo === 'dia'

  useEffect(() => {
    if (esAdmin) staffApi.activos().then(({ data }) => setBarberos(data || []))
  }, [esAdmin])

  const cargar = useCallback(async () => {
    setCargando(true)
    const barberoId = esAdmin ? barberoFiltro || null : usuario?.id
    const { data } = esDia
      ? await ventasApi.detalleDia(refFecha, barberoId)
      : await ventasApi.detalleRango(desde, hasta, barberoId)
    setTickets(agruparTickets(data || []))
    setCargando(false)
  }, [esDia, refFecha, desde, hasta, esAdmin, usuario, barberoFiltro])

  useEffect(() => {
    cargar()
  }, [cargar])

  const anular = async (t) => {
    if (!t.ticketId) {
      return toast.error('Venta sin ticket agrupado', {
        detalle: 'Las ventas antiguas no se pueden anular automáticamente.',
      })
    }

    const ok = await confirmar({
      titulo: 'Anular venta',
      mensaje: `¿Anular la venta de ${fmtMoneda(t.total)} de ${t.cliente || 'este cliente'}? Se restaurará el stock de los productos y la cita volverá a "Confirmada".`,
      accionLabel: 'Anular venta',
      peligro: true,
    })
    if (!ok) return

    const r = await ventasApi.anularTicket(t.ticketId, t.filas)
    if (r.error) toast.error('No se pudo anular', { detalle: r.error })
    else toast.exito('Venta anulada')
    await cargar()
  }

  const totalRango = tickets.reduce((s, t) => s + t.total, 0)
  const totalPropinas = tickets.reduce((s, t) => s + t.propina, 0)

  const exportar = () => {
    const columnas = [
      { key: 'fecha', label: 'Fecha' },
      { key: 'hora', label: 'Hora' },
      { key: 'cliente', label: 'Cliente' },
      { key: 'barbero', label: 'Barbero' },
      { key: 'detalle', label: 'Detalle' },
      { key: 'metodo', label: 'Método' },
      { key: 'propina', label: 'Propina (S/)' },
      { key: 'total', label: 'Total (S/)' },
    ]
    const filas = tickets.map((t) => ({
      fecha: t.fecha,
      hora: fmtHora(t.hora),
      cliente: t.cliente || '',
      barbero: t.barbero || '',
      detalle: t.filas.map(descripcionLinea).join(' + '),
      metodo: t.metodo,
      propina: Number(t.propina || 0).toFixed(2),
      total: Number(t.total).toFixed(2),
    }))
    descargarCSV(`ventas-${esDia ? refFecha : `${desde}_a_${hasta}`}.csv`, columnas, filas)
    toast.exito('Archivo descargado', { detalle: `${filas.length} ventas exportadas` })
  }

  const nombreFiltro = barberos.find((b) => b.id === barberoFiltro)?.nombre

  return (
    <div className="space-y-6">
      <EncabezadoVista
        titulo="Ventas"
        descripcion={
          (esDia ? fmtFecha(desde) : `${fmtFecha(desde)} — ${fmtFecha(hasta)}`) +
          (esAdmin ? (nombreFiltro ? ` · ${nombreFiltro}` : '') : ' · las tuyas')
        }
        acciones={
          <>
            {esAdmin && (
              <Select
                value={barberoFiltro}
                onChange={(e) => setBarberoFiltro(e.target.value)}
                className="w-auto"
                aria-label="Filtrar por barbero"
              >
                <option value="">Todos los barberos</option>
                {barberos.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </Select>
            )}
            <PeriodoSelector
              periodo={periodo}
              setPeriodo={setPeriodo}
              refFecha={refFecha}
              setRefFecha={setRefFecha}
            />
            <Boton variante="ghost" onClick={exportar} disabled={!tickets.length}>
              Exportar
            </Boton>
            <Boton variante="marca" onClick={() => setVentaRapida(true)}>
              Venta rápida
            </Boton>
          </>
        }
      />

      <div className="escalonar grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          titulo={esDia ? 'Total del día' : 'Total del período'}
          valor={totalRango}
          sub={`${tickets.length} ${tickets.length === 1 ? 'venta' : 'ventas'}`}
          acento
        />
        <StatCard
          titulo="Ticket promedio"
          valor={tickets.length ? totalRango / tickets.length : 0}
        />
        <StatCard titulo="Propinas" valor={totalPropinas} sub="Van íntegras al barbero" />
      </div>

      {cargando ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="esqueleto h-52 rounded-xl2" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Panel>
          <EstadoVacio
            icono={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            titulo="Sin ventas en este período"
            mensaje="Cobra una cita desde la agenda o registra una venta rápida para clientes sin reserva."
            accion={
              <Boton variante="marca" onClick={() => setVentaRapida(true)}>
                Registrar venta rápida
              </Boton>
            }
          />
        </Panel>
      ) : (
        <div className="escalonar grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tickets.map((t) => (
            <TarjetaTicket
              key={t.key}
              ticket={t}
              mostrarFecha={!esDia}
              esAdmin={esAdmin}
              onVer={() => setVerTicket(t)}
              onAnular={() => anular(t)}
            />
          ))}
        </div>
      )}

      {ventaRapida && (
        <VentaRapidaModal
          onClose={() => setVentaRapida(false)}
          onDone={(total) => {
            setVentaRapida(false)
            toast.exito('Venta registrada', { detalle: total ? `Total ${fmtMoneda(total)}` : undefined })
            cargar()
          }}
        />
      )}

      {verTicket && <TicketModal ticket={verTicket} onClose={() => setVerTicket(null)} />}
    </div>
  )
}

function TarjetaTicket({ ticket: t, mostrarFecha, esAdmin, onVer, onAnular }) {
  return (
    <article className="panel-interactivo flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{t.cliente || 'Cliente de paso'}</p>
          <p className="truncate text-xs text-ink-500">
            {mostrarFecha && <span className="text-ink-400">{fmtFecha(t.fecha)} · </span>}
            {fmtHora(t.hora)}
            {t.barbero && ` · ${t.barbero}`}
          </p>
        </div>
        <Badge tono={TONO_METODO[t.metodo] || 'neutro'}>
          {METODOS_PAGO[t.metodo]?.label || t.metodo}
        </Badge>
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {t.filas.map((f) => (
          <li key={f.id} className="flex justify-between gap-3 text-ink-300">
            <span className="truncate">{descripcionLinea(f)}</span>
            <span className="cifras shrink-0">{fmtMoneda(f.monto)}</span>
          </li>
        ))}
        {t.descuento > 0 && (
          <li className="flex justify-between text-aviso">
            <span>Descuento</span>
            <span className="cifras">− {fmtMoneda(t.descuento)}</span>
          </li>
        )}
        {t.propina > 0 && (
          <li className="flex justify-between text-ink-500">
            <span>Propina</span>
            <span className="cifras">{fmtMoneda(t.propina)}</span>
          </li>
        )}
      </ul>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink-800 pt-3">
        <span className="cifras text-lg font-bold text-white">{fmtMoneda(t.total)}</span>
        <div className="flex gap-1">
          <Boton variante="sutil" tamano="sm" onClick={onVer}>
            Ticket
          </Boton>
          {esAdmin && (
            <Boton
              variante="sutil"
              tamano="sm"
              onClick={onAnular}
              className="text-peligro hover:bg-peligro/10 hover:text-peligro"
            >
              Anular
            </Boton>
          )}
        </div>
      </div>
    </article>
  )
}
