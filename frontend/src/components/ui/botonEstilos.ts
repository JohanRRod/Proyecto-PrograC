import { cn } from '@/lib/cn'

export type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'
export type Tamano = 'md' | 'sm'

const base =
  'inline-flex items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-60'

const variantes: Record<Variante, string> = {
  primario: 'bg-plate-blue text-white hover:bg-plate-blue-dark',
  secundario: 'border border-line-strong bg-surface text-ink hover:bg-chalk',
  fantasma: 'text-ink-soft hover:bg-ink/5',
  peligro: 'bg-plate-red text-white hover:bg-plate-red/90',
}

const tamanos: Record<Tamano, string> = {
  md: 'h-11 px-4 text-[0.95rem]',
  sm: 'h-9 px-3 text-sm',
}

export function clasesBoton(variante: Variante = 'primario', tamano: Tamano = 'md', extra?: string) {
  return cn(base, variantes[variante], tamanos[tamano], extra)
}
