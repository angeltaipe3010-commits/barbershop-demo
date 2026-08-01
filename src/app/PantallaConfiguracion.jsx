import Logo from '@/shared/marca/Logo'

// ----------------------------------------------------------------------------
//  Se muestra cuando faltan las variables de entorno de Supabase.
//  Sin esto la app arrancaría y fallaría con errores de red opacos; así el
//  problema real (falta configuración) se dice en la primera pantalla.
// ----------------------------------------------------------------------------
export default function PantallaConfiguracion() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-1000 p-4">
      <div className="panel w-full max-w-lg animate-aparecer overflow-hidden p-8">
        <div className="absolute inset-x-0 top-0 h-1 barber-accent" aria-hidden="true" />

        <div className="mb-6 flex justify-center">
          <Logo tamano="md" compacto />
        </div>

        <h1 className="text-center text-xl font-semibold text-white">Falta configurar la conexión</h1>
        <p className="mt-2 text-center text-sm text-ink-400">
          La aplicación no encuentra las credenciales de Supabase.
        </p>

        <ol className="mt-6 space-y-3 text-sm text-ink-300">
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-marca-600/15 text-xs font-bold text-marca-400">
              1
            </span>
            <span>
              Copia <code className="rounded bg-ink-950 px-1.5 py-0.5 text-marca-400">.env.example</code> a{' '}
              <code className="rounded bg-ink-950 px-1.5 py-0.5 text-marca-400">.env</code>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-marca-600/15 text-xs font-bold text-marca-400">
              2
            </span>
            <span>
              Rellena <code className="rounded bg-ink-950 px-1.5 py-0.5 text-marca-400">VITE_SUPABASE_URL</code> y{' '}
              <code className="rounded bg-ink-950 px-1.5 py-0.5 text-marca-400">VITE_SUPABASE_ANON_KEY</code> con los
              valores de <b className="text-ink-200">Project Settings → API</b>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-marca-600/15 text-xs font-bold text-marca-400">
              3
            </span>
            <span>Reinicia el servidor de desarrollo</span>
          </li>
        </ol>

        <p className="mt-6 rounded-lg border border-ink-800 bg-ink-950/60 p-3 text-xs text-ink-500">
          En Vercel, las mismas variables se definen en{' '}
          <b className="text-ink-300">Settings → Environment Variables</b> y requieren un nuevo
          despliegue para tomar efecto.
        </p>
      </div>
    </div>
  )
}
