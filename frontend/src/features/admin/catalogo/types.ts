import type { Plan, Sucursal } from '@/features/catalog/types'

/** GET /api/sucursales: fila SQL completa (incluye las inactivas, sin el nombre del país). */
export type SucursalAdmin = Omit<Sucursal, 'pais'> & { created_at: string }

/** Cuerpo de POST/PUT /api/sucursales (SucursalRequest). */
export interface SucursalDatos {
  paisId: number
  nombre: string
  codigoSucursal: string
  direccion: string
  ciudad: string
  latitud: number
  longitud: number
  telefono: string | null
  horarioApertura: string
  horarioCierre: string
  capacidadMaxima: number
  esSedeVip: boolean
  activa: boolean
}

/** GET /api/planes: igual que el catálogo pero incluye los inactivos. */
export type PlanAdmin = Plan

/** Cuerpo de POST/PUT /api/planes (PlanRequest). */
export interface PlanDatos {
  nombre: string
  descripcion: string | null
  precioMensual: number
  cuotaInscripcion: number
  cuotaMantenimientoAnual: number
  mesesPermanenciaMinima: number
  porcentajePenalizacion: number
  permiteAccesoNacional: boolean
  permiteAccesoInternacional: boolean
  permiteAmenidadesVip: boolean
  invitadosMensualesGratis: number
  activo: boolean
}

/** GET /api/amenidades (entidad JPA, en camelCase). */
export interface AmenidadAdmin {
  id: number
  nombre: string
  descripcion: string | null
  iconoUrl: string | null
  requierePlanVip: boolean
  createdAt: string
}

export interface AmenidadDatos {
  nombre: string
  descripcion: string | null
  iconoUrl: string | null
  requierePlanVip: boolean
}

/** GET /api/sucursales/{id}/amenidades: amenidad asignada a una sede. */
export interface Asignacion {
  id: number
  sucursalId: number
  amenidadId: number
  disponible: boolean
  capacidadZona: number
  horarioEspecial: string | null
}

export interface AsignacionDatos {
  amenidadId: number
  disponible: boolean
  capacidadZona: number
  horarioEspecial: string | null
}

/** Códigos de error de AmenidadService traducidos. */
export const ERRORES_AMENIDAD: Record<string, string> = {
  AMENIDAD_YA_ASIGNADA: 'Esa amenidad ya está asignada a esta sede.',
  AMENIDAD_NO_EXISTE: 'La amenidad ya no existe.',
  AMENIDAD_NO_ASIGNADA: 'La amenidad no está asignada a esta sede.',
  SUCURSAL_NO_EXISTE: 'La sede ya no existe.',
}
