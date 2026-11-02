import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clientesKeys } from '../clientes/hooks'
import { membresiasKeys } from '../membresias/hooks'
import { listarCobrosDeCliente, listarMetodosDeCliente, realizarCobro, registrarMetodo } from './api'
import type { CobroDatos, MetodoPagoDatos } from './types'

export const pagosKeys = {
  metodos: (clienteId: string) => ['admin', 'pagos', 'metodos', clienteId] as const,
  cobros: (clienteId: string) => ['admin', 'pagos', 'cobros', clienteId] as const,
}

export const useMetodosDeCliente = (clienteId: string) =>
  useQuery({ queryKey: pagosKeys.metodos(clienteId), queryFn: () => listarMetodosDeCliente(clienteId) })

export const useCobrosDeCliente = (clienteId: string) =>
  useQuery({ queryKey: pagosKeys.cobros(clienteId), queryFn: () => listarCobrosDeCliente(clienteId) })

export function useRegistrarMetodo(clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: Omit<MetodoPagoDatos, 'clienteId'>) => registrarMetodo({ ...datos, clienteId }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: pagosKeys.metodos(clienteId) }),
  })
}

/** Un cobro puede cambiar el estado de la membresía (reactivar o completar la cancelación). */
export function useCobrar(clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: CobroDatos) => realizarCobro(datos),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: pagosKeys.cobros(clienteId) })
      void qc.invalidateQueries({ queryKey: membresiasKeys.deCliente(clienteId) })
      void qc.invalidateQueries({ queryKey: clientesKeys.uno(clienteId) })
    },
  })
}
