import { api } from '@/lib/http'
import type { Conversacion, FiltrosBitacora, Operacion, OperacionDetalle, Pagina } from './types'

function consulta(valores: Record<string, string | number>) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(valores)) if (v !== '') p.set(k, String(v))
  return p.toString()
}

export const buscarOperaciones = (f: FiltrosBitacora, pagina: number, tamano: number) =>
  api<Pagina<Operacion>>(
    `/bitacora?${consulta({
      desde: f.desde,
      hasta: f.hasta,
      modulo: f.modulo,
      accion: f.accion,
      exitoso: f.resultado === '' ? '' : f.resultado === 'si' ? 'true' : 'false',
      q: f.q.trim(),
      pagina,
      tamano,
    })}`,
  )

export const obtenerOperacion = (id: number) => api<OperacionDetalle>(`/bitacora/${id}`)

export const opcionesBitacora = () => api<{ modulos: string[]; acciones: string[] }>('/bitacora/opciones')

export const buscarConversaciones = (desde: string, hasta: string, pagina: number, tamano: number) =>
  api<Pagina<Conversacion>>(`/bitacora/ia?${consulta({ desde, hasta, pagina, tamano })}`)
