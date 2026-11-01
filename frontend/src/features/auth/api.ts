import { api } from '@/lib/http'
import type { Perfil } from './types'

export const obtenerPerfil = () => api<Perfil>('/auth/me')
