import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clientesKeys } from '../clientes/hooks'
import { cancelarMembresia, contratarMembresia, listarMembresiasDeCliente } from './api'
import type { ContratarDatos } from './types'

export const membresiasKeys = {
  deCliente: (clienteId: string) => ['admin', 'membresias', 'cliente', clienteId] as const,
}

export const useMembresiasDeCliente = (clienteId: string) =>
  useQuery({ queryKey: membresiasKeys.deCliente(clienteId), queryFn: () => listarMembresiasDeCliente(clienteId) })

export function useContratar(clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: Omit<ContratarDatos, 'clienteId'>) => contratarMembresia({ ...datos, clienteId }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: membresiasKeys.deCliente(clienteId) }),
  })
}

export function useCancelar(clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ membresiaId, motivo }: { membresiaId: number; motivo: string }) =>
      cancelarMembresia(membresiaId, motivo),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: membresiasKeys.deCliente(clienteId) })
      void qc.invalidateQueries({ queryKey: clientesKeys.uno(clienteId) })
    },
  })
}
