import { useEffect, useState } from 'react'
import { staffApi } from '@/services/api'
import StaffFormModal from './StaffFormModal'
import ResetPasswordModal from './ResetPasswordModal'
import { interpretarErrorStaff } from './errores'
import {
  EncabezadoVista,
  Panel,
  Tabla,
  Badge,
  Boton,
  StatCard,
  EstadoVacio,
  EsqueletoTabla,
  useConfirm,
  useToast,
} from '@/shared/ui'
import { iniciales } from '@/shared/lib/format'

const DIAS_CORTOS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

export default function Staff() {
  const confirmar = useConfirm()
  const toast = useToast()

  const [staff, setStaff] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [reseteando, setReseteando] = useState(null)

  const cargar = async () => {
    setCargando(true)
    const { data } = await staffApi.listar()
    setStaff(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const eliminar = async (u) => {
    const ok = await confirmar({
      titulo: 'Eliminar barbero',
      mensaje: `¿Eliminar definitivamente a "${u.nombre}"? Se borrará su acceso y su perfil. Sus ventas pasadas se conservan. Esta acción no se puede deshacer.`,
      accionLabel: 'Eliminar',
      peligro: true,
    })
    if (!ok) return

    const { data, error } = await staffApi.eliminar(u.id)
    const msg = error?.message || data?.error
    if (msg) {
      const info = interpretarErrorStaff(msg, 'eliminar')
      return toast.error(info.titulo || 'No se pudo eliminar', { detalle: info.mensaje })
    }

    toast.exito(`${u.nombre} fue eliminado`)
    await cargar()
  }

  const alternarActivo = async (u) => {
    const { error } = await staffApi.actualizar(u.id, { activo: !u.activo })
    if (error) return toast.error('No se pudo actualizar', { detalle: error.message })
    toast.info(`${u.nombre} ${u.activo ? 'desactivado' : 'activado'}`)
    await cargar()
  }

  const actualizarComision = async (u, valor) => {
    const porcentaje = Number(valor)
    if (Number.isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      return toast.aviso('El porcentaje debe estar entre 0 y 100')
    }
    if (porcentaje === Number(u.porcentaje_comision)) return

    const { error } = await staffApi.actualizar(u.id, { porcentaje_comision: porcentaje })
    if (error) return toast.error('No se pudo actualizar', { detalle: error.message })
    toast.exito(`${u.nombre}: comisión al ${porcentaje}%`)
    await cargar()
  }

  const activos = staff.filter((u) => u.activo)
  const admins = staff.filter((u) => u.rol === 'admin')

  return (
    <div className="space-y-6">
      <EncabezadoVista
        titulo="Barberos"
        descripcion="Alta, edición, comisiones y disponibilidad del personal"
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
            Añadir barbero
          </Boton>
        }
      />

      <div className="escalonar grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard titulo="En el equipo" valor={staff.length} formato="entero" acento />
        <StatCard
          titulo="Activos"
          valor={activos.length}
          formato="entero"
          sub={`${staff.length - activos.length} inactivos`}
        />
        <StatCard titulo="Administradores" valor={admins.length} formato="entero" />
      </div>

      <Panel className="overflow-hidden">
        {cargando ? (
          <EsqueletoTabla filas={4} columnas={6} />
        ) : staff.length === 0 ? (
          <EstadoVacio
            icono={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            titulo="Sin personal registrado"
            mensaje="Añade a los barberos para que puedan iniciar sesión y cobrar."
            accion={
              <Boton variante="marca" onClick={() => setEditando('nuevo')}>
                Añadir el primero
              </Boton>
            }
          />
        ) : (
          <Tabla minAncho="860px">
            <Tabla.Cabecera pegajosa>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Disponibilidad</th>
                <th className="text-right">% Comisión</th>
                <th className="text-center">Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </Tabla.Cabecera>
            <Tabla.Cuerpo>
              {staff.map((u) => (
                <tr key={u.id} className={u.activo ? '' : 'opacity-60'}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full
                                   bg-gradient-to-br from-marca-500 to-marca-700 text-[11px] font-bold text-white"
                      >
                        {u.foto_url ? (
                          <img src={u.foto_url} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          iniciales(u.nombre)
                        )}
                      </span>
                      <span className="font-medium text-white">{u.nombre}</span>
                    </div>
                  </td>

                  <td className="text-ink-400">{u.username || '—'}</td>

                  <td>
                    <Badge tono={u.rol === 'admin' ? 'marca' : 'info'}>
                      {u.rol === 'admin' ? 'Administrador' : 'Barbero'}
                    </Badge>
                  </td>

                  <td>
                    <Disponibilidad usuario={u} />
                  </td>

                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        inputMode="numeric"
                        defaultValue={u.porcentaje_comision}
                        onBlur={(e) => actualizarComision(u, e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="input-base w-16 px-2 py-1 text-right text-sm"
                        aria-label={`Comisión de ${u.nombre}`}
                      />
                      <span className="text-ink-500">%</span>
                    </div>
                  </td>

                  <td className="text-center">
                    <button
                      onClick={() => alternarActivo(u)}
                      title="Activar o desactivar el acceso"
                      className="transition-transform duration-rapida active:scale-95"
                    >
                      <Badge tono={u.activo ? 'exito' : 'neutro'} punto>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </button>
                  </td>

                  <td className="whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1">
                      <Boton variante="sutil" tamano="sm" onClick={() => setEditando(u)}>
                        Editar
                      </Boton>
                      <Boton
                        variante="sutil"
                        tamano="sm"
                        onClick={() => setReseteando(u)}
                        className="text-aviso hover:bg-aviso/10 hover:text-aviso"
                      >
                        Clave
                      </Boton>
                      <Boton
                        variante="sutil"
                        tamano="sm"
                        onClick={() => eliminar(u)}
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
        <StaffFormModal
          miembro={editando === 'nuevo' ? null : editando}
          onClose={() => setEditando(null)}
          onDone={(creado) => {
            setEditando(null)
            toast.exito(creado ? 'Barbero creado' : 'Perfil actualizado')
            cargar()
          }}
        />
      )}

      {reseteando && (
        <ResetPasswordModal
          miembro={reseteando}
          onClose={() => setReseteando(null)}
          onDone={(clave) => {
            toast.exito(`Contraseña actualizada para ${reseteando.nombre}`, {
              detalle: `Nueva clave: ${clave}`,
              duracion: 12000,
            })
            setReseteando(null)
          }}
        />
      )}
    </div>
  )
}

// Resumen visual del horario: los días trabajados se marcan de un vistazo.
function Disponibilidad({ usuario }) {
  const dias = Array.isArray(usuario.dias_laborables) ? usuario.dias_laborables : []
  const inicio = (usuario.hora_inicio || '').slice(0, 5)
  const fin = (usuario.hora_fin || '').slice(0, 5)

  return (
    <div>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <span
            key={d}
            title={dias.includes(d) ? 'Trabaja' : 'Descansa'}
            className={`grid h-5 w-5 place-items-center rounded text-[10px] font-bold
                        ${dias.includes(d) ? 'bg-marca-600/20 text-marca-400' : 'bg-ink-850 text-ink-600'}`}
          >
            {DIAS_CORTOS[d]}
          </span>
        ))}
      </div>
      {inicio && fin && (
        <p className="cifras mt-1 text-xs text-ink-500">
          {inicio}–{fin}
        </p>
      )}
    </div>
  )
}
