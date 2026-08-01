import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/services/supabase'
import { configApi } from '@/services/api'

const AuthContext = createContext(null)

// Dominio interno con el que se arma el email a partir del nombre de usuario.
const DOMINIO_AUTH = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'elnegrote.com'

/**
 * Sesión de Supabase + perfil del staff + configuración del negocio.
 *
 * El rol es la fuente de verdad para la UI y viene de los metadatos de Auth
 * (viajan firmados en el JWT), con el perfil de `usuarios_barberos` como
 * respaldo. La seguridad real la aplican las políticas RLS en la base.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [config, setConfig] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargarConfig = useCallback(async () => {
    setConfig(await configApi.obtener())
  }, [])

  const cargarPerfil = useCallback(async (userId) => {
    if (!userId) {
      setPerfil(null)
      return
    }
    const { data, error } = await supabase
      .from('usuarios_barberos')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.warn('[Auth] No se pudo cargar el perfil:', error.message)
      setPerfil(null)
    } else {
      setPerfil(data)
    }
  }, [])

  useEffect(() => {
    let vivo = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!vivo) return
      setSession(session)
      if (session) cargarConfig()

      // La sesión ya está resuelta: el perfil es un extra. Con la red del
      // local caída, esperar a que responda dejaría la app en la pantalla de
      // carga indefinidamente, así que se entra igual y el perfil llega
      // después si puede.
      const margen = setTimeout(() => vivo && setCargando(false), 5000)
      cargarPerfil(session?.user?.id).finally(() => {
        clearTimeout(margen)
        if (vivo) setCargando(false)
      })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (!vivo) return
      setSession(session)
      if (session) cargarConfig()
      cargarPerfil(session?.user?.id)
    })

    return () => {
      vivo = false
      subscription.unsubscribe()
    }
  }, [cargarPerfil, cargarConfig])

  // Acepta un nombre de usuario ("juan") o el correo completo (compatibilidad).
  const login = useCallback((usuario, password) => {
    const id = String(usuario).trim().toLowerCase()
    const email = id.includes('@') ? id : `${id}@${DOMINIO_AUTH}`
    return supabase.auth.signInWithPassword({ email, password })
  }, [])

  const logout = useCallback(() => supabase.auth.signOut(), [])

  const rol = session?.user?.user_metadata?.rol || perfil?.rol || 'barbero'

  const value = useMemo(
    () => ({
      session,
      usuario: session?.user ?? null,
      perfil,
      rol,
      esAdmin: rol === 'admin',
      esBarbero: rol === 'barbero',
      cargando,
      config,
      horaCorte: config?.hora_corte_turno ?? 14,
      login,
      logout,
      recargarPerfil: () => cargarPerfil(session?.user?.id),
      recargarConfig: cargarConfig,
    }),
    [session, perfil, rol, cargando, config, login, logout, cargarPerfil, cargarConfig],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
