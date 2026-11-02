import { api } from '@/lib/http'
import type { MiReserva, MisClases, Reserva } from '@/features/clases/types'
import type { Cobro, MetodoPago, MiMembresia, Periodo } from './types'

export const listarMisMembresias = () => api<MiMembresia[]>('/mi/membresias')
export const listarMisMetodos = () => api<MetodoPago[]>('/mi/pagos/metodos')
export const listarMiHistorial = () => api<Cobro[]>('/mi/pagos/historial')
export const listarMisPeriodos = () => api<Periodo[]>('/mi/pagos/periodos')

export const listarMisClases = (sucursalId: number | null) =>
  api<MisClases>(`/mi/clases${sucursalId ? `?sucursalId=${sucursalId}` : ''}`)
export const listarMisReservas = () => api<MiReserva[]>('/mi/reservas')
export const reservarClase = (datos: { claseId: number; fechaClase: string }) =>
  api<Reserva>('/mi/reservas', { method: 'POST', json: datos })
export const cancelarMiReserva = (id: number) => api<Reserva>(`/mi/reservas/${id}/cancelar`, { method: 'PATCH' })
