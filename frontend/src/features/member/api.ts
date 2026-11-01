import { api } from '@/lib/http'
import type { Cobro, MetodoPago, MiMembresia, Periodo } from './types'

export const listarMisMembresias = () => api<MiMembresia[]>('/mi/membresias')
export const listarMisMetodos = () => api<MetodoPago[]>('/mi/pagos/metodos')
export const listarMiHistorial = () => api<Cobro[]>('/mi/pagos/historial')
export const listarMisPeriodos = () => api<Periodo[]>('/mi/pagos/periodos')
