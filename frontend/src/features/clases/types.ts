export type DiaSemana = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO' | 'DOMINGO'
export type EstadoReserva = 'RESERVADA' | 'ASISTIO' | 'CANCELADA' | 'INASISTENCIA'

/** GET /api/clases (entidad de Java, camelCase). Las horas vienen como "07:00:00". */
export interface Clase {
  id: number
  sucursalId: number
  instructorId: number
  nombreClase: string
  diaSemana: DiaSemana
  horaInicio: string
  horaFin: string
  cupoMaximo: number
  requierePlanVip: boolean | null
}

/** Cuerpo de POST /api/clases y PUT /api/clases/{id} */
export interface ClaseDatos {
  sucursalId: number
  instructorId: number
  nombreClase: string
  diaSemana: DiaSemana
  horaInicio: string
  horaFin: string
  cupoMaximo: number
  requierePlanVip: boolean
}

/** GET /api/instructores */
export interface Instructor {
  id: number
  sucursalBaseId: number
  sucursal: string
  nombreCompleto: string
  especialidad: string
  email: string
  telefono: string | null
  activo: boolean
  /** Cuántas clases tiene asignadas. */
  clases: number
}

export interface InstructorDatos {
  sucursalBaseId: number
  nombreCompleto: string
  especialidad: string
  email: string
  telefono: string | null
  activo: boolean
}

/** GET /api/clases/ocupacion: reservas de una clase en una fecha, por estado. */
export interface Ocupacion {
  claseId: number
  fecha: string
  reservadas: number
  asistieron: number
  inasistencias: number
}

/** GET /api/clases/{id}/reservas?fecha= */
export interface ReservaDeClase {
  id: number
  clienteId: string
  nombreCliente: string
  documento: string
  estado: EstadoReserva
  createdAt: string
}

/** Respuesta de crear, cancelar o marcar asistencia (entidad de Java). */
export interface Reserva {
  id: number
  claseId: number
  clienteId: string
  fechaClase: string
  estado: EstadoReserva
  createdAt: string | null
}

/** Una clase en una fecha concreta, como la ve el miembro. */
export interface MiClase {
  claseId: number
  nombreClase: string
  instructor: string
  fecha: string
  diaSemana: DiaSemana
  horaInicio: string
  horaFin: string
  cupoMaximo: number
  reservadas: number
  requierePlanVip: boolean
  /** Id de la reserva del miembro en esa clase y fecha, si ya reservó. */
  miReservaId: number | null
}

/** GET /api/mi/clases */
export interface MisClases {
  sucursalId: number
  sucursal: string
  esSedeBase: boolean
  permiteVip: boolean
  /** Código por el que no puede reservar en esta sede, o null. */
  motivoSede: string | null
  clases: MiClase[]
}

/** GET /api/mi/reservas */
export interface MiReserva {
  id: number
  claseId: number
  nombreClase: string
  instructor: string
  sucursalId: number
  sucursal: string
  fechaClase: string
  horaInicio: string
  horaFin: string
  estado: EstadoReserva
  createdAt: string
}

export const ESTADOS_RESERVA: Record<EstadoReserva, string> = {
  RESERVADA: 'Reservada',
  ASISTIO: 'Asistió',
  CANCELADA: 'Cancelada',
  INASISTENCIA: 'No asistió',
}
