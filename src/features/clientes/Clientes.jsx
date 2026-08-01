import { useEffect, useMemo, useState } from 'react'
import { clientesApi } from '@/services/api'
import ClienteDetalleModal from './ClienteDetalleModal'
import ClienteFormModal from './ClienteFormModal'
import {
  EncabezadoVista,
  Panel,
  Tabla,
  Boton,
  Buscador,
  EstadoVacio,
  EsqueletoTabla,
  useConfirm,
  useToast,
} from '@/shared/ui'
import { fmtFecha, iniciales } from '@/shared/lib/format'

export default function Clientes() {
  const confirmar = useConfirm()
  const toast = useToast()

  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null) // cliente | 'nuevo' | null
  const [verCliente, setVerCliente] = useState(null)

  const cargar = async () => {
    setCargando(true)
    const { data } = await clientesApi.listar()
    setClientes(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter((c) =>
      `${c.nombre} ${c.telefono || ''} ${c.email || ''} ${c.preferencias || ''}`
        .toLowerCase()
        .includes(q),
    )
  }, [clientes, busqueda])

  const eliminar = async (c) => {
    const ok = await confirmar({
      titulo: 'Eliminar cliente',
      mensaje: `¿Eliminar a "${c.nombre}"? Su historial de ventas se conserva, pero quedará sin cliente asignado.`,
      accionLabel: 'Eliminar',
      peligro: true,
    })
    if (!ok) return

    const { error } = await clientesApi.eliminar(c.id)
    if (error) return toast.error('No se pudo eliminar', { detalle: error.message })
    toast.exito(`${c.nombre} fue eliminado`)
    await cargar()
  }

  return (
    <div className="space-y-6">
      <EncabezadoVista
        titulo="Clientes"
        descripcion={
          cargando
            ? 'Cargando cartera…'
            : `${clientes.length} ${clientes.length === 1 ? 'cliente registrado' : 'clientes registrados'}`
        }
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
            Nuevo cliente
          </Boton>
        }
      />

      <Buscador
        valor={busqueda}
        onChange={setBusqueda}
        placeholder="Buscar por nombre, teléfono, correo o preferencia…"
        className="max-w-md"
      />

      <Panel className="overflow-hidden">
        {cargando ? (
          <EsqueletoTabla filas={6} columnas={5} />
        ) : filtrados.length === 0 ? (
          <EstadoVacio
            icono={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M17 20h5v-1a4 4 0 0 0-4-4h-1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm6 9H1v-1a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v1z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            titulo={busqueda ? 'Sin resultados' : 'Aún no hay clientes'}
            mensaje={
              busqueda
                ? `Ningún cliente coincide con "${busqueda}".`
                : 'Registra a tus clientes para llevar su historial y preferencias.'
            }
            accion={
              busqueda ? (
                <Boton variante="ghost" onClick={() => setBusqueda('')}>
                  Limpiar búsqueda
                </Boton>
              ) : (
                <Boton variante="marca" onClick={() => setEditando('nuevo')}>
                  Registrar el primero
                </Boton>
              )
            }
          />
        ) : (
          <Tabla minAncho="720px">
            <Tabla.Cabecera pegajosa>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Preferencias</th>
                <th>Alta</th>
                <th className="text-right">Acciones</th>
              </tr>
            </Tabla.Cabecera>
            <Tabla.Cuerpo>
              {filtrados.map((c) => (
                <tr key={c.id}>
                  <td>
                    <button
                      onClick={() => setVerCliente(c)}
                      className="group flex items-center gap-2.5 text-left"
                    >
                      <span
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full
                                   bg-ink-800 text-[11px] font-bold text-ink-300
                                   transition-colors duration-rapida
                                   group-hover:bg-marca-600/15 group-hover:text-marca-400"
                      >
                        {iniciales(c.nombre)}
                      </span>
                      <span className="font-medium text-white transition-colors duration-rapida group-hover:text-marca-400">
                        {c.nombre}
                      </span>
                    </button>
                  </td>
                  <td>
                    <span className="cifras">{c.telefono || '—'}</span>
                    {c.email && <span className="block truncate text-xs text-ink-500">{c.email}</span>}
                  </td>
                  <td className="max-w-xs">
                    <span className="block truncate text-ink-400">{c.preferencias || '—'}</span>
                  </td>
                  <td className="whitespace-nowrap text-ink-400">{fmtFecha(c.created_at)}</td>
                  <td className="whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1">
                      <Boton variante="sutil" tamano="sm" onClick={() => setVerCliente(c)}>
                        Ver
                      </Boton>
                      <Boton variante="sutil" tamano="sm" onClick={() => setEditando(c)}>
                        Editar
                      </Boton>
                      <Boton
                        variante="sutil"
                        tamano="sm"
                        onClick={() => eliminar(c)}
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
        <ClienteFormModal
          cliente={editando === 'nuevo' ? null : editando}
          onClose={() => setEditando(null)}
          onDone={(nombre, creado) => {
            setEditando(null)
            toast.exito(creado ? `${nombre} registrado` : 'Cliente actualizado')
            cargar()
          }}
        />
      )}

      {verCliente && (
        <ClienteDetalleModal
          cliente={verCliente}
          onClose={() => setVerCliente(null)}
          onEditar={(c) => {
            setVerCliente(null)
            setEditando(c)
          }}
        />
      )}
    </div>
  )
}
