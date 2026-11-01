import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { EstadoAuth, Perfil } from './types'

export interface AuthValor {
  estado: EstadoAuth
  sesion: Session | null
  perfil: Perfil | null
  correo: string | null
  /** Error al obtener el perfil (red, servidor caído, etc.). */
  errorPerfil: unknown
  reintentarPerfil: () => void
  iniciarSesion: (correo: string, contrasena: string) => Promise<void>
  cerrarSesion: () => Promise<void>
}

export const AuthContext = createContext<AuthValor | null>(null)

export function useAuth(): AuthValor {
  const valor = useContext(AuthContext)
  if (!valor) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return valor
}
