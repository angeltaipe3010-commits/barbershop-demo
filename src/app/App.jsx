import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/layout/Layout'
import RutaProtegida from '@/features/auth/RutaProtegida'
import Login from '@/features/auth/Login'
import NoEncontrado from './NoEncontrado'

// ----------------------------------------------------------------------------
//  Cada sección se descarga cuando se visita por primera vez.
//  Un barbero nunca baja el código de Reportes o Liquidación: la primera
//  pantalla llega antes y el bundle inicial se mantiene pequeño.
//  El <Suspense> que las recibe vive en Layout, junto al <Outlet>.
// ----------------------------------------------------------------------------
const Dashboard = lazy(() => import('@/features/dashboard/Dashboard'))
const Agenda = lazy(() => import('@/features/agenda/Agenda'))
const Clientes = lazy(() => import('@/features/clientes/Clientes'))
const Ventas = lazy(() => import('@/features/ventas/Ventas'))
const MisComisiones = lazy(() => import('@/features/comisiones/MisComisiones'))
const Servicios = lazy(() => import('@/features/catalogo/Servicios'))
const Inventario = lazy(() => import('@/features/inventario/Inventario'))
const Caja = lazy(() => import('@/features/caja/Caja'))
const Gastos = lazy(() => import('@/features/finanzas/Gastos'))
const Boveda = lazy(() => import('@/features/finanzas/Boveda'))
const Liquidacion = lazy(() => import('@/features/finanzas/Liquidacion'))
const Reportes = lazy(() => import('@/features/reportes/Reportes'))
const Staff = lazy(() => import('@/features/staff/Staff'))
const Configuracion = lazy(() => import('@/features/configuracion/Configuracion'))

// Vista de administrador: protección de rol declarada junto a la ruta.
const admin = (Vista) => (
  <RutaProtegida soloAdmin>
    <Vista />
  </RutaProtegida>
)

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Área autenticada */}
      <Route
        element={
          <RutaProtegida>
            <Layout />
          </RutaProtegida>
        }
      >
        {/* Visibles para ambos roles */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/ventas" element={<Ventas />} />
        <Route path="/mis-comisiones" element={<MisComisiones />} />

        {/* Exclusivas de administrador */}
        <Route path="/servicios" element={admin(Servicios)} />
        <Route path="/inventario" element={admin(Inventario)} />
        <Route path="/caja" element={admin(Caja)} />
        <Route path="/gastos" element={admin(Gastos)} />
        <Route path="/boveda" element={admin(Boveda)} />
        <Route path="/liquidacion" element={admin(Liquidacion)} />
        <Route path="/reportes" element={admin(Reportes)} />
        <Route path="/staff" element={admin(Staff)} />
        <Route path="/configuracion" element={admin(Configuracion)} />

        {/* Ruta desconocida dentro del área autenticada */}
        <Route path="*" element={<NoEncontrado />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
