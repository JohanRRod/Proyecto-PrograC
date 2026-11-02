import { api, descargar } from '@/lib/http'
import type { FiltrosReporte, FormatoDescarga, ReporteInfo, ReporteResultado } from './types'

function consulta({ desde, hasta, sucursalId }: FiltrosReporte): string {
  const params = new URLSearchParams()
  if (desde) params.set('desde', desde)
  if (hasta) params.set('hasta', hasta)
  if (sucursalId) params.set('sucursalId', sucursalId)
  const texto = params.toString()
  return texto ? `?${texto}` : ''
}

export const listarReportes = () => api<ReporteInfo[]>('/reportes')

export const consultarReporte = (codigo: string, filtros: FiltrosReporte) =>
  api<ReporteResultado>(`/reportes/${encodeURIComponent(codigo)}${consulta(filtros)}`)

export const descargarReporte = (codigo: string, formato: FormatoDescarga, filtros: FiltrosReporte) =>
  descargar(
    `/reportes/${encodeURIComponent(codigo)}/${formato}${consulta(filtros)}`,
    `flexpass-${codigo}.${formato === 'excel' ? 'xlsx' : 'pdf'}`,
  )
