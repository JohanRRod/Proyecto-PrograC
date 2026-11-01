import { Link } from 'react-router'
import { cn } from '@/lib/cn'

/** Marca: un disco visto de frente. El aro azul es el mismo color del plan Nacional y de las acciones. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-7', className)}>
      <rect width="32" height="32" rx="7" fill="var(--color-ink)" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="var(--color-plate-blue)" strokeWidth="4" />
      <circle cx="16" cy="16" r="2.6" fill="var(--color-chalk)" />
    </svg>
  )
}

export function Brand({ to = '/', invertido = false }: { to?: string; invertido?: boolean }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5 rounded-control" aria-label="FlexPass, inicio">
      <BrandMark />
      <span className={cn('font-display text-xl font-bold tracking-tight', invertido ? 'text-white' : 'text-ink')}>
        FlexPass
      </span>
    </Link>
  )
}
