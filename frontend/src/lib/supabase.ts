import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

export type TipoEnlace = 'invite' | 'recovery' | 'signup' | 'magiclink' | null

/**
 * Supabase procesa y limpia el hash de la URL apenas se crea el cliente,
 * antes de que React monte. Por eso el tipo de enlace (invitación, recuperación)
 * y su posible error se leen aquí, una sola vez, antes de crear el cliente.
 */
function leerEnlaceInicial(): { tipo: TipoEnlace; error: string | null } {
  if (typeof window === 'undefined') return { tipo: null, error: null }
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const tipo = (hash.get('type') ?? query.get('type')) as TipoEnlace
  const error = hash.get('error_description') ?? query.get('error_description')
  return { tipo, error: error ? error.replaceAll('+', ' ') : null }
}

export const enlaceInicial = leerEnlaceInicial()

/**
 * Cliente de Supabase usado SOLO para autenticación.
 * Los datos del negocio se consultan siempre a la API de Spring Boot.
 * Es null cuando faltan variables de entorno (la app muestra el aviso de configuración).
 */
export const supabase: SupabaseClient | null =
  env.supabaseUrl && env.supabaseKey
    ? createClient(env.supabaseUrl, env.supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null

export async function tokenActual(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
