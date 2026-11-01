/** POST /api/ia/chat */
export interface FuenteRespuesta {
  numero: number
  titulo: string
  categoria: string
  seccion: string | null
}

export interface RespuestaChat {
  respuesta: string
  fuentes: FuenteRespuesta[]
  sesionId: string
}

/** POST /api/ia/ingesta (ADMIN) */
export interface ResultadoIngesta {
  documentos: number
  fragmentos: number
  archivos: { archivo: string; titulo: string; fragmentos: number }[]
}

/** GET /api/ia/documentos (ADMIN) */
export interface DocumentoRag {
  archivo: string
  titulo: string
  categoria: string
  fragmentos: number
  ingerido: string
}

export interface MensajeChat {
  id: number
  rol: 'usuario' | 'asistente'
  texto: string
  fuentes?: FuenteRespuesta[]
  error?: boolean
}
