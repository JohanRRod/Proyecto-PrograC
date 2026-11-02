import { api } from '@/lib/http'
import type { CheckInDatos, RegistroAcceso, ResultadoCheckIn } from './types'

export const registrarEntrada = (datos: CheckInDatos) =>
  api<ResultadoCheckIn>('/accesos/checkin', { method: 'POST', json: datos })

export const listarAccesos = (clienteId: string) => api<RegistroAcceso[]>(`/accesos/historial/${clienteId}`)
