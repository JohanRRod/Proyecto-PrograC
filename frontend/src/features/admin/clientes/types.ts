/** GET /api/clientes y /api/clientes/{id} (DTO de Java, camelCase) */
export interface Cliente {
  id: string
  nombres: string
  apellidos: string
  documentoIdentidad: string
  email: string
  telefono: string | null
  fechaNacimiento: string | null
  estado: 'ACTIVO' | 'MOROSO' | 'INACTIVO' | 'BLOQUEADO'
  sucursalBaseId: number
  createdAt: string | null
}

/** Cuerpo de POST /api/clientes y PUT /api/clientes/{id} */
export interface ClienteDatos {
  nombres: string
  apellidos: string
  documentoIdentidad: string
  email: string
  telefono: string | null
  fechaNacimiento: string | null
  sucursalBaseId: number
}

/** Respuesta de POST /api/auth/miembros/invitar */
export interface Invitacion {
  usuarioId: string
  clienteId: string
  estado: 'INVITACION_SOLICITADA'
}

export const nombreCompleto = (c: Pick<Cliente, 'nombres' | 'apellidos'>) => `${c.nombres} ${c.apellidos}`.trim()
