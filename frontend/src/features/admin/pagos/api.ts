import { api } from '@/lib/http'
import type { Cobro, CobroDatos, MetodoPago, MetodoPagoDatos } from './types'

export const listarMetodosDeCliente = (clienteId: string) => api<MetodoPago[]>(`/pagos/metodos/cliente/${clienteId}`)
export const listarCobrosDeCliente = (clienteId: string) => api<Cobro[]>(`/pagos/historial/cliente/${clienteId}`)
export const registrarMetodo = (datos: MetodoPagoDatos) =>
  api<{ id: number; mensaje: string }>('/pagos/metodos', { method: 'POST', json: datos })
export const realizarCobro = (datos: CobroDatos) => api<Cobro>('/pagos/cobros', { method: 'POST', json: datos })
