import { aNumero } from '@/lib/format'
import type { Sucursal } from './types'

export type Coordenada = [number, number]

export function coordenada(s: Pick<Sucursal, 'latitud' | 'longitud'>): Coordenada {
  return [aNumero(s.latitud), aNumero(s.longitud)]
}

/** Distancia en km (fórmula del haversine). */
export function distanciaKm([lat1, lon1]: Coordenada, [lat2, lon2]: Coordenada): number {
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(a))
}

export function formatoDistancia(km: number): string {
  if (km < 1) return `a ${Math.round(km * 1000)} m`
  if (km < 100) return `a ${km.toFixed(1)} km`
  return `a ${Math.round(km).toLocaleString('es-GT')} km`
}

export function enlaceComoLlegar(s: Pick<Sucursal, 'latitud' | 'longitud'>): string {
  const [lat, lng] = coordenada(s)
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}
