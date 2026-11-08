import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { esDemo } from '@/services/supabase'
import Logo from '@/shared/marca/Logo'
import { BarberDivider } from '@/shared/marca/BarberPole'
import { Boton, Campo, Input } from '@/shared/ui'

// Cuentas que siembra `services/demo/semilla.js`. Solo se muestran en demo.
const ACCESOS_DEMO = [
  { usuario: 'admin', etiqueta: 'Administrador', detalle: 'Todo el negocio' },
  { usuario: 'juan', etiqueta: 'Barbero', detalle: 'Su agenda y comisiones' },
]
const PASSWORD_DEMO = 'demo1234'

export default function Login() {
  const { login, session, cargando } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    document.title = 'Acceso · Demo Barbershop'
  }, [])

  // Con sesión activa no tiene sentido el login: vuelve a donde iba.
  if (!cargando && session) {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />
  }

  const entrar = async (id, clave) => {
    setError(null)
    setEnviando(true)

    const { data, error } = await login(id, clave)
    setEnviando(false)

    if (error) {
      setError('Usuario o contraseña incorrectos.')
      setPassword('')
      return
    }

    if (!data?.user?.user_metadata?.rol) {
      console.warn('[Login] Usuario sin rol en metadatos; se asumirá "barbero".')
    }
    navigate(location.state?.from?.pathname || '/', { replace: true })
  }

  const onSubmit = (e) => {
    e.preventDefault()
    return entrar(usuario.trim(), password)
  }

  // Acceso de un clic para quien llega desde el portafolio: rellena el
  // formulario a la vista (no lo salta) y entra.
  const entrarComoDemo = (id) => {
    setUsuario(id)
    setPassword(PASSWORD_DEMO)
    return entrar(id, PASSWORD_DEMO)
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ink-1000 px-4 py-10">
      {/* Ambiente: halo de marca arriba y viñeta abajo. Da profundidad sin ruido. */}
      <div
        className="pointer-events-none absolute -top-48 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2
                   rounded-full bg-marca-600/20 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/60 to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="panel animate-escalar overflow-hidden p-8">
          <div className="absolute inset-x-0 top-0 h-1 barber-accent" aria-hidden="true" />

          <div className="mb-6 flex justify-center">
            <Logo tamano="lg" compacto />
          </div>

          <h1 className="text-center font-display text-2xl tracking-wide text-white">
            Demo Barbershop
          </h1>
          <p className="mt-1 text-center text-sm text-ink-500">
            {esDemo ? 'Sistema de gestión de la barbería' : 'Sistema interno · uso exclusivo del personal'}
          </p>

          <BarberDivider className="my-6" />

          {/* En la demo, entrar con un clic es la acción principal. */}
          {esDemo && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {ACCESOS_DEMO.map((a) => (
                  <button
                    key={a.usuario}
                    type="button"
                    disabled={enviando}
                    onClick={() => entrarComoDemo(a.usuario)}
                    aria-label={`Entrar como ${a.etiqueta.toLowerCase()}`}
                    className="group rounded-lg border border-ink-800 bg-ink-900/70 px-3 py-3 text-left
                               transition-colors duration-rapida hover:border-marca-600/60 hover:bg-ink-800
                               disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex items-center justify-between text-sm font-medium text-white">
                      {a.etiqueta}
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-500 transition-transform duration-rapida group-hover:translate-x-0.5 group-hover:text-white" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="block text-xs text-ink-500">{a.detalle}</span>
                  </button>
                ))}
              </div>

              <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink-600">
                <span className="h-px flex-1 bg-ink-800" />o con tu usuario
                <span className="h-px flex-1 bg-ink-800" />
              </div>
            </>
          )}

          <form onSubmit={onSubmit} className="escalonar space-y-4">
            <Campo etiqueta="Usuario" requerido>
              {(a11y) => (
                <Input
                  {...a11y}
                  type="text"
                  required
                  autoFocus={!esDemo}
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Usuario"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                />
              )}
            </Campo>

            <Campo etiqueta="Contraseña" requerido>
              {(a11y) => (
                <div className="relative">
                  <Input
                    {...a11y}
                    type={verPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword((v) => !v)}
                    aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center
                               rounded-md text-ink-500 transition-colors duration-rapida
                               hover:bg-ink-800 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      {verPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="m1 1 22 22" strokeLinecap="round" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              )}
            </Campo>

            {error && (
              <div
                role="alert"
                className="flex animate-aparecer-bajar items-start gap-2 rounded-lg border
                           border-peligro/40 bg-peligro/10 px-3 py-2.5 text-sm text-peligro"
              >
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}

            <Boton type="submit" variante="marca" tamano="lg" cargando={enviando} className="w-full">
              {enviando ? 'Entrando…' : 'Iniciar sesión'}
            </Boton>
          </form>

          {esDemo && (
            <p className="mt-4 text-center text-xs text-ink-600">
              Prueba con <code className="text-ink-400">admin</code> o{' '}
              <code className="text-ink-400">juan</code> · clave{' '}
              <code className="text-ink-400">{PASSWORD_DEMO}</code> · datos ficticios
            </p>
          )}
        </div>

        {!esDemo && (
          <p className="mt-6 text-center text-xs text-ink-600">
            ¿Olvidaste tu contraseña? Pídele al administrador que la restablezca.
          </p>
        )}
      </div>
    </div>
  )
}
