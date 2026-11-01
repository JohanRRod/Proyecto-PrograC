import { useQuery } from '@tanstack/react-query'
import { listarMiHistorial, listarMisMembresias, listarMisMetodos, listarMisPeriodos } from './api'
import type { MiMembresia } from './types'

export const miKeys = {
  membresias: ['mi', 'membresias'] as const,
  metodos: ['mi', 'pagos', 'metodos'] as const,
  historial: ['mi', 'pagos', 'historial'] as const,
  periodos: ['mi', 'pagos', 'periodos'] as const,
}

export const useMisMembresias = () => useQuery({ queryKey: miKeys.membresias, queryFn: listarMisMembresias })
export const useMisMetodos = () => useQuery({ queryKey: miKeys.metodos, queryFn: listarMisMetodos })
export const useMiHistorial = () => useQuery({ queryKey: miKeys.historial, queryFn: listarMiHistorial })
export const useMisPeriodos = () => useQuery({ queryKey: miKeys.periodos, queryFn: listarMisPeriodos })

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
