import { useEffect, useMemo, useState } from 'react'
import { serviciosApi } from '@/services/api'
import ServicioFormModal from './ServicioFormModal'
import {
  EncabezadoVista,
  Panel,
  Tabla,
  Badge,
  Boton,
  Buscador,
  StatCard,
  EstadoVacio,
  EsqueletoTabla,
  useConfirm,
  useToast,
} from '@/shared/ui'
import { fmtMoneda } from '@/shared/lib/format'

const TONO_CATEGORIA = {
  corte: 'marca',
  barba: 'info',
  tratamiento: 'aviso',
  combo: 'exito',
}

export default function Servicios() {
  const confirmar = useConfirm()
  const toast = useToast()

  const [servicios, setServicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null) // servicio | 'nuevo' | null

  const cargar = async () => {
    setCargando(true)
    const { data } = await serviciosApi.listar()
    setServicios(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return servicios
    return servicios.filter((s) => `${s.nombre} ${s.categoria || ''}`.toLowerCase().includes(q))
  }, [servicios, busqueda])

  const activos = servicios.filter((s) => s.activo)
  const precioPromedio = activos.length
    ? activos.reduce((s, x) => s + Number(x.precio), 0) / activos.length
    : 0

  const alternarActivo = async (s) => {
    const { error } = await serviciosApi.actualizar(s.id, { activo: !s.activo })
    if (error) return toast.error('No se pudo actualizar', { detalle: error.message })
    toast.info(`${s.nombre} ${s.activo ? 'desactivado' : 'activado'}`)
    await cargar()
  }

  const eliminar = async (s) => {
    const ok = await confirmar({
      titulo: 'Eliminar servicio',
      mensaje: `¿Eliminar "${s.nombre}" del catálogo? Las citas y ventas pasadas se conservan.`,
      accionLabel: 'Eliminar',
      peligro: true,
    })
    if (!ok) return

    const { error } = await serviciosApi.eliminar(s.id)
    if (error) return toast.error('No se pudo eliminar', { detalle: error.message })
    toast.exito('Servicio eliminado')
    await cargar()
  }

  return (
    <div className="space-y-6">
      <EncabezadoVista
        titulo="Catálogo de servicios"
        descripcion="Cortes, barba, tratamientos y combos"
        acciones={
          <Boton
            variante="marca"
            onClick={() => setEditando('nuevo')}
            iconoIzq={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            }
          >
            Nuevo servicio
          </Boton>
        }
      />

      <div className="escalonar grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard titulo="Servicios activos" valor={activos.length} formato="entero" acento />
        <StatCard titulo="Precio promedio" valor={precioPromedio} />
        <StatCard
          titulo="En el catálogo"
          valor={servicios.length}
          formato="entero"
          sub={`${servicios.length - activos.length} inactivos`}
        />
      </div>

      <Buscador
        valor={busqueda}
        onChange={setBusqueda}
        placeholder="Buscar servicio…"
        className="max-w-sm"
      />

      <Panel className="overflow-hidden">
        {cargando ? (
          <EsqueletoTabla filas={6} columnas={5} />
        ) : filtrados.length === 0 ? (
          <EstadoVacio
            icono={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" />
              </svg>
            }
            titulo={busqueda ? 'Sin resultados' : 'El catálogo está vacío'}
            mensaje={
              busqueda
                ? `Ningún servicio coincide con "${busqueda}".`
                : 'Crea los servicios que ofrece la barbería para poder agendarlos y cobrarlos.'
            }
            accion={
              <Boton variante="marca" onClick={() => setEditando('nuevo')}>
                Crear el primero
              </Boton>
            }
          />
        ) : (
          <Tabla minAncho="700px">
            <Tabla.Cabecera pegajosa>
              <tr>
                <th>Servicio</th>
                <th>Categoría</th>
                <th className="text-right">Duración</th>
                <th className="text-right">Precio</th>
                <th className="text-center">Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </Tabla.Cabecera>
            <Tabla.Cuerpo>
              {filtrados.map((s) => (
                <tr key={s.id} className={s.activo ? '' : 'opacity-60'}>
                  <td className="font-medium text-white">{s.nombre}</td>
                  <td>
                    <Badge tono={TONO_CATEGORIA[s.categoria] || 'neutro'} className="capitalize">
                      {s.categoria || 'sin categoría'}
                    </Badge>
                  </td>
                  <td className="cifras whitespace-nowrap text-right text-ink-400">
                    {s.duracion_min} min
                  </td>
                  <td className="cifras text-right font-semibold text-marca-400">
                    {fmtMoneda(s.precio)}
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => alternarActivo(s)}
                      title={s.activo ? 'Desactivar servicio' : 'Activar servicio'}
                      className="transition-transform duration-rapida active:scale-95"
                    >
                      <Badge tono={s.activo ? 'exito' : 'neutro'} punto>
                        {s.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </button>
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1">
                      <Boton variante="sutil" tamano="sm" onClick={() => setEditando(s)}>
                        Editar
                      </Boton>
                      <Boton
                        variante="sutil"
                        tamano="sm"
                        onClick={() => eliminar(s)}
                        className="text-peligro hover:bg-peligro/10 hover:text-peligro"
                      >
                        Eliminar
                      </Boton>
                    </div>
                  </td>
                </tr>
              ))}
            </Tabla.Cuerpo>
          </Tabla>
        )}
      </Panel>

      {editando && (
        <ServicioFormModal
          servicio={editando === 'nuevo' ? null : editando}
          onClose={() => setEditando(null)}
          onDone={(creado) => {
            setEditando(null)
            toast.exito(creado ? 'Servicio creado' : 'Servicio actualizado')
            cargar()
          }}
        />
      )}
    </div>
  )
}
