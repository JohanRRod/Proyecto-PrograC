// La membresía que devuelve /api/membresias tiene la misma forma que /api/mi/membresias.
export type { MiMembresia as Membresia } from '@/features/member/types'

/** Cuerpo de POST /api/membresias */
export interface ContratarDatos {
  clienteId: string
  planId: number
  metodoPagoId: number
  diaCorteMensual: number
}

/** Respuesta de POST /api/membresias/{id}/cancelacion */
export interface ResultadoCancelacion {
  cancelacionId: number
  membresiaId: number
  cumplioPermanenciaMinima: boolean
  mesesRestantes: number
  montoPenalizacion: number | string
  estadoMembresia: string
  /** CANCELACION_COMPLETADA o PENDIENTE_COBRO_PENALIZACION */
  resultado: string
}

/** La cancelación con penalización solo termina cuando se cobra la penalización. */
export const CANCELACION_PENDIENTE = 'PENDIENTE_COBRO_PENALIZACION'
export const YA_HAY_CANCELACION = 'Ya existe una solicitud de cancelacion'
