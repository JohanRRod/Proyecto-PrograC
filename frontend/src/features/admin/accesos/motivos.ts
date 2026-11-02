import type { TipoAcceso } from './types'

/** Códigos de AccesoService traducidos a lo que se le dice al cliente en recepción. */
export const MOTIVOS_RECHAZO: Record<string, string> = {
  CLIENTE_NO_ACTIVO: 'El cliente no está activo: está dado de baja, moroso o bloqueado.',
  SUCURSAL_INACTIVA: 'Esta sede no está activa.',
  SIN_MEMBRESIA_ACTIVA: 'No tiene una membresía activa. Puede estar suspendida por impago o cancelada.',
  PLAN_SIN_ACCESO_NACIONAL: 'Su plan solo permite entrar a su sede base.',
  PLAN_SIN_ACCESO_INTERNACIONAL: 'Su plan no incluye sedes de otros países.',
  SEDE_VIP_NO_PERMITIDA: 'Esta sede es exclusiva del plan Black.',
  AMENIDAD_NO_DISPONIBLE: 'Esa zona no está disponible en esta sede.',
  AMENIDAD_VIP_NO_PERMITIDA: 'Esa zona es exclusiva del plan Black.',
  CHECKIN_DUPLICADO: 'Ya se registró una entrada igual hace menos de 5 minutos.',
}

export const TIPOS_ACCESO: Record<TipoAcceso, string> = {
  SEDE_BASE: 'Sede base',
  NACIONAL: 'Acceso nacional',
  INTERNACIONAL: 'Acceso internacional',
  // El backend usa este tipo para cualquier entrada a una zona, sea exclusiva o no.
  ZONA_EXCLUSIVA_VIP: 'Acceso a zona',
}

export const motivoLegible = (codigo: string | null) =>
  codigo ? (MOTIVOS_RECHAZO[codigo] ?? codigo) : 'Rechazado.'
