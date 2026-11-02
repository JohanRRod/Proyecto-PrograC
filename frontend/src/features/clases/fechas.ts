import type { DiaSemana } from './types'

/*
 * Las clases se programan en hora de Guatemala. Las fechas se manejan como texto
 * "yyyy-mm-dd" y se calculan en UTC para que no se corran un día por la zona del navegador.
 */

const ZONA = 'America/Guatemala'

export const DIAS: DiaSemana[] = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']

export const NOMBRE_DIA: Record<DiaSemana, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
}

const partes = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** Fecha y hora actual en Guatemala como "yyyy-mm-ddTHH:mm:ss". */
export function ahoraGT(): string {
  const p = Object.fromEntries(partes.formatToParts(new Date()).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`
}

export const hoyGT = () => ahoraGT().slice(0, 10)

const aUTC = (iso: string) => new Date(`${iso}T00:00:00Z`)

export function sumarDias(iso: string, dias: number): string {
  const d = aUTC(iso)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Día de la semana de una fecha, con los nombres del backend. */
export function diaDe(iso: string): DiaSemana {
  return DIAS[(aUTC(iso).getUTCDay() + 6) % 7]
}

/** El lunes de la semana de esa fecha. */
export const lunesDe = (iso: string) => sumarDias(iso, -DIAS.indexOf(diaDe(iso)))

/** Fecha de ese día de la semana dentro de la semana que empieza en `lunes`. */
export const fechaEnSemana = (lunes: string, dia: DiaSemana) => sumarDias(lunes, DIAS.indexOf(dia))

export const esFecha = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(aUTC(v).getTime())

/** true si la clase de esa fecha ya empezó (hora de Guatemala). */
export function yaEmpezo(fecha: string, horaInicio: string, ahora = ahoraGT()): boolean {
  return `${fecha}T${horaInicio.length === 5 ? `${horaInicio}:00` : horaInicio}` <= ahora
}

const corto = new Intl.DateTimeFormat('es-GT', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
const largo = new Intl.DateTimeFormat('es-GT', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
const diaMes = new Intl.DateTimeFormat('es-GT', { timeZone: 'UTC', day: 'numeric', month: 'short' })

const limpiar = (t: string) => t.replaceAll('.', '').replace(',', '')

/** "lun 2 nov" */
export const fechaCorta = (iso: string) => limpiar(corto.format(aUTC(iso)))

/** "lunes 2 de noviembre" */
export const fechaLarga = (iso: string) => limpiar(largo.format(aUTC(iso)))

/** "2 nov" */
export const fechaDiaMes = (iso: string) => limpiar(diaMes.format(aUTC(iso)))

/** "Hoy", "Mañana" o "lun 2 nov". */
export function fechaRelativa(iso: string, hoy = hoyGT()): string {
  if (iso === hoy) return 'Hoy'
  if (iso === sumarDias(hoy, 1)) return 'Mañana'
  return fechaCorta(iso)
}

/** "07:00:00" -> "07:00" para inputs de hora y para enviar al backend. */
export const horaCorta = (h: string) => h.slice(0, 5)
