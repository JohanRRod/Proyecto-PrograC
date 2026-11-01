const moneda = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
})

const fecha = new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })
const fechaHora = new Intl.DateTimeFormat('es-GT', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const mesAnio = new Intl.DateTimeFormat('es-GT', { month: 'long', year: 'numeric' })

/** El backend manda DECIMAL como number o string según el endpoint. */
export function aNumero(valor: number | string | null | undefined): number {
  if (valor === null || valor === undefined) return 0
  const n = typeof valor === 'number' ? valor : Number.parseFloat(valor)
  return Number.isFinite(n) ? n : 0
}

export function formatoMoneda(valor: number | string | null | undefined): string {
  return moneda.format(aNumero(valor))
}

/**
 * Las fechas sin hora ("2026-11-15") se interpretan como fecha local,
 * para que no se corran un día por la zona horaria.
 */
function aFecha(valor: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T00:00:00`) : new Date(valor)
}

export function formatoFecha(valor: string | null | undefined): string {
  if (!valor) return '—'
  const d = aFecha(valor)
  return Number.isNaN(d.getTime()) ? valor : fecha.format(d)
}

export function formatoFechaHora(valor: string | null | undefined): string {
  if (!valor) return '—'
  const d = aFecha(valor)
  return Number.isNaN(d.getTime()) ? valor : fechaHora.format(d)
}

export function formatoMes(valor: string | null | undefined): string {
  if (!valor) return '—'
  const d = aFecha(valor.length === 7 ? `${valor}-01` : valor)
  if (Number.isNaN(d.getTime())) return valor
  const texto = mesAnio.format(d)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** "05:00:00" -> "5:00" */
export function formatoHora(valor: string | null | undefined): string {
  if (!valor) return '—'
  const [h, m] = valor.split(':')
  return `${Number(h)}:${m}`
}

/** "SUSPENDIDA_IMPAGO" -> "Suspendida impago" */
export function legible(valor: string | null | undefined): string {
  if (!valor) return '—'
  const t = valor.replaceAll('_', ' ').toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}
