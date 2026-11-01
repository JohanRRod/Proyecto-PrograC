import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Contenedor con borde fino. Sin sombras: la jerarquía la dan el espacio y la tipografía. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-panel border border-line bg-surface', className)}>{children}</section>
}

export function PanelHeader({ titulo, accion }: { titulo: string; accion?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
      <h2 className="text-lg">{titulo}</h2>
      {accion}
    </header>
  )
}
