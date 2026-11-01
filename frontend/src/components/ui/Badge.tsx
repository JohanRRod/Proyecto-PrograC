import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type Tono = 'neutro' | 'exito' | 'aviso' | 'peligro' | 'info' | 'tinta'

const tonos: Record<Tono, string> = {
  neutro: 'bg-chalk text-steel ring-line',
  exito: 'bg-plate-green-soft text-plate-green ring-plate-green/25',
  aviso: 'bg-plate-yellow-soft text-[#7a5a06] ring-plate-yellow/40',
  peligro: 'bg-plate-red-soft text-plate-red ring-plate-red/25',
  info: 'bg-plate-blue-soft text-plate-blue ring-plate-blue/25',
  tinta: 'bg-ink text-white ring-ink',
}

export function Badge({ tono = 'neutro', children, className }: { tono?: Tono; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.8rem] font-medium ring-1 ring-inset',
        tonos[tono],
        className,
      )}
    >
      {children}
    </span>
  )
}

const TONO_POR_ESTADO: Record<string, Tono> = {
  ACTIVA: 'exito',
  ACTIVO: 'exito',
  EXITOSO: 'exito',
  PAGADO: 'exito',
  PENDIENTE: 'aviso',
  SUSPENDIDA_IMPAGO: 'aviso',
  MOROSO: 'peligro',
  RECHAZADO_FONDOS: 'peligro',
  CANCELADA: 'peligro',
  BLOQUEADO: 'peligro',
  FINALIZADA: 'neutro',
  INACTIVO: 'neutro',
}

const TEXTO_POR_ESTADO: Record<string, string> = {
  SUSPENDIDA_IMPAGO: 'Suspendida por impago',
  RECHAZADO_FONDOS: 'Rechazado: fondos insuficientes',
}

/** Insignia con el color definido en la spec para cada estado del backend. */
export function EstadoBadge({ estado }: { estado: string | null | undefined }) {
  if (!estado) return <Badge>Sin estado</Badge>
  const texto = TEXTO_POR_ESTADO[estado] ?? estado.charAt(0) + estado.slice(1).toLowerCase().replaceAll('_', ' ')
  return <Badge tono={TONO_POR_ESTADO[estado] ?? 'neutro'}>{texto}</Badge>
}
