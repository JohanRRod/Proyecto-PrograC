import { useMutation, useQuery } from '@tanstack/react-query'
import { consultarReporte, descargarReporte, listarReportes } from './api'
import type { FiltrosReporte, FormatoDescarga } from './types'

export const reportesKeys = {
  lista: ['admin', 'reportes'] as const,
  resultado: (codigo: string, filtros: FiltrosReporte) => ['admin', 'reportes', codigo, filtros] as const,
}

/** La lista de reportes no cambia mientras la app está abierta. */
export const useReportes = () =>
  useQuery({ queryKey: reportesKeys.lista, queryFn: listarReportes, staleTime: Number.POSITIVE_INFINITY })

export const useReporte = (codigo: string | null, filtros: FiltrosReporte, habilitado: boolean) =>
  useQuery({
    queryKey: reportesKeys.resultado(codigo ?? '', filtros),
    queryFn: () => consultarReporte(codigo as string, filtros),
    enabled: Boolean(codigo) && habilitado,
    staleTime: 60_000,
    // Al cambiar un filtro se sigue viendo la tabla anterior mientras carga,
    // pero nunca la de otro reporte.
    placeholderData: (anterior) => (anterior?.reporte.codigo === codigo ? anterior : undefined),
  })

export const useDescargarReporte = () =>
  useMutation({
    mutationFn: ({ codigo, formato, filtros }: { codigo: string; formato: FormatoDescarga; filtros: FiltrosReporte }) =>
      descargarReporte(codigo, formato, filtros),
  })
