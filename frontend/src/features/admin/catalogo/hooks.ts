import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  actualizarAmenidad,
  actualizarAsignacion,
  actualizarPlan,
  actualizarSede,
  asignarAmenidad,
  crearAmenidad,
  crearPlan,
  crearSede,
  desactivarPlan,
  desactivarSede,
  listarAmenidadesAdmin,
  listarAsignaciones,
  listarPlanesAdmin,
  listarSedes,
  obtenerSede,
} from './api'
import type { AmenidadDatos, AsignacionDatos, PlanDatos, SucursalDatos } from './types'

export const catalogoAdminKeys = {
  todo: ['admin', 'catalogo'] as const,
  sedes: ['admin', 'catalogo', 'sedes'] as const,
  sede: (id: number) => ['admin', 'catalogo', 'sedes', id] as const,
  asignaciones: (id: number) => ['admin', 'catalogo', 'sedes', id, 'amenidades'] as const,
  planes: ['admin', 'catalogo', 'planes'] as const,
  amenidades: ['admin', 'catalogo', 'amenidades'] as const,
}

/**
 * Tras cualquier cambio se refresca también el catálogo público (['catalogo', ...]),
 * que usan el mapa, la página de planes, recepción y los formularios de clientes.
 */
function refrescar(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: catalogoAdminKeys.todo })
  void qc.invalidateQueries({ queryKey: ['catalogo'] })
}

export const useSedesAdmin = () => useQuery({ queryKey: catalogoAdminKeys.sedes, queryFn: listarSedes })

export const useSedeAdmin = (id: number) =>
  useQuery({ queryKey: catalogoAdminKeys.sede(id), queryFn: () => obtenerSede(id), enabled: Number.isFinite(id) })

export function useGuardarSede(id?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: SucursalDatos) => (id ? actualizarSede(id, datos) : crearSede(datos)),
    onSuccess: (sede) => {
      qc.setQueryData(catalogoAdminKeys.sede(sede.id), sede)
      refrescar(qc)
    },
  })
}

export function useDesactivarSede(id: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: () => desactivarSede(id), onSuccess: () => refrescar(qc) })
}

export const usePlanesAdmin = () => useQuery({ queryKey: catalogoAdminKeys.planes, queryFn: listarPlanesAdmin })

export function useGuardarPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id?: number; datos: PlanDatos }) => (id ? actualizarPlan(id, datos) : crearPlan(datos)),
    onSuccess: () => refrescar(qc),
  })
}

export function useDesactivarPlan() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => desactivarPlan(id), onSuccess: () => refrescar(qc) })
}

export const useAmenidadesAdmin = () =>
  useQuery({ queryKey: catalogoAdminKeys.amenidades, queryFn: listarAmenidadesAdmin })

export function useGuardarAmenidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id?: number; datos: AmenidadDatos }) =>
      id ? actualizarAmenidad(id, datos) : crearAmenidad(datos),
    onSuccess: () => refrescar(qc),
  })
}

export const useAsignaciones = (sedeId: number) =>
  useQuery({ queryKey: catalogoAdminKeys.asignaciones(sedeId), queryFn: () => listarAsignaciones(sedeId) })

export function useGuardarAsignacion(sedeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nueva, datos }: { nueva: boolean; datos: AsignacionDatos }) =>
      nueva ? asignarAmenidad(sedeId, datos) : actualizarAsignacion(sedeId, datos),
    onSuccess: () => refrescar(qc),
  })
}
