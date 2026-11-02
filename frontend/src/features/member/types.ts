type Decimal = number | string

/** GET /api/mi/membresias (DTO de Java, camelCase) */
export interface MiMembresia {
  id: number
  clienteId: string
  planId: number
  metodoPagoId: number | null
  fechaInicio: string
  fechaFinPermanenciaMinima: string
  diaCorteMensual: number
  descuentoAutomaticoActivo: boolean
  estado: 'ACTIVA' | 'SUSPENDIDA_IMPAGO' | 'CANCELADA' | 'FINALIZADA'
}

/** GET /api/mi/pagos/metodos (fila SQL, snake_case) */
export interface MetodoPago {
  id: number
  cliente_id: string
  tipo_cuenta: 'TARJETA_CREDITO' | 'TARJETA_DEBITO' | 'CUENTA_BANCARIA'
  banco_emisor: string
  ultimos_cuatro_digitos: string
  es_predeterminado: boolean
  activo: boolean
}

/** GET /api/mi/pagos/historial */
export interface Cobro {
  id: number
  membresia_id: number
  concepto: 'MENSUALIDAD' | 'INSCRIPCION' | 'MANTENIMIENTO_ANUAL' | 'PENALIZACION_CANCELACION'
  monto_bruto: Decimal
  descuento_aplicado: Decimal
  monto_total_cobrado: Decimal
  fecha_intento: string
  estado_transaccion: 'EXITOSO' | 'RECHAZADO_FONDOS' | 'PENDIENTE'
  referencia_transaccion: string
}

/** GET /api/mi/pagos/periodos */
export interface Periodo {
  id: number
  membresia_id: number
  periodo: string
  fecha_vencimiento: string
  estado: 'PAGADO' | 'PENDIENTE' | string
  cobro_exitoso_id: number | null
  intentos: number
  ultimo_intento: string | null
}

export const CONCEPTOS: Record<Cobro['concepto'], string> = {
  MENSUALIDAD: 'Mensualidad',
  INSCRIPCION: 'Inscripción',
  MANTENIMIENTO_ANUAL: 'Mantenimiento anual',
  PENALIZACION_CANCELACION: 'Penalización por cancelación',
}

export const TIPOS_CUENTA: Record<MetodoPago['tipo_cuenta'], string> = {
  TARJETA_CREDITO: 'Tarjeta de crédito',
  TARJETA_DEBITO: 'Tarjeta de débito',
  CUENTA_BANCARIA: 'Cuenta bancaria',
}
