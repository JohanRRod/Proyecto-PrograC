import type { ReactNode } from 'react'
import { BrandMark } from '@/components/layout/Brand'
import { EstadoBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { formatoFecha } from '@/lib/format'
import { estiloNivel, nivelPlan } from '@/features/catalog/planes'
import type { Plan } from '@/features/catalog/types'
import type { MiMembresia } from '../types'

/**
 * El pase del miembro. Es el único elemento "de marca" del área privada:
 * la banda lateral lleva el color del plan, como el disco que corresponde a su peso.
 */
export function Pase({ membresia, plan, correo }: { membresia: MiMembresia; plan: Plan | undefined; correo: string | null }) {
  const nivel = plan ? estiloNivel[nivelPlan(plan)] : null
  const inactiva = membresia.estado === 'CANCELADA' || membresia.estado === 'FINALIZADA'

  return (
    <article
      aria-label="Tu pase FlexPass"
      className={cn(
        'relative overflow-hidden rounded-panel border border-line bg-surface pl-3',
        inactiva && 'opacity-75',
      )}
    >
      <div className={cn('absolute inset-y-0 left-0 w-3', nivel?.banda ?? 'bg-line-strong')} aria-hidden="true" />
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <BrandMark className="size-6" />
            <span className="font-display font-semibold">FlexPass</span>
          </div>
          <EstadoBadge estado={membresia.estado} />
        </div>

        <p className={cn('mt-7 font-display text-sm font-semibold', nivel?.texto ?? 'text-steel')}>
          {nivel ? `Plan ${nivel.etiqueta}` : 'Plan'}
        </p>
        <h2 className="text-3xl sm:text-4xl">{plan?.nombre ?? `Plan ${membresia.planId}`}</h2>
        {correo && <p className="mt-1 text-steel">{correo}</p>}

        <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Dato etiqueta="Miembro desde">{formatoFecha(membresia.fechaInicio)}</Dato>
          <Dato etiqueta="Permanencia hasta">{formatoFecha(membresia.fechaFinPermanenciaMinima)}</Dato>
          <Dato etiqueta="Día de cobro">Día {membresia.diaCorteMensual} de cada mes</Dato>
          <Dato etiqueta="Membresía">N.º {String(membresia.id).padStart(6, '0')}</Dato>
        </dl>
      </div>
    </article>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-steel">{etiqueta}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{children}</dd>
    </div>
  )
}
