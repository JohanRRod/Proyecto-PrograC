import { api } from '@/lib/http'
import type {
  AmenidadAdmin,
  AmenidadDatos,
  Asignacion,
  AsignacionDatos,
  PlanAdmin,
  PlanDatos,
  SucursalAdmin,
  SucursalDatos,
} from './types'

// Sedes
export const listarSedes = () => api<SucursalAdmin[]>('/sucursales')
export const obtenerSede = (id: number) => api<SucursalAdmin>(`/sucursales/${id}`)
export const crearSede = (datos: SucursalDatos) => api<SucursalAdmin>('/sucursales', { method: 'POST', json: datos })
export const actualizarSede = (id: number, datos: SucursalDatos) =>
  api<SucursalAdmin>(`/sucursales/${id}`, { method: 'PUT', json: datos })
export const desactivarSede = (id: number) => api<void>(`/sucursales/${id}`, { method: 'DELETE' })

// Planes
export const listarPlanesAdmin = () => api<PlanAdmin[]>('/planes')
export const crearPlan = (datos: PlanDatos) => api<PlanAdmin>('/planes', { method: 'POST', json: datos })
export const actualizarPlan = (id: number, datos: PlanDatos) =>
  api<PlanAdmin>(`/planes/${id}`, { method: 'PUT', json: datos })
export const desactivarPlan = (id: number) => api<void>(`/planes/${id}`, { method: 'DELETE' })

// Amenidades
export const listarAmenidadesAdmin = () => api<AmenidadAdmin[]>('/amenidades')
export const crearAmenidad = (datos: AmenidadDatos) =>
  api<AmenidadAdmin>('/amenidades', { method: 'POST', json: datos })
export const actualizarAmenidad = (id: number, datos: AmenidadDatos) =>
  api<AmenidadAdmin>(`/amenidades/${id}`, { method: 'PUT', json: datos })

// Amenidades de una sede
export const listarAsignaciones = (sedeId: number) => api<Asignacion[]>(`/sucursales/${sedeId}/amenidades`)
export const asignarAmenidad = (sedeId: number, datos: AsignacionDatos) =>
  api<Asignacion>(`/sucursales/${sedeId}/amenidades`, { method: 'POST', json: datos })
export const actualizarAsignacion = (sedeId: number, datos: AsignacionDatos) =>
  api<Asignacion>(`/sucursales/${sedeId}/amenidades/${datos.amenidadId}`, { method: 'PUT', json: datos })
