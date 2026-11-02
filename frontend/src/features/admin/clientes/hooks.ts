import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ClienteDatos } from './types'
import {
  actualizarCliente,
  crearCliente,
  darDeBajaCliente,
  invitarCliente,
  listarClientes,
  obtenerCliente,
} from './api'

export const clientesKeys = {
  todos: ['admin', 'clientes'] as const,
  uno: (id: string) => ['admin', 'clientes', id] as const,
}

export const useClientes = () => useQuery({ queryKey: clientesKeys.todos, queryFn: listarClientes })

export const useCliente = (id: string) =>
  useQuery({ queryKey: clientesKeys.uno(id), queryFn: () => obtenerCliente(id) })

export function useGuardarCliente(id?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: ClienteDatos) => (id ? actualizarCliente(id, datos) : crearCliente(datos)),
    onSuccess: (cliente) => {
      qc.setQueryData(clientesKeys.uno(cliente.id), cliente)
      void qc.invalidateQueries({ queryKey: clientesKeys.todos })
    },
  })
}

export function useDarDeBaja(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => darDeBajaCliente(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: clientesKeys.todos }),
  })
}

export const useInvitar = (id: string) => useMutation({ mutationFn: () => invitarCliente(id) })
