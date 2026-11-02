/** Rangos de fecha rápidos para los filtros. Las fechas van en formato yyyy-MM-dd local. */

const dos = (n: number) => String(n).padStart(2, '0')

export const aIso = (d: Date) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`

export interface RangoRapido {
  id: string
  etiqueta: string
  calcular: (hoy: Date) => [Date, Date]
}

export const RANGOS: RangoRapido[] = [
  {
    id: 'este-mes',
    etiqueta: 'Este mes',
    calcular: (hoy) => [new Date(hoy.getFullYear(), hoy.getMonth(), 1), hoy],
  },
  {
    id: 'mes-pasado',
    etiqueta: 'Mes pasado',
    calcular: (hoy) => [
      new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1),
      new Date(hoy.getFullYear(), hoy.getMonth(), 0),
    ],
  },
  {
    id: '30-dias',
    etiqueta: 'Últimos 30 días',
    calcular: (hoy) => [new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 29), hoy],
  },
  {
    id: 'este-anio',
    etiqueta: 'Este año',
    calcular: (hoy) => [new Date(hoy.getFullYear(), 0, 1), hoy],
  },
]

export function rangoIso(rango: RangoRapido, hoy = new Date()): [string, string] {
  const [desde, hasta] = rango.calcular(hoy)
  return [aIso(desde), aIso(hasta)]
}
