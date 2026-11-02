import { api } from '@/lib/http'
import type { Amenidad, AmenidadSucursal, Pais, Plan, Sucursal } from './types'

const publico = { auth: false } as const

export const listarPaises = () => api<Pais[]>('/catalogo/paises', publico)
export const listarSucursales = () => api<Sucursal[]>('/catalogo/sucursales', publico)
export const listarAmenidades = () => api<Amenidad[]>('/catalogo/amenidades', publico)
export const listarPlanes = () => api<Plan[]>('/catalogo/planes', publico)
export const listarAmenidadesDeSucursal = (id: number) =>
  api<AmenidadSucursal[]>(`/catalogo/sucursales/${id}/amenidades`, publico)
