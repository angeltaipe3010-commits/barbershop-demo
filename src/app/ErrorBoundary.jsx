import { Component } from 'react'
import Logo from '@/shared/marca/Logo'

// ----------------------------------------------------------------------------
//  Última red de seguridad. Un error de render en cualquier vista dejaría la
//  pantalla en blanco; aquí se convierte en un mensaje con salida (recargar o
//  volver al inicio) y el detalle técnico plegado para reportarlo.
// ----------------------------------------------------------------------------
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // En producción, este es el punto de enganche para un servicio de errores.
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="grid min-h-screen place-items-center bg-ink-1000 p-4">
        <div className="panel w-full max-w-lg animate-aparecer overflow-hidden p-8">
          <div className="absolute inset-x-0 top-0 h-1 barber-accent" aria-hidden="true" />

          <div className="mb-6 flex justify-center">
            <Logo tamano="md" compacto />
          </div>

          <h1 className="text-center text-xl font-semibold text-white">
            Algo se rompió por aquí
          </h1>
          <p className="mt-2 text-center text-sm text-ink-400">
            La aplicación encontró un error inesperado. Tus datos están a salvo:
            nada se guarda a medias.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={() => window.location.reload()} className="btn-marca">
              Recargar la app
            </button>
            <button
              onClick={() => {
                window.location.href = '/'
              }}
              className="btn-ghost"
            >
              Volver al inicio
            </button>
          </div>

          <details className="mt-6 rounded-lg border border-ink-800 bg-ink-950/60 p-3">
            <summary className="cursor-pointer text-xs font-medium text-ink-400">
              Detalle técnico
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-ink-500">
              {error?.stack || String(error)}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
