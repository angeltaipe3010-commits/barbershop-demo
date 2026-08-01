import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { gastosApi } from '@/services/api'
import {
  EncabezadoVista,
  Panel,
  Tabla,
  Badge,
  Boton,
  StatCard,
  Campo,
  Input,
  Select,
  PeriodoSelector,
  Aparecer,
  EstadoVacio,
  useConfirm,
  useToast,
} from '@/shared/ui'
import { rangoDe } from '@/shared/lib/periodos'
import { fmtMoneda, fmtFecha, hoyISO, METODOS_PAGO } from '@/shared/lib/format'

const CATEGORIAS = ['Insumos', 'Operación', 'Fijo', 'Alquiler', 'Servicios', 'Publicidad', 'Otros']
const VACIO = {
  descripcion: '',
  categoria: 'Insumos',
  monto: '',
  metodo_pago: 'efectivo',
  fecha: hoyISO(),
}

export default function Gastos() {
  const { usuario } = useAuth()
  const confirmar = useConfirm()
  const toast = useToast()

  const [periodo, setPeriodo] = useState('dia')
  const [refFecha, setRefFecha] = useState(hoyISO())
  const [gastos, setGastos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)

  const { desde, hasta } = rangoDe(periodo, refFecha)
  const esDia = periodo === 'dia'

  const cargar = useCallback(async () => {
    setCargando(true)
    const { data } = esDia
      ? await gastosApi.porFecha(refFecha)
      : await gastosApi.porRango(desde, hasta)
    setGastos(data || [])
    setCargando(false)
  }, [esDia, refFecha, desde, hasta])

  useEffect(() => {
    cargar()
  }, [cargar])

  const actualizar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const { error } = await gastosApi.crear({
      descripcion: form.descripcion.trim(),
      categoria: form.categoria,
      monto: Number(form.monto),
      metodo_pago: form.metodo_pago,
      fecha: form.fecha,
      registrado_por: usuario.id,
    })

    setGuardando(false)
    if (error) return toast.error('No se pudo registrar el gasto', { detalle: error.message })

    toast.exito('Gasto registrado', { detalle: fmtMoneda(form.monto) })
    // Se conserva la fecha: registrar varios gastos del mismo día es lo común.
    setForm({ ...VACIO, fecha: form.fecha })
    await cargar()
  }

  const eliminar = async (g) => {
    const ok = await confirmar({
      titulo: 'Eliminar gasto',
      mensaje: `¿Eliminar "${g.descripcion}" de ${fmtMoneda(g.monto)}?`,
      accionLabel: 'Eliminar',
      peligro: true,
    })
    if (!ok) return

    const { error } = await gastosApi.eliminar(g.id)
    if (error) return toast.error('No se pudo eliminar', { detalle: error.message })
    toast.exito('Gasto eliminado')
    await cargar()
  }

  const total = gastos.reduce((s, g) => s + Number(g.monto), 0)
  const enEfectivo = gastos
    .filter((g) => g.metodo_pago === 'efectivo')
    .reduce((s, g) => s + Number(g.monto), 0)

  return (
    <div className="space-y-6">
      <EncabezadoVista
        titulo="Gastos"
        descripcion={esDia ? fmtFecha(desde) : `${fmtFecha(desde)} — ${fmtFecha(hasta)}`}
        acciones={
          <PeriodoSelector
            periodo={periodo}
            setPeriodo={setPeriodo}
            refFecha={refFecha}
            setRefFecha={setRefFecha}
          />
        }
      />

      <div className="escalonar grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard titulo="Total de gastos" valor={total} acento />
        <StatCard titulo="Pagados en efectivo" valor={enEfectivo} sub="Salen de la caja física" />
        <StatCard titulo="N° de gastos" valor={gastos.length} formato="entero" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lista */}
        <Aparecer className="lg:col-span-2">
          <Panel className="overflow-hidden">
            <Panel.Cabecera titulo="Movimientos del período" />

            {cargando ? (
              <div className="space-y-3 p-5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="esqueleto h-10" />
                ))}
              </div>
            ) : gastos.length === 0 ? (
              <EstadoVacio
                icono={
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" />
                  </svg>
                }
                titulo="Sin gastos en el período"
                mensaje="Registra las salidas de dinero para que la utilidad neta sea real."
              />
            ) : (
              <Tabla minAncho="640px">
                <Tabla.Cabecera pegajosa>
                  <tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Categoría</th>
                    <th>Pago</th>
                    <th className="text-right">Monto</th>
                    <th />
                  </tr>
                </Tabla.Cabecera>
                <Tabla.Cuerpo>
                  {gastos.map((g) => (
                    <tr key={g.id}>
                      <td className="whitespace-nowrap text-ink-400">{fmtFecha(g.fecha)}</td>
                      <td className="font-medium text-white">{g.descripcion}</td>
                      <td>
                        <Badge tono="neutro">{g.categoria || '—'}</Badge>
                      </td>
                      <td className="text-ink-400">
                        {METODOS_PAGO[g.metodo_pago]?.label || g.metodo_pago}
                      </td>
                      <td className="cifras text-right font-semibold text-marca-400">
                        {fmtMoneda(g.monto)}
                      </td>
                      <td className="text-right">
                        <Boton
                          variante="sutil"
                          tamano="sm"
                          onClick={() => eliminar(g)}
                          className="text-peligro hover:bg-peligro/10 hover:text-peligro"
                        >
                          Eliminar
                        </Boton>
                      </td>
                    </tr>
                  ))}
                </Tabla.Cuerpo>
              </Tabla>
            )}
          </Panel>
        </Aparecer>

        {/* Alta */}
        <Aparecer retardo={80}>
          <Panel className="h-fit lg:sticky lg:top-24">
            <Panel.Cabecera titulo="Nuevo gasto" />
            <Panel.Cuerpo>
              <form onSubmit={guardar} className="space-y-4">
                <Campo etiqueta="Descripción" requerido>
                  {(a11y) => (
                    <Input
                      {...a11y}
                      required
                      value={form.descripcion}
                      onChange={actualizar('descripcion')}
                      placeholder="ej. Compra de insumos"
                    />
                  )}
                </Campo>

                <Campo etiqueta="Categoría">
                  {(a11y) => (
                    <Select {...a11y} value={form.categoria} onChange={actualizar('categoria')}>
                      {CATEGORIAS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  )}
                </Campo>

                <Campo etiqueta="Monto (S/)" requerido>
                  {(a11y) => (
                    <Input
                      {...a11y}
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={form.monto}
                      onChange={actualizar('monto')}
                      placeholder="0.00"
                    />
                  )}
                </Campo>

                <Campo
                  etiqueta="Método de pago"
                  ayuda={
                    form.metodo_pago === 'efectivo' ? 'Se descontará del arqueo de caja.' : undefined
                  }
                >
                  {(a11y) => (
                    <Select {...a11y} value={form.metodo_pago} onChange={actualizar('metodo_pago')}>
                      {Object.entries(METODOS_PAGO).map(([id, m]) => (
                        <option key={id} value={id}>
                          {m.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Campo>

                <Campo etiqueta="Fecha del gasto">
                  {(a11y) => (
                    <Input {...a11y} type="date" value={form.fecha} onChange={actualizar('fecha')} />
                  )}
                </Campo>

                <Boton variante="marca" type="submit" cargando={guardando} className="w-full">
                  Registrar gasto
                </Boton>
              </form>
            </Panel.Cuerpo>
          </Panel>
        </Aparecer>
      </div>
    </div>
  )
}
