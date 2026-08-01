/** @type {import('tailwindcss').Config} */

// ----------------------------------------------------------------------------
//  Sistema de diseño — El Negrote Barber Shop
//  Todo el lenguaje visual (color, elevación, ritmo, movimiento) vive aquí.
//  Las vistas no inventan valores: consumen estos tokens.
// ----------------------------------------------------------------------------
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Neutros de la app. Ligeramente cálidos respecto a `zinc` puro: da
        // sensación de cuero/madera de barbería en vez de gris de dashboard.
        ink: {
          50: '#f7f7f8',
          100: '#eeeef0',
          200: '#d9d9dd',
          300: '#b8b8bf',
          400: '#8f8f99',
          500: '#71717a',
          600: '#5a5a63',
          700: '#42424b',
          800: '#2a2a31',
          850: '#1f1f25',
          900: '#17171b',
          950: '#0d0d10',
          1000: '#08080a',
        },
        // Rojo de marca (isotipo). Escala completa para estados y superficies.
        marca: {
          DEFAULT: '#e11d2e',
          50: '#fff1f2',
          100: '#ffe0e2',
          200: '#ffc6cb',
          300: '#ff9ba4',
          400: '#fb6070',
          500: '#f02f43',
          600: '#e11d2e',
          700: '#bd1224',
          800: '#9c1322',
          900: '#821622',
          950: '#48060e',
          dark: '#bd1224',
        },
        // Semánticos: un único lugar donde vive "qué color significa qué".
        exito: { DEFAULT: '#10b981', suave: 'rgba(16,185,129,0.14)' },
        aviso: { DEFAULT: '#f59e0b', suave: 'rgba(245,158,11,0.14)' },
        peligro: { DEFAULT: '#ef4444', suave: 'rgba(239,68,68,0.14)' },
        info: { DEFAULT: '#3b82f6', suave: 'rgba(59,130,246,0.14)' },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Bebas Neue"', 'Oswald', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      fontSize: {
        // Escala tipográfica con line-height y tracking ya resueltos.
        'display-xl': ['3.5rem', { lineHeight: '1', letterSpacing: '0.01em' }],
        'display-lg': ['2.75rem', { lineHeight: '1.05', letterSpacing: '0.01em' }],
        'display-md': ['2rem', { lineHeight: '1.1', letterSpacing: '0.015em' }],
        etiqueta: ['0.6875rem', { lineHeight: '1', letterSpacing: '0.12em' }],
      },

      borderRadius: {
        xl2: '0.875rem',
        '4xl': '2rem',
      },

      backgroundImage: {
        // Bastón de barbero: acento decorativo de la marca.
        'barber-pole':
          'repeating-linear-gradient(45deg, #e11d2e 0 10px, #f7f7f8 10px 20px, #1d4ed8 20px 30px, #f7f7f8 30px 40px)',
        // Brillo superior de las tarjetas (borde de luz de 1px).
        'panel-sheen':
          'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 40%)',
        'marca-glow':
          'radial-gradient(60% 60% at 50% 0%, rgba(225,29,46,0.18) 0%, rgba(225,29,46,0) 100%)',
        // Textura de puntos muy tenue para el fondo de la app.
        'grid-sutil':
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)',
      },

      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 12px 32px -18px rgba(0,0,0,0.9)',
        elevado: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 24px 48px -24px rgba(0,0,0,0.95)',
        marca: '0 8px 24px -10px rgba(225,29,46,0.55)',
        'marca-sm': '0 4px 14px -6px rgba(225,29,46,0.5)',
        foco: '0 0 0 2px #0d0d10, 0 0 0 4px rgba(225,29,46,0.6)',
      },

      // ---- Movimiento --------------------------------------------------------
      // Curvas nombradas por intención, no por valores.
      transitionTimingFunction: {
        salida: 'cubic-bezier(0.16, 1, 0.3, 1)',      // entra rápido, asienta suave
        entrada: 'cubic-bezier(0.4, 0, 1, 1)',
        suave: 'cubic-bezier(0.4, 0, 0.2, 1)',
        rebote: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // sobrepasa apenas
      },
      transitionDuration: {
        rapida: '140ms',
        media: '240ms',
        lenta: '420ms',
      },

      keyframes: {
        // Aparición base: sube 12px mientras se revela.
        aparecer: {
          from: { opacity: '0', transform: 'translate3d(0, 12px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        aparecerBajar: {
          from: { opacity: '0', transform: 'translate3d(0, -10px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        fundido: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        // Modales: escala mínima, nunca "salta".
        escalar: {
          from: { opacity: '0', transform: 'scale(0.96) translate3d(0, 8px, 0)' },
          to: { opacity: '1', transform: 'scale(1) translate3d(0, 0, 0)' },
        },
        // Hoja inferior en móvil.
        subirHoja: {
          from: { transform: 'translate3d(0, 100%, 0)' },
          to: { transform: 'translate3d(0, 0, 0)' },
        },
        deslizarIzq: {
          from: { opacity: '0', transform: 'translate3d(-16px, 0, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        // Barrido de luz de los skeletons.
        brillo: {
          '100%': { transform: 'translateX(100%)' },
        },
        // Pulso del punto "en vivo".
        latido: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(0.88)' },
        },
        // Anillo que se expande alrededor del punto en vivo.
        onda: {
          '0%': { opacity: '0.5', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(2.6)' },
        },
        // Crecimiento de barras en los gráficos.
        crecerBarra: {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        crecerColumna: {
          from: { transform: 'scaleY(0)' },
          to: { transform: 'scaleY(1)' },
        },
        // Giro del bastón de barbero (decorativo).
        bastonGirar: {
          from: { backgroundPosition: '0 0' },
          to: { backgroundPosition: '56.57px 0' },
        },
        girar: {
          to: { transform: 'rotate(360deg)' },
        },
      },

      animation: {
        aparecer: 'aparecer 420ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'aparecer-bajar': 'aparecerBajar 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
        fundido: 'fundido 240ms ease-out both',
        escalar: 'escalar 260ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'subir-hoja': 'subirHoja 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'deslizar-izq': 'deslizarIzq 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
        brillo: 'brillo 1.6s infinite',
        latido: 'latido 2s ease-in-out infinite',
        onda: 'onda 2s ease-out infinite',
        'crecer-barra': 'crecerBarra 720ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'crecer-columna': 'crecerColumna 620ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'baston-girar': 'bastonGirar 2.5s linear infinite',
        girar: 'girar 800ms linear infinite',
      },

      zIndex: {
        sidebar: '40',
        topbar: '30',
        overlay: '50',
        modal: '60',
        toast: '70',
      },
    },
  },
  plugins: [],
}
