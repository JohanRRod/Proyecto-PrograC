export type Rol = 'ADMIN' | 'MIEMBRO'

/** Respuesta de GET /api/auth/me */
export interface Perfil {
  usuarioId: string
  clienteId: string | null
  rol: Rol
}

/**
 * - cargando: aún no se sabe si hay sesión o se está pidiendo el perfil.
 * - anonimo: no hay sesión.
 * - sin-perfil: hay sesión en Supabase pero el backend no reconoce al usuario (403).
 * - listo: sesión y perfil disponibles.
 */
export type EstadoAuth = 'cargando' | 'anonimo' | 'sin-perfil' | 'error' | 'listo'

export function rutaInicio(rol: Rol | undefined): string {
  if (rol === 'ADMIN') return '/admin'
  if (rol === 'MIEMBRO') return '/mi'
  return '/'
}
