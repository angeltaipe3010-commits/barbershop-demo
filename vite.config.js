import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'El Negrote Barber Shop · CRM',
        short_name: 'Negrote CRM',
        description: 'CRM interno de barbería: agenda, punto de venta, caja y comisiones.',
        lang: 'es-PE',
        theme_color: '#e11d2e',
        background_color: '#08080a',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        categories: ['business', 'productivity'],
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cachea el "app shell" (HTML/JS/CSS) para que la app abra sin internet.
        // El .wasm entra también: es el motor SQLite del modo demo, y sin él la
        // demo no abriría sin conexión.
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2,wasm}'],
        // Las llamadas a Supabase NUNCA se cachean: los datos deben ser frescos.
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],

  resolve: {
    alias: {
      // `@/…` apunta siempre a src/ → sin cadenas de "../../.." al reestructurar.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    target: 'es2020',
    // El sourcemap se sube al hosting pero no se referencia: permite depurar
    // un error de producción sin exponer el código en las devtools del cliente.
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Separa lo que cambia poco (librerías) de lo que cambia en cada
        // despliegue (la app): el usuario recurrente solo redescarga la app.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          // El puente JS de SQLite. El .wasm de verdad (~660 KB) no está aquí:
          // se descarga aparte y solo cuando el modo demo lo arranca.
          'vendor-sqlite': ['sql.js'],
        },
      },
    },
  },

  server: {
    port: 5173,
    open: true,
  },

  preview: {
    port: 4173,
  },
})
