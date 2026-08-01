import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { inventarioApi } from '@/services/api'
import MovimientoModal from './MovimientoModal'
import ProductoFormModal from './ProductoFormModal'
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

export default function Inventario() {
  const { usuario } = useAuth()
  const confirmar = useConfirm()
  const toast = useToast()

  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [soloBajos, setSoloBajos] = useState(false)
  const [editando, setEditando] = useState(null)
  const [movimiento, setMovimiento] = useState(null) // { producto, tipo }

  const cargar = async () => {
    setCargando(true)
    const { data } = await inventarioApi.listar()
    setProductos(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const bajos = productos.filter((p) => p.stock <= p.stock_minimo)
  const valorInventario = productos.reduce((s, p) => s + p.stock * Number(p.precio_venta), 0)

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos
      .filter((p) => !soloBajos || p.stock <= p.stock_minimo)
      .filter((p) => !q || p.nombre.toLowerCase().includes(q))
  }, [productos, busqueda, soloBajos])

  const eliminar = async (p) => {
    const ok = await confirmar({
      titulo: 'Eliminar producto',
      mensaje: `¿Eliminar "${p.nombre}" del inventario? Se borrarán también sus movimientos. Esta acción no se puede deshacer.`,
      accionLabel: 'Eliminar',
      peligro: true,
    })
    if (!ok) return

    const { error } = await inventarioApi.eliminarProducto(p.id)
    if (error) return toast.error('No se pudo eliminar', { detalle: error.message })
    toast.exito('Producto eliminado')
    await cargar()
  }

  return (
    <div className="space-y-6">
      <EncabezadoVista
        titulo="Inventario"
        descripcion="Productos de venta y de uso interno"
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
            Nuevo producto
          </Boton>
        }
      />

      <div className="escalonar grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard titulo="Productos" valor={productos.length} formato="entero" />
        <StatCard titulo="Valor en venta" valor={valorInventario} sub="Stock × precio" />
        <StatCard
          titulo="Stock bajo"
          valor={bajos.length}
          formato="entero"
          sub={bajos.length ? 'Requiere reabastecer' : 'Todo en orden'}
          acento={bajos.length > 0}
        />
      </div>

      {/* Aviso accionable: el problema y el filtro para verlo, juntos. */}
      {bajos.length > 0 && !soloBajos && (
        <div
          className="flex animate-aparecer flex-wrap items-center gap-3 rounded-xl2 border
                     border-aviso/30 bg-aviso/10 px-4 py-3"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-aviso" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="flex-1 text-sm text-aviso">
            {bajos.length} {bajos.length === 1 ? 'producto está' : 'productos están'} en su stock
            mínimo o por debajo.
          </p>
          <Boton variante="ghost" tamano="sm" onClick={() => setSoloBajos(true)}>
            Ver solo esos
          </Boton>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Buscador
          valor={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar producto…"
          className="max-w-sm flex-1"
        />
        {soloBajos && (
          <Boton variante="ghost" tamano="sm" onClick={() => setSoloBajos(false)}>
            Quitar filtro de stock bajo
          </Boton>
        )}
      </div>

      <Panel className="overflow-hidden">
        {cargando ? (
          <EsqueletoTabla filas={6} columnas={5} />
        ) : filtrados.length === 0 ? (
          <EstadoVacio
            icono={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            titulo={busqueda || soloBajos ? 'Sin resultados' : 'Inventario vacío'}
            mensaje={
              busqueda || soloBajos
                ? 'Prueba quitando los filtros.'
                : 'Registra los productos que vendes y los de uso interno para controlar su stock.'
            }
            accion={
              <Boton variante="marca" onClick={() => setEditando('nuevo')}>
                Añadir producto
              </Boton>
            }
          />
        ) : (
          <Tabla minAncho="820px">
            <Tabla.Cabecera pegajosa>
              <tr>
                <th>Producto</th>
                <th>Tipo</th>
                <th className="text-right">Stock</th>
                <th className="text-right">Precio</th>
                <th className="text-center">Ajustar</th>
                <th className="text-right">Acciones</th>
              </tr>
            </Tabla.Cabecera>
            <Tabla.Cuerpo>
              {filtrados.map((p) => {
                const bajo = p.stock <= p.stock_minimo
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {p.foto_url ? (
                          <img
                            src={p.foto_url}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-lg object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-800 text-ink-600">
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                          </div>
                        )}
                        <span className="font-medium text-white">{p.nombre}</span>
                      </div>
                    </td>

                    <td>
                      <Badge tono={p.tipo === 'venta' ? 'info' : 'neutro'} className="capitalize">
                        {p.tipo}
                      </Badge>
                    </td>

                    <td className="text-right">
                      <span className={`cifras font-semibold ${bajo ? 'text-aviso' : 'text-ink-200'}`}>
                        {p.stock}
                      </span>
                      <span className="ml-1 text-xs text-ink-600">/ {p.stock_minimo}</span>
                      {bajo && (
                        <Badge tono="aviso" className="ml-2">
                          Bajo
                        </Badge>
                      )}
                    </td>

                    <td className="cifras text-right text-ink-300">{fmtMoneda(p.precio_venta)}</td>

                    <td>
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => setMovimiento({ producto: p, tipo: 'entrada' })}
                          className="rounded-md border border-exito/40 px-2 py-1 text-xs font-medium
                                     text-exito transition-all duration-rapida active:scale-95
                                     hover:border-exito/60 hover:bg-exito/10"
                        >
                          + Entrada
                        </button>
                        <button
                          onClick={() => setMovimiento({ producto: p, tipo: 'salida' })}
                          disabled={p.stock === 0}
                          className="rounded-md border border-peligro/40 px-2 py-1 text-xs font-medium
                                     text-peligro transition-all duration-rapida active:scale-95
                                     hover:border-peligro/60 hover:bg-peligro/10
                                     disabled:pointer-events-none disabled:opacity-40"
                        >
                          − Salida
                        </button>
                      </div>
                    </td>

                    <td className="whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1">
                        <Boton variante="sutil" tamano="sm" onClick={() => setEditando(p)}>
                          Editar
                        </Boton>
                        <Boton
                          variante="sutil"
                          tamano="sm"
                          onClick={() => eliminar(p)}
                          className="text-peligro hover:bg-peligro/10 hover:text-peligro"
                        >
                          Eliminar
                        </Boton>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </Tabla.Cuerpo>
          </Tabla>
        )}
      </Panel>

      {editando && (
        <ProductoFormModal
          producto={editando === 'nuevo' ? null : editando}
          onClose={() => setEditando(null)}
          onDone={(creado) => {
            setEditando(null)
            toast.exito(creado ? 'Producto creado' : 'Producto actualizado')
            cargar()
          }}
        />
      )}

      {movimiento && (
        <MovimientoModal
          producto={movimiento.producto}
          tipo={movimiento.tipo}
          barberoId={usuario?.id}
          onClose={() => setMovimiento(null)}
          onDone={(n) => {
            toast.exito(
              `${movimiento.tipo === 'entrada' ? 'Entrada' : 'Salida'} de ${n} registrada`,
              { detalle: movimiento.producto.nombre },
            )
            setMovimiento(null)
            cargar()
          }}
        />
      )}
    </div>
  )
}
