import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelarMiReserva,
  listarMiHistorial,
  listarMisClases,
  listarMisMembresias,
  listarMisMetodos,
  listarMisPeriodos,
  listarMisReservas,
  reservarClase,
} from './api'
import type { MiMembresia } from './types'

export const miKeys = {
  membresias: ['mi', 'membresias'] as const,
  metodos: ['mi', 'pagos', 'metodos'] as const,
  historial: ['mi', 'pagos', 'historial'] as const,
  periodos: ['mi', 'pagos', 'periodos'] as const,
  clasesTodas: ['mi', 'clases'] as const,
  clases: (sede: number | null) => ['mi', 'clases', sede ?? 'base'] as const,
  reservas: ['mi', 'reservas'] as const,
}

export const useMisMembresias = () => useQuery({ queryKey: miKeys.membresias, queryFn: listarMisMembresias })
export const useMisMetodos = () => useQuery({ queryKey: miKeys.metodos, queryFn: listarMisMetodos })
export const useMiHistorial = () => useQuery({ queryKey: miKeys.historial, queryFn: listarMiHistorial })
export const useMisPeriodos = () => useQuery({ queryKey: miKeys.periodos, queryFn: listarMisPeriodos })

/** Clases de los próximos 7 días en una sede (null = la sede base del miembro). */
export const useMisClases = (sede: number | null) =>
  useQuery({ queryKey: miKeys.clases(sede), queryFn: () => listarMisClases(sede) })

export const useMisReservas = () => useQuery({ queryKey: miKeys.reservas, queryFn: listarMisReservas })

function useRefrescarClases() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: miKeys.clasesTodas })
    void qc.invalidateQueries({ queryKey: miKeys.reservas })
  }
}

export function useReservarClase() {
  const refrescar = useRefrescarClases()
  return useMutation({ mutationFn: reservarClase, onSettled: refrescar })
}

export function useCancelarMiReserva() {
  const refrescar = useRefrescarClases()
  return useMutation({ mutationFn: cancelarMiReserva, onSettled: refrescar })
}

const PRIORIDAD: Record<MiMembresia['estado'], number> = {
  ACTIVA: 0,
  SUSPENDIDA_IMPAGO: 1,
  CANCELADA: 2,
  FINALIZADA: 3,
}

/** La membresía que se muestra como "pase": la activa, o la más reciente si no hay activa. */
export function membresiaPrincipal(membresias: MiMembresia[]): MiMembresia | null {
  return (
    [...membresias].sort(
      (a, b) => PRIORIDAD[a.estado] - PRIORIDAD[b.estado] || b.fechaInicio.localeCompare(a.fechaInicio),
    )[0] ?? null
  )
}
