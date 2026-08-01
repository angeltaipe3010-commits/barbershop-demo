// ----------------------------------------------------------------------------
//  Sustituto de Supabase Storage.
//
//  No hay bucket ni CDN: la imagen se reduce en el navegador y se convierte en
//  un data URL, que es lo que la app acaba guardando en `foto_url`. Así la foto
//  sobrevive a la recarga sin infraestructura de por medio.
//
//  El redimensionado no es un adorno: sin él, una foto de móvil de 4 MB entraría
//  en base64 dentro del volcado SQLite y la demo se volvería lenta.
// ----------------------------------------------------------------------------

const LADO_MAXIMO = 512
const CALIDAD = 0.82

// getPublicUrl() es síncrona en supabase-js, así que la ruta recién subida
// tiene que estar disponible sin esperar.
const subidas = new Map()

function leerComoDataURL(file) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(lector.result)
    lector.onerror = () => reject(lector.error)
    lector.readAsDataURL(file)
  })
}

async function reducir(file) {
  const original = await leerComoDataURL(file)

  // Los SVG no se rasterizan: perderían la nitidez y ya son ligeros.
  if (file.type === 'image/svg+xml' || !file.type.startsWith('image/')) return original

  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = original
    })

    const escala = Math.min(1, LADO_MAXIMO / Math.max(img.width, img.height))
    if (escala === 1 && original.length < 200_000) return original

    const lienzo = document.createElement('canvas')
    lienzo.width = Math.round(img.width * escala)
    lienzo.height = Math.round(img.height * escala)
    lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height)

    return lienzo.toDataURL('image/jpeg', CALIDAD)
  } catch {
    return original // Si algo falla, mejor la imagen entera que ninguna.
  }
}

export const storage = {
  from() {
    return {
      async upload(ruta, file) {
        try {
          subidas.set(ruta, await reducir(file))
          return { data: { path: ruta }, error: null }
        } catch (e) {
          return { data: null, error: { message: String(e?.message || e) } }
        }
      },

      getPublicUrl(ruta) {
        return { data: { publicUrl: subidas.get(ruta) || '' } }
      },

      async remove(rutas) {
        for (const r of [].concat(rutas)) subidas.delete(r)
        return { data: null, error: null }
      },
    }
  },
}
