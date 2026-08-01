import { useAuth } from '@/features/auth/AuthContext'
import DashboardAdmin from './DashboardAdmin'
import DashboardBarbero from './DashboardBarbero'

// Punto de entrada del inicio: cada rol ve el panel que le sirve.
export default function Dashboard() {
  const { esAdmin } = useAuth()
  return esAdmin ? <DashboardAdmin /> : <DashboardBarbero />
}
