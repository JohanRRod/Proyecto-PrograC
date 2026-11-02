/** Cuerpo de POST /api/accesos/checkin */
export interface CheckInDatos {
  clienteId: string
  sucursalId: number
  amenidadId: number | null
}

export type TipoAcceso = 'SEDE_BASE' | 'NACIONAL' | 'INTERNACIONAL' | 'ZONA_EXCLUSIVA_VIP'

/** Respuesta de POST /api/accesos/checkin */
export interface ResultadoCheckIn {
  permitido: boolean
  tipo: TipoAcceso
  motivo: string | null
}

/** GET /api/accesos/historial/{clienteId} (fila SQL) */
export interface RegistroAcceso {
  id: number
  cliente_id: string
  sucursal_id: number
  amenidad_id: number | null
  fecha_hora_acceso: string
  tipo_acceso: TipoAcceso
  acceso_permitido: boolean
  motivo_rechazo: string | null
}
