export interface Pagina<T> {
  items: T[]
  total: number
  pagina: number
  tamano: number
}

/** GET /api/bitacora */
export interface Operacion {
  id: number
  fechaHora: string
  usuario: string | null
  modulo: string
  accion: string
  tabla: string
  registroId: string | null
  ip: string | null
  exitoso: boolean
  mensajeError: string | null
  tieneDatos: boolean
}

type Json = string | number | boolean | null | Json[] | { [clave: string]: Json }

/** GET /api/bitacora/{id} */
export interface OperacionDetalle extends Omit<Operacion, 'tieneDatos'> {
  antes: Json
  despues: Json
}

/** GET /api/bitacora/ia */
export interface Conversacion {
  id: number
  fechaHora: string
  sesionId: string
  clienteId: string | null
  pregunta: string
  respuesta: string
  documentosCitados: Json
  tokens: number
  tiempoMs: number
}

export interface FiltrosBitacora {
  desde: string
  hasta: string
  modulo: string
  accion: string
  /** '' = todos, 'si' = correctos, 'no' = con error */
  resultado: '' | 'si' | 'no'
  q: string
}

export type { Json }

/** Cómo se lee cada acción en la tabla. */
export const ACCIONES: Record<string, string> = {
  CREAR: 'Creó',
  ACTUALIZAR: 'Editó',
  ELIMINAR: 'Eliminó',
  DAR_DE_BAJA: 'Dio de baja',
  DESACTIVAR: 'Desactivó',
  CONTRATAR: 'Contrató plan',
  CANCELAR: 'Canceló membresía',
  REGISTRAR_METODO: 'Registró método de pago',
  COBRAR: 'Cobró',
  REGISTRAR_ENTRADA: 'Registró entrada',
  ASIGNAR_AMENIDAD: 'Asignó amenidad',
  ACTUALIZAR_AMENIDAD: 'Editó amenidad de sede',
  RESERVAR: 'Reservó clase',
  CANCELAR_RESERVA: 'Canceló reserva',
  MARCAR_ASISTENCIA: 'Marcó asistencia',
  INVITAR: 'Invitó a la app',
  RECARGAR_DOCUMENTOS: 'Recargó documentos',
  EXPORTAR: 'Exportó reporte',
}

/** Nombre legible de cada tabla. */
export const TABLAS: Record<string, string> = {
  clientes: 'Cliente',
  membresias: 'Membresía',
  metodos_pago_cliente: 'Método de pago',
  cobros_automaticos: 'Cobro',
  registros_acceso: 'Entrada',
  sucursales: 'Sede',
  sucursal_amenidades: 'Amenidad de sede',
  planes: 'Plan',
  amenidades: 'Amenidad',
  clases_grupales: 'Clase',
  instructores: 'Instructor',
  reservas_clases: 'Reserva',
  perfiles_usuario: 'Usuario',
  documentos_rag: 'Documentos del asistente',
  reportes: 'Reporte',
}
