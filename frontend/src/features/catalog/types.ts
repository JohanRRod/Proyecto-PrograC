/** Tipos de /api/catalogo/**. Las columnas llegan en snake_case porque el backend devuelve filas SQL. */

type Decimal = number | string

export interface Pais {
  id: number
  nombre: string
  codigo_iso: string
  moneda: string
  simbolo_moneda: string
}

export interface Sucursal {
  id: number
  pais_id: number
  /** Nombre del país (JOIN en el backend). */
  pais: string
  nombre: string
  codigo_sucursal: string
  direccion: string
  ciudad: string
  latitud: Decimal
  longitud: Decimal
  telefono: string | null
  horario_apertura: string
  horario_cierre: string
  capacidad_maxima: number
  es_sede_vip: boolean
  activa: boolean
}

export interface Amenidad {
  id: number
  nombre: string
  descripcion: string | null
  icono_url: string | null
  requiere_plan_vip: boolean
}

export interface AmenidadSucursal extends Amenidad {
  disponible: boolean
  capacidad_zona: number | null
  horario_especial: string | null
}

export interface Plan {
  id: number
  nombre: string
  descripcion: string | null
  precio_mensual: Decimal
  cuota_inscripcion: Decimal
  cuota_mantenimiento_anual: Decimal
  meses_permanencia_minima: number
  porcentaje_penalizacion: Decimal
  permite_acceso_nacional: boolean
  permite_acceso_internacional: boolean
  permite_amenidades_vip: boolean
  invitados_mensuales_gratis: number
  activo: boolean
}
