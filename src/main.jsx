import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/app/App'
import ErrorBoundary from '@/app/ErrorBoundary'
import PantallaConfiguracion from '@/app/PantallaConfiguracion'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ConfirmProvider, ToastProvider } from '@/shared/ui'
import { configuracionValida } from '@/services/supabase'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Con una versión nueva publicada, el service worker la instala en segundo
// plano y la página se recarga sola: así nadie se queda con la versión vieja
// guardada en el celular hasta abrir la app dos veces.
registerSW({ immediate: true })

const raiz = ReactDOM.createRoot(document.getElementById('root'))

// Sin credenciales de Supabase la app no puede hacer nada útil: se dice de
// frente en vez de arrancar y fallar con errores de red opacos.
if (!configuracionValida) {
  raiz.render(
    <React.StrictMode>
      <PantallaConfiguracion />
    </React.StrictMode>,
  )
} else {
  raiz.render(
    <React.StrictMode>
      <ErrorBoundary>
        {/* Banderas de React Router v7: adoptar ya el comportamiento futuro
            evita una migración con sorpresas y silencia sus avisos. */}
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ToastProvider>
            <ConfirmProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </ConfirmProvider>
          </ToastProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  )
}
