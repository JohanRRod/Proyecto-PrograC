import { api } from '@/lib/http'
import type { ContratarDatos, Membresia, ResultadoCancelacion } from './types'

export const listarMembresiasDeCliente = (clienteId: string) =>
  api<Membresia[]>(`/membresias/cliente/${clienteId}`)

export const contratarMembresia = (datos: ContratarDatos) =>
  api<Membresia>('/membresias', { method: 'POST', json: datos })

export const cancelarMembresia = (membresiaId: number, motivoCancelacion: string) =>
  api<ResultadoCancelacion>(`/membresias/${membresiaId}/cancelacion`, {
    method: 'POST',
    json: { motivoCancelacion },
  })
