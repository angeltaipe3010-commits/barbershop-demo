import { useState } from 'react'
import { inventarioApi } from '@/services/api'
import { Modal, Boton, Campo, Input, Select, SubirImagen } from '@/shared/ui'

const VACIO = {
  nombre: '',
  tipo: 'venta',
  stock: 0,
  stock_minimo: 5,
  precio_venta: '',
  foto_url: '',
}

export default function ProductoFormModal({ producto, onClose, onDone }) {
  const editando = !!producto
  const [form, setForm] = useState(() =>
    producto
      ? {
          nombre: producto.nombre,
          tipo: producto.tipo,
          stock: producto.stock,
          stock_minimo: producto.stock_minimo,
          precio_venta: producto.precio_venta,
          foto_url: producto.foto_url || '',
        }
      : VACIO,
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const actualizar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const guardar = async (e) => {
    e.preventDefault()
    setError(null)
    setGuardando(true)

    const payload = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      stock_minimo: Number(form.stock_minimo),
      precio_venta: Number(form.precio_venta) || 0,
      foto_url: form.foto_url || null,
    }

    // El stock solo se fija al crear: después se mueve con entradas/salidas
    // para que cada cambio quede registrado y auditable.
    const { error } = editando
      ? await inventarioApi.actualizarProducto(producto.id, payload)
      : await inventarioApi.crearProducto({ ...payload, stock: Number(form.stock) || 0 })

    setGuardando(false)
    if (error) return setError(error.message)
    onDone?.(!editando)
  }

  return (
    <Modal
      abierto
      onClose={onClose}
      ancho="md"
      titulo={editando ? 'Editar producto' : 'Nuevo producto'}
      pie={
        <>
          <Boton variante="sutil" onClick={onClose}>
            Cancelar
          </Boton>
          <Boton variante="marca" type="submit" form="form-producto" cargando={guardando}>
            {editando ? 'Guardar cambios' : 'Crear producto'}
          </Boton>
        </>
      }
    >
      <form id="form-producto" onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <SubirImagen
            label="Foto del producto"
            carpeta="productos"
            value={form.foto_url}
            onChange={(url) => setForm((f) => ({ ...f, foto_url: url }))}
          />
        </div>

        <Campo etiqueta="Nombre" requerido className="sm:col-span-2">
          {(a11y) => (
            <Input
              {...a11y}
              required
              value={form.nombre}
              onChange={actualizar('nombre')}
              placeholder="ej. Cera Mate Fijación Fuerte"
            />
          )}
        </Campo>

        <Campo etiqueta="Tipo" ayuda={form.tipo === 'interno' ? 'No se ofrece en el POS.' : undefined}>
          {(a11y) => (
            <Select {...a11y} value={form.tipo} onChange={actualizar('tipo')}>
              <option value="venta">Venta al cliente</option>
              <option value="interno">Uso interno</option>
            </Select>
          )}
        </Campo>

        <Campo etiqueta="Precio de venta (S/)">
          {(a11y) => (
            <Input
              {...a11y}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.precio_venta}
              onChange={actualizar('precio_venta')}
            />
          )}
        </Campo>

        {!editando && (
          <Campo etiqueta="Stock inicial">
            {(a11y) => (
              <Input
                {...a11y}
                type="number"
                min="0"
                inputMode="numeric"
                value={form.stock}
                onChange={actualizar('stock')}
              />
            )}
          </Campo>
        )}

        <Campo
          etiqueta="Stock mínimo"
          ayuda="Por debajo de este número se avisa en el menú."
          className={editando ? 'sm:col-span-2' : ''}
        >
          {(a11y) => (
            <Input
              {...a11y}
              type="number"
              min="0"
              inputMode="numeric"
              value={form.stock_minimo}
              onChange={actualizar('stock_minimo')}
            />
          )}
        </Campo>

        {editando && (
          <p className="text-xs text-ink-500 sm:col-span-2">
            El stock actual ({producto.stock}) se ajusta con los botones de entrada y salida, para
            que cada movimiento quede registrado.
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="animate-aparecer-bajar rounded-lg border border-peligro/40 bg-peligro/10
                       px-3 py-2.5 text-sm text-peligro sm:col-span-2"
          >
            {error}
          </div>
        )}
      </form>
    </Modal>
  )
}
