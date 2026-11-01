import { api } from '@/lib/http'
import type { DocumentoRag, RespuestaChat, ResultadoIngesta } from './types'

/** Público: el asistente solo usa información pública, no hace falta sesión. */
export const preguntar = (mensaje: string, sesionId: string | null) =>
  api<RespuestaChat>('/ia/chat', { method: 'POST', json: { mensaje, sesionId }, auth: false })

export const listarDocumentosRag = () => api<DocumentoRag[]>('/ia/documentos')

export const recargarDocumentosRag = () => api<ResultadoIngesta>('/ia/ingesta', { method: 'POST' })
