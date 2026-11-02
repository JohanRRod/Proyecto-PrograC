export type { Cobro, MetodoPago } from '@/features/member/types'
export { CONCEPTOS, TIPOS_CUENTA } from '@/features/member/types'

/** Cuerpo de POST /api/pagos/metodos */
export interface MetodoPagoDatos {
  clienteId: string
  tipoCuenta: 'TARJETA_CREDITO' | 'TARJETA_DEBITO' | 'CUENTA_BANCARIA'
  bancoEmisor: string
  ultimosCuatroDigitos: string
  titular: string
}

/** Cuerpo de POST /api/pagos/cobros. El backend calcula el monto. */
export interface CobroDatos {
  membresiaId: number
  metodoPagoId: number
  concepto: 'MENSUALIDAD' | 'PENALIZACION_CANCELACION'
}
