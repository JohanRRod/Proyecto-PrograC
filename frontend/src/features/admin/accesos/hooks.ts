import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listarAccesos, registrarEntrada } from './api'
import type { CheckInDatos } from './types'

export const accesosKeys = {
  deCliente: (clienteId: string) => ['admin', 'accesos', clienteId] as const,
}

export const useAccesosDeCliente = (clienteId: string | null) =>
  useQuery({
    queryKey: accesosKeys.deCliente(clienteId ?? ''),
    queryFn: () => listarAccesos(clienteId as string),
    enabled: Boolean(clienteId),
  })

export function useRegistrarEntrada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: CheckInDatos) => registrarEntrada(datos),
    // Se registra también el intento rechazado: siempre se refresca el historial.
    onSettled: (_r, _e, datos) => void qc.invalidateQueries({ queryKey: accesosKeys.deCliente(datos.clienteId) }),
  })
}
