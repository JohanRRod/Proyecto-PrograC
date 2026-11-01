import { useQuery } from '@tanstack/react-query'
import { listarAmenidadesDeSucursal, listarPaises, listarPlanes, listarSucursales } from './api'

/** El catálogo cambia poco: se conserva 10 minutos antes de volver a pedirlo. */
const CATALOGO = 10 * 60_000

export const catalogoKeys = {
  paises: ['catalogo', 'paises'] as const,
  sucursales: ['catalogo', 'sucursales'] as const,
  planes: ['catalogo', 'planes'] as const,
  amenidades: (id: number) => ['catalogo', 'sucursales', id, 'amenidades'] as const,
}

export const usePaises = () => useQuery({ queryKey: catalogoKeys.paises, queryFn: listarPaises, staleTime: CATALOGO })

export const useSucursales = () =>
  useQuery({ queryKey: catalogoKeys.sucursales, queryFn: listarSucursales, staleTime: CATALOGO })

export const usePlanes = () => useQuery({ queryKey: catalogoKeys.planes, queryFn: listarPlanes, staleTime: CATALOGO })

export const useAmenidadesSucursal = (id: number | null) =>
  useQuery({
    queryKey: catalogoKeys.amenidades(id ?? 0),
    queryFn: () => listarAmenidadesDeSucursal(id as number),
    enabled: id !== null,
    staleTime: CATALOGO,
  })
