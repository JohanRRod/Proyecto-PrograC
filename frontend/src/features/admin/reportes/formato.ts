import { aNumero, formatoFecha, formatoFechaHora, formatoHora, formatoMes, formatoMoneda } from '@/lib/format'
import type { TipoColumna, ValorCelda } from './types'

const numero = new Intl.NumberFormat('es-GT', { maximumFractionDigits: 2 })
const porcentaje = new Intl.NumberFormat('es-GT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function formatearCelda(valor: ValorCelda | undefined, tipo: TipoColumna): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  switch (tipo) {
    case 'moneda':
      return formatoMoneda(aNumero(valor as number | string))
    case 'porcentaje':
      return `${porcentaje.format(aNumero(valor as number | string))} %`
    case 'numero':
      return numero.format(aNumero(valor as number | string))
    case 'fecha':
      return formatoFecha(String(valor))
    case 'fechaHora':
      return formatoFechaHora(String(valor))
    case 'mes':
      return formatoMes(String(valor))
    case 'hora':
      return formatoHora(String(valor))
    case 'booleano':
      return valor === true ? 'Sí' : 'No'
    default:
      return String(valor)
  }
}

export const esNumerica = (tipo: TipoColumna) => tipo === 'moneda' || tipo === 'numero' || tipo === 'porcentaje'
