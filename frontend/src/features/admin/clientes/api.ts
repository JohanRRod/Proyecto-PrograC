import { api } from '@/lib/http'
import type { Cliente, ClienteDatos, Invitacion } from './types'

export const listarClientes = () => api<Cliente[]>('/clientes')
export const obtenerCliente = (id: string) => api<Cliente>(`/clientes/${id}`)
export const crearCliente = (datos: ClienteDatos) => api<Cliente>('/clientes', { method: 'POST', json: datos })
export const actualizarCliente = (id: string, datos: ClienteDatos) =>
  api<Cliente>(`/clientes/${id}`, { method: 'PUT', json: datos })
/** El backend no borra: marca al cliente como INACTIVO. */
export const darDeBajaCliente = (id: string) => api<void>(`/clientes/${id}`, { method: 'DELETE' })
export const invitarCliente = (clienteId: string) =>
  api<Invitacion>('/auth/miembros/invitar', { method: 'POST', json: { clienteId } })
