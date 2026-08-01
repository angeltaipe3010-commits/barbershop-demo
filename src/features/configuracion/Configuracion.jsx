import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { configApi } from '@/services/api'
import ZonaDatos from './ZonaDatos'
import {
  EncabezadoVista,
  Panel,
  Boton,
  Campo,
  Input,
  SubirImagen,
  Aparecer,
  EsqueletoTexto,
  useToast,
} from '@/shared/ui'

export default function Configuracion() {
  const { recargarConfig } = useAuth()
  const toast = useToast()

  const [form, setForm] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    configApi.obtener().then((c) => setForm(c || {}))
  }, [])

  const actualizar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const { error } = await configApi.actualizar({
      nombre_negocio: form.nombre_negocio,
      direccion: form.direccion || null,
      telefono: form.telefono || null,
      hora_corte_turno: Number(form.hora_corte_turno),
      logo_url: form.logo_url || null,
    })

    await recargarConfig()
    setGuardando(false)

    if (error) return toast.error('No se pudo guardar', { detalle: error.message })
    toast.exito('Configuración guardada')
  }

  return (
    <div className="space-y-6">
      <EncabezadoVista
        titulo="Configuración"
        descripcion="Datos del negocio y parámetros de operación"
      />

      <Aparecer>
        <Panel className="max-w-2xl">
          <Panel.Cabecera
            titulo="Identidad del negocio"
            descripcion="Aparece en el menú, en los tickets y en la app instalada"
          />
          <Panel.Cuerpo>
            {!form ? (
              <EsqueletoTexto lineas={6} />
            ) : (
              <form onSubmit={guardar} className="space-y-5">
                <SubirImagen
                  label="Logo del negocio"
                  carpeta="negocio"
                  value={form.logo_url}
                  onChange={(url) => setForm((f) => ({ ...f, logo_url: url }))}
                />

                <Campo etiqueta="Nombre del negocio" requerido>
                  {(a11y) => (
                    <Input
                      {...a11y}
                      required
                      value={form.nombre_negocio || ''}
                      onChange={actualizar('nombre_negocio')}
                    />
                  )}
                </Campo>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo etiqueta="Dirección">
                    {(a11y) => (
                      <Input
                        {...a11y}
                        value={form.direccion || ''}
                        onChange={actualizar('direccion')}
                        placeholder="Av. / Jr. …"
                      />
                    )}
                  </Campo>

                  <Campo etiqueta="Celular">
                    {(a11y) => (
                      <Input
                        {...a11y}
                        type="tel"
                        inputMode="numeric"
                        value={form.telefono || ''}
                        onChange={actualizar('telefono')}
                        placeholder="987 654 321"
                      />
                    )}
                  </Campo>
                </div>

                <Campo
                  etiqueta="Hora de corte mañana / tarde"
                  ayuda="Antes de esta hora las ventas cuentan como turno «Mañana». Formato 24 h: 14 = 2:00 p. m."
                  className="max-w-xs"
                >
                  {(a11y) => (
                    <Input
                      {...a11y}
                      type="number"
                      min="0"
                      max="23"
                      inputMode="numeric"
                      value={form.hora_corte_turno ?? 14}
                      onChange={actualizar('hora_corte_turno')}
                    />
                  )}
                </Campo>

                <Boton variante="marca" type="submit" cargando={guardando}>
                  Guardar cambios
                </Boton>
              </form>
            )}
          </Panel.Cuerpo>
        </Panel>
      </Aparecer>

      <Aparecer retardo={80}>
        <ZonaDatos />
      </Aparecer>
    </div>
  )
}
