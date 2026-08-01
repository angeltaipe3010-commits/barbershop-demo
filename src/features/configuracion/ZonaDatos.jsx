import { useState } from 'react'
import { datosApi } from '@/services/api'
import { Panel, Boton, useConfirm, useToast } from '@/shared/ui'
import { descargarJSON } from '@/shared/lib/exportar'

/**
 * Operaciones sobre el conjunto de datos: respaldo, demo y borrado.
 * Las dos destructivas piden confirmación explícita y avisan exactamente qué
 * se pierde, porque no hay vuelta atrás.
 */
export default function ZonaDatos() {
  const confirmar = useConfirm()
  const toast = useToast()

  const [trabajando, setTrabajando] = useState(null) // 'respaldo' | 'demo' | 'limpiar'
  const [progreso, setProgreso] = useState(null)

  const descargarRespaldo = async () => {
    setTrabajando('respaldo')
    const r = await datosApi.respaldo()
    setTrabajando(null)

    if (r.error) return toast.error('No se pudo generar el respaldo', { detalle: r.error })

    descargarJSON(`respaldo-${new Date().toISOString().slice(0, 10)}.json`, r.data)
    toast.exito('Respaldo descargado', { detalle: 'Guárdalo en un lugar seguro.' })
  }

  const sembrarDemo = async () => {
    const ok = await confirmar({
      titulo: 'Cargar datos de demostración',
      mensaje:
        'Esto BORRARÁ todos los datos actuales (clientes, servicios, productos, ventas, citas, gastos, caja y pagos) y cargará ~2 meses de operación simulada. Los barberos y esta configuración se conservan.',
      accionLabel: 'Sí, cargar la demo',
      peligro: true,
    })
    if (!ok) return

    setTrabajando('demo')
    const r = await datosApi.sembrarDemo({ dias: 60, onProgreso: setProgreso })
    setTrabajando(null)
    setProgreso(null)

    if (r.error) return toast.error('No se pudo cargar la demo', { detalle: r.error })
    toast.exito('Datos de demostración cargados', {
      detalle: `${r.ventas} ventas, ${r.gastos} gastos y ${r.citas} citas`,
      duracion: 8000,
    })
  }

  const limpiarTodo = async () => {
    const ok = await confirmar({
      titulo: 'Limpiar todos los datos',
      mensaje:
        'Esto borrará PERMANENTEMENTE clientes, servicios, productos, ventas, citas, gastos, caja y pagos de comisión. Los barberos y la configuración se conservan. No se puede deshacer.',
      accionLabel: 'Sí, borrar todo',
      peligro: true,
    })
    if (!ok) return

    setTrabajando('limpiar')
    const r = await datosApi.limpiarTodo()
    setTrabajando(null)

    if (r.error) return toast.error('No se pudo limpiar', { detalle: r.error })
    toast.exito('Todos los datos fueron eliminados')
  }

  const ocupado = !!trabajando

  return (
    <Panel className="max-w-2xl">
      <Panel.Cabecera
        titulo="Datos"
        descripcion="Respaldo, demostración y borrado del sistema"
      />

      <Panel.Cuerpo className="space-y-4">
        <Accion
          titulo="Descargar respaldo"
          descripcion="Exporta todo el contenido de la base en un archivo JSON."
          boton={
            <Boton variante="ghost" onClick={descargarRespaldo} cargando={trabajando === 'respaldo'} disabled={ocupado}>
              Descargar
            </Boton>
          }
        />

        <Accion
          titulo="Cargar datos de demostración"
          descripcion="Reemplaza todo por ~2 meses de operación simulada: ventas, citas, gastos y clientes."
          boton={
            <Boton variante="marca" onClick={sembrarDemo} cargando={trabajando === 'demo'} disabled={ocupado}>
              Cargar demo
            </Boton>
          }
        />

        <Accion
          titulo="Limpiar todos los datos"
          descripcion="Deja el sistema vacío para empezar a operar de verdad."
          peligro
          boton={
            <Boton variante="peligro" onClick={limpiarTodo} cargando={trabajando === 'limpiar'} disabled={ocupado}>
              Borrar todo
            </Boton>
          }
        />

        {/* Progreso del sembrado: la operación tarda y conviene ver que avanza. */}
        {progreso && (
          <p className="flex animate-aparecer items-center gap-2 rounded-lg border border-ink-800 bg-ink-950/50 px-3.5 py-2.5 text-sm text-ink-300">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 animate-girar text-marca-500" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            {progreso}
          </p>
        )}

        <p className="rounded-lg border border-aviso/30 bg-aviso/10 px-3.5 py-2.5 text-xs text-aviso">
          Cargar la demo y limpiar los datos borran lo que haya ahora y no se pueden deshacer.
          Descarga un respaldo antes si tienes información real.
        </p>
      </Panel.Cuerpo>
    </Panel>
  )
}

function Accion({ titulo, descripcion, boton, peligro = false }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl2 border p-4
                  transition-colors duration-rapida
                  ${peligro ? 'border-peligro/25 bg-peligro/[0.04] hover:border-peligro/40' : 'border-ink-800 bg-ink-950/40 hover:border-ink-700'}`}
    >
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${peligro ? 'text-peligro' : 'text-white'}`}>{titulo}</p>
        <p className="mt-0.5 text-sm text-ink-500">{descripcion}</p>
      </div>
      {boton}
    </div>
  )
}
