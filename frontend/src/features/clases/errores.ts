/** Mensajes para los códigos que manda el backend al reservar, cancelar o marcar asistencia (vista del admin). */
export const ERRORES_RESERVA: Record<string, string> = {
  CLASE_NO_EXISTE: 'La clase ya no existe.',
  RESERVA_NO_EXISTE: 'La reserva ya no existe.',
  FECHA_OBLIGATORIA: 'Falta la fecha de la clase.',
  FECHA_U_HORA_PASADA: 'Esa clase ya empezó o ya pasó; no se puede reservar.',
  DIA_NO_COINCIDE: 'La fecha no corresponde al día de la clase.',
  CLIENTE_NO_EXISTE: 'No encontramos a ese cliente.',
  CLIENTE_NO_ACTIVO: 'El cliente no está activo (puede estar moroso, bloqueado o dado de baja).',
  SUCURSAL_NO_EXISTE: 'La sede de la clase ya no existe.',
  SUCURSAL_INACTIVA: 'La sede de la clase está inactiva.',
  SIN_MEMBRESIA_ACTIVA: 'El cliente no tiene una membresía activa.',
  PLAN_SIN_ACCESO_NACIONAL: 'El plan del cliente solo le permite su sede base.',
  PLAN_SIN_ACCESO_INTERNACIONAL: 'El plan del cliente no incluye sedes de otros países.',
  SEDE_VIP_NO_PERMITIDA: 'La sede es exclusiva para el plan Black y el cliente tiene otro plan.',
  CLASE_VIP_NO_PERMITIDA: 'La clase es solo para el plan Black y el cliente tiene otro plan.',
  RESERVA_DUPLICADA: 'El cliente ya tiene reservada esta clase.',
  CLASE_SIN_CUPOS: 'La clase ya no tiene cupos.',
  RESERVA_NO_ACTIVA: 'La reserva ya estaba cancelada o cerrada.',
  CLASE_YA_INICIADA: 'La clase ya empezó; ya no se puede cancelar.',
  RESERVA_CANCELADA: 'La reserva está cancelada; no se puede marcar asistencia.',
  CLASE_NO_INICIADA: 'La asistencia se marca cuando la clase ya empezó.',
}

/** Los mismos códigos, explicados al miembro. */
export const ERRORES_MI_RESERVA: Record<string, string> = {
  ...ERRORES_RESERVA,
  FECHA_U_HORA_PASADA: 'Esa clase ya empezó.',
  CLIENTE_NO_ACTIVO: 'Tu cuenta no está activa. Acércate a recepción para revisarla.',
  SUCURSAL_INACTIVA: 'Esta sede no está abierta por ahora.',
  SIN_MEMBRESIA_ACTIVA: 'No tienes una membresía activa. Contrata un plan en recepción para reservar clases.',
  PLAN_SIN_ACCESO_NACIONAL: 'Tu plan solo incluye tu sede base. Para reservar en otras sedes necesitas el plan Nacional o Black.',
  PLAN_SIN_ACCESO_INTERNACIONAL: 'Tu plan no incluye sedes de otros países. Para eso necesitas el plan Black.',
  SEDE_VIP_NO_PERMITIDA: 'Esta sede es exclusiva para miembros con plan Black.',
  CLASE_VIP_NO_PERMITIDA: 'Esta clase es solo para miembros con plan Black.',
  RESERVA_DUPLICADA: 'Ya tienes reservada esta clase.',
  CLASE_SIN_CUPOS: 'Se acaban de llenar los cupos de esta clase.',
  RESERVA_NO_ACTIVA: 'Esa reserva ya estaba cancelada.',
  CLASE_YA_INICIADA: 'La clase ya empezó; ya no se puede cancelar.',
  FECHA_FUERA_DE_RANGO: 'Solo puedes reservar clases de los próximos 7 días.',
}

/** Al crear o editar una clase. */
export const ERRORES_CLASE: Record<string, string> = {
  CLASE_NO_EXISTE: 'La clase ya no existe.',
  DIA_INVALIDO: 'Elige un día de la semana.',
  HORARIO_INVALIDO: 'La hora de inicio debe ser antes de la de fin.',
  SUCURSAL_NO_EXISTE: 'La sede ya no existe.',
  FUERA_DEL_HORARIO_DE_LA_SEDE: 'La clase tiene que quedar dentro del horario de la sede.',
  INSTRUCTOR_NO_EXISTE: 'El instructor ya no existe.',
  INSTRUCTOR_INACTIVO: 'Ese instructor está inactivo; elige otro.',
  INSTRUCTOR_OCUPADO: 'El instructor ya tiene otra clase a esa hora ese día.',
  CLASE_CON_RESERVAS: 'Hay reservas para las próximas fechas; no se puede cambiar el día ni la sede. Crea una clase nueva o cancela esas reservas primero.',
  CUPO_MENOR_A_RESERVAS: 'Ya hay más reservas que ese cupo en una de las próximas fechas.',
}

export const ERRORES_INSTRUCTOR: Record<string, string> = {
  SUCURSAL_NO_EXISTE: 'La sede ya no existe.',
  EMAIL_INSTRUCTOR_REPETIDO: 'Ya hay otro instructor con ese correo.',
  INSTRUCTOR_NO_EXISTE: 'El instructor ya no existe.',
}

/** Texto del error para mostrar: el del código si se conoce, si no el mensaje del servidor. */
export function mensajeDe(error: unknown, mapa: Record<string, string>, porDefecto = 'No se pudo completar. Intenta de nuevo.'): string | null {
  if (!error) return null
  if (error instanceof Error) return mapa[error.message] ?? error.message ?? porDefecto
  return porDefecto
}
