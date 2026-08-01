import { useState } from 'react'
import { fotosApi } from '@/services/api'

/**
 * Subida de imágenes al bucket "fotos" de Supabase Storage.
 * Muestra vista previa optimista (blob local) mientras sube, para que la
 * imagen aparezca al instante y no tras el viaje al servidor.
 */
export default function SubirImagen({ value, onChange, carpeta = 'general', label = 'Foto' }) {
  const [subiendo, setSubiendo] = useState(false)
  const [previa, setPrevia] = useState(null)
  const [error, setError] = useState(null)

  const alElegir = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) return setError('El archivo debe ser una imagen.')
    if (file.size > 5 * 1024 * 1024) return setError('La imagen no puede pesar más de 5 MB.')

    setError(null)
    setPrevia(URL.createObjectURL(file))
    setSubiendo(true)

    const { url, error } = await fotosApi.subir(file, carpeta)

    setSubiendo(false)
    if (previa) URL.revokeObjectURL(previa)
    setPrevia(null)

    if (error) return setError(error.message)
    onChange(url)
  }

  const mostrada = previa || value

  return (
    <div>
      <label className="etiqueta-campo">{label}</label>
      <div className="flex items-center gap-3">
        <div
          className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden
                     rounded-xl border border-ink-700 bg-ink-900"
        >
          {mostrada ? (
            <img
              src={mostrada}
              alt=""
              className={`h-full w-full object-cover transition-opacity duration-media
                          ${subiendo ? 'opacity-50' : 'opacity-100'}`}
            />
          ) : (
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-600" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          )}

          {subiendo && (
            <span className="absolute inset-0 grid place-items-center bg-black/40">
              <svg viewBox="0 0 24 24" className="h-5 w-5 animate-girar text-white" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>
          )}
        </div>

        <label className="btn-ghost cursor-pointer px-3 py-2 text-sm">
          {subiendo ? 'Subiendo…' : value ? 'Cambiar' : 'Subir imagen'}
          <input
            type="file"
            accept="image/*"
            onChange={alElegir}
            className="hidden"
            disabled={subiendo}
          />
        </label>

        {value && !subiendo && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-sm text-peligro transition-opacity duration-rapida hover:opacity-80"
          >
            Quitar
          </button>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-peligro">{error}</p>}
    </div>
  )
}
