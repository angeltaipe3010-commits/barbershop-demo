import { Link } from 'react-router-dom'
import { EstadoVacio } from '@/shared/ui'

// Ruta inexistente dentro del área autenticada.
export default function NoEncontrado() {
  return (
    <div className="panel">
      <EstadoVacio
        icono={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
        }
        titulo="Esta página no existe"
        mensaje="El enlace que seguiste no corresponde a ninguna sección del sistema."
        accion={
          <Link to="/" className="btn-marca">
            Ir al inicio
          </Link>
        }
      />
    </div>
  )
}
