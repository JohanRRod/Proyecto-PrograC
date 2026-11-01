import { aNumero } from '@/lib/format'
import type { Plan } from '@/features/catalog/types'

function aFechaLocal(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00`)
}

/**
 * Replica el cálculo de MembresiaService.solicitarCancelacion:
 * meses entre el día 1 de este mes y el día 1 del mes de fin, +1 si hoy es un día
 * menor al día de fin, mínimo 1;
 * penalización = precio mensual × meses × porcentaje / 100.
 * Es una estimación para informar al miembro; el monto real lo calcula el backend.
 */
export function estadoPermanencia(fechaInicio: string, fechaFin: string, plan: Plan | undefined, hoy = new Date()) {
  const inicio = aFechaLocal(fechaInicio)
  const fin = aFechaLocal(fechaFin)
  const hoyLocal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

  const total = Math.max(1, fin.getTime() - inicio.getTime())
  const avance = Math.min(1, Math.max(0, (hoyLocal.getTime() - inicio.getTime()) / total))
  const cumplida = hoyLocal >= fin

  let meses = 0
  if (!cumplida) {
    meses = (fin.getFullYear() - hoyLocal.getFullYear()) * 12 + (fin.getMonth() - hoyLocal.getMonth())
    if (hoyLocal.getDate() < fin.getDate()) meses += 1
    meses = Math.max(1, meses)
  }

  const penalizacion = plan
    ? Math.round(aNumero(plan.precio_mensual) * meses * aNumero(plan.porcentaje_penalizacion)) / 100
    : null

  return { avance, cumplida, mesesRestantes: meses, penalizacion }
}
