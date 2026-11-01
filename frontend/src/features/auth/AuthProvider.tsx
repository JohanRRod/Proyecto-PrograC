import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { ApiError } from '@/lib/http'
import { AuthContext, type AuthValor } from './AuthContext'
import { obtenerPerfil } from './api'
import type { EstadoAuth } from './types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [sesion, setSesion] = useState<Session | null>(null)
  const [sesionLista, setSesionLista] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setSesionLista(true)
    })

    // El callback no debe hacer llamadas async a Supabase (recomendación de supabase-js).
    const { data } = supabase.auth.onAuthStateChange((evento, nueva) => {
      setSesion(nueva)
      setSesionLista(true)
      if (evento === 'SIGNED_OUT') queryClient.clear()
    })

    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const usuarioId = sesion?.user.id ?? null

  const perfilQuery = useQuery({
    queryKey: ['auth', 'perfil', usuarioId],
    queryFn: obtenerPerfil,
    enabled: Boolean(usuarioId),
    staleTime: 5 * 60_000,
    retry: (intentos, error) => !(error instanceof ApiError && error.status > 0 && error.status < 500) && intentos < 2,
  })

  const valor = useMemo<AuthValor>(() => {
    let estado: EstadoAuth
    if (!sesionLista) estado = 'cargando'
    else if (!sesion) estado = 'anonimo'
    else if (perfilQuery.isPending) estado = 'cargando'
    else if (perfilQuery.error instanceof ApiError && perfilQuery.error.status === 403) estado = 'sin-perfil'
    else if (perfilQuery.isError) estado = 'error'
    else estado = 'listo'

    return {
      estado,
      sesion,
      perfil: perfilQuery.data ?? null,
      correo: sesion?.user.email ?? null,
      errorPerfil: perfilQuery.error,
      reintentarPerfil: () => void perfilQuery.refetch(),
      iniciarSesion: async (correo, contrasena) => {
        if (!supabase) throw new Error('La autenticación no está configurada en este entorno.')
        const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena })
        if (error) throw error
      },
      cerrarSesion: async () => {
        await supabase?.auth.signOut()
        queryClient.clear()
      },
    }
  }, [sesion, sesionLista, perfilQuery, queryClient])

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
