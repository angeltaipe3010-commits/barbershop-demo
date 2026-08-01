import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import PantallaCarga from '@/app/PantallaCarga'

/**
 * Protege rutas. Con `soloAdmin`, un barbero que fuerce la URL vuelve al
 * inicio. Es refuerzo de UX: la seguridad real vive en las políticas RLS.
 */
export default function RutaProtegida({ children, soloAdmin = false }) {
  const { session, esAdmin, cargando } = useAuth()
  const location = useLocation()

  if (cargando) return <PantallaCarga />

  if (!session) return <Navigate to="/login" replace state={{ from: location }} />

  if (soloAdmin && !esAdmin) return <Navigate to="/" replace />

  return children
}
