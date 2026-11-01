import { env } from '@/config/env'
import { tokenActual } from '@/lib/supabase'

/** Error de la API con el código HTTP y un mensaje listo para mostrar. */
export class ApiError extends Error {
  readonly status: number
  readonly detalles: Record<string, string> | null

  constructor(status: number, mensaje: string, detalles: Record<string, string> | null = null) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
    this.detalles = detalles
  }
}

const MENSAJES_POR_ESTADO: Record<number, string> = {
  400: 'Los datos enviados no son válidos.',
  401: 'Tu sesión terminó. Vuelve a ingresar.',
  403: 'No tienes permiso para ver esta información.',
  404: 'No encontramos lo que buscas.',
  409: 'Ya existe un registro con esos datos.',
}

/**
 * El backend responde errores con dos formatos:
 *   { "error": "..." }                       (ResponseStatusException)
 *   { "mensaje": "...", "errores": {...} }   (validaciones)
 */
async function aApiError(res: Response): Promise<ApiError> {
  let mensaje = MENSAJES_POR_ESTADO[res.status] ?? `El servidor respondió con un error (${res.status}).`
  let detalles: Record<string, string> | null = null

  try {
    const cuerpo: unknown = await res.json()
    if (cuerpo && typeof cuerpo === 'object') {
      const c = cuerpo as Record<string, unknown>
      const texto = c.mensaje ?? c.error ?? c.message
      if (typeof texto === 'string' && texto !== 'null' && texto.trim() !== '') mensaje = texto
      if (c.errores && typeof c.errores === 'object') detalles = c.errores as Record<string, string>
    }
  } catch {
    // Respuesta sin JSON: se conserva el mensaje genérico.
  }

  return new ApiError(res.status, mensaje, detalles)
}

type Opciones = Omit<RequestInit, 'body'> & {
  /** Cuerpo a serializar como JSON. */
  json?: unknown
  /** false para endpoints públicos; evita leer la sesión. */
  auth?: boolean
}

async function solicitar(ruta: string, { json, auth = true, headers, ...init }: Opciones): Promise<Response> {
  const h = new Headers(headers)
  h.set('Accept', 'application/json')
  if (json !== undefined) h.set('Content-Type', 'application/json')

  if (auth) {
    const token = await tokenActual()
    if (token) h.set('Authorization', `Bearer ${token}`)
  }

  let res: Response
  try {
    res = await fetch(`${env.apiUrl}${ruta}`, {
      ...init,
      headers: h,
      body: json !== undefined ? JSON.stringify(json) : undefined,
    })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor de FlexPass. Revisa tu conexión o intenta de nuevo en unos minutos.')
  }

  if (!res.ok) throw await aApiError(res)
  return res
}

/** Solicitud que devuelve JSON (o undefined en 204). */
export async function api<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const res = await solicitar(ruta, opciones)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** Descarga un archivo (Excel/PDF) respetando el nombre que manda el servidor. */
export async function descargar(ruta: string, nombrePorDefecto: string): Promise<void> {
  const res = await solicitar(ruta, { headers: { Accept: '*/*' } })
  const disposicion = res.headers.get('Content-Disposition') ?? ''
  const nombre = /filename="?([^";]+)"?/i.exec(disposicion)?.[1] ?? nombrePorDefecto

  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
