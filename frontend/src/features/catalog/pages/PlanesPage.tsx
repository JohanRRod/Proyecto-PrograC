import { Check, Minus } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { cn } from '@/lib/cn'
import { aNumero, formatoMoneda } from '@/lib/format'
import { usePlanes } from '../hooks'
import { beneficiosPlan, estiloNivel, nivelPlan } from '../planes'
import type { Plan } from '../types'

export function PlanesPage() {
  const planes = usePlanes()

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <h1 className="text-3xl sm:text-4xl">Elige dónde quieres entrenar</h1>
      <p className="mt-2 max-w-2xl text-steel">
        Todos los planes se cobran cada mes de forma automática a tu tarjeta o cuenta. La diferencia está en cuántas
        sedes puedes usar y a qué zonas entras.
      </p>

      <div className="mt-10">
        {planes.isPending ? (
          <Cargando texto="Cargando planes…" />
        ) : planes.isError ? (
          <ErrorCarga error={planes.error} onReintentar={() => void planes.refetch()} />
        ) : planes.data.length === 0 ? (
          <Vacio titulo="No hay planes disponibles" descripcion="Vuelve más tarde o pregunta en recepción." />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {planes.data.map((p) => (
              <TarjetaPlan key={p.id} plan={p} />
            ))}
          </div>
        )}
      </div>

      <p className="mt-10 max-w-2xl text-sm text-steel">
        La membresía se contrata en recepción de cualquier sede. Si cancelas antes de cumplir la permanencia mínima, se
        cobra una penalización sobre los meses que faltan.
      </p>
    </div>
  )
}

function TarjetaPlan({ plan }: { plan: Plan }) {
  const nivel = estiloNivel[nivelPlan(plan)]
  const inscripcion = aNumero(plan.cuota_inscripcion)

  return (
    <article className="flex flex-col overflow-hidden rounded-panel border border-line bg-surface">
      <div className={cn('h-2', nivel.banda)} aria-hidden="true" />
      <div className="flex flex-1 flex-col p-6">
        <p className={cn('font-display text-sm font-semibold', nivel.texto)}>{nivel.etiqueta}</p>
        <h2 className="mt-0.5 text-2xl">{plan.nombre}</h2>
        <p className="mt-4 flex items-baseline gap-1.5">
          <span className="font-display text-4xl font-bold tabular-nums">{formatoMoneda(plan.precio_mensual)}</span>
          <span className="text-steel">al mes</span>
        </p>
        <p className="mt-3 text-[0.95rem] text-steel lg:min-h-[4.5rem]">{plan.descripcion}</p>

        <ul className="mt-5 space-y-2.5">
          {beneficiosPlan(plan).map((b) => (
            <li key={b.texto} className={cn('flex gap-2.5 text-[0.95rem]', !b.incluido && 'text-steel')}>
              {b.incluido ? (
                <Check className="mt-0.5 size-4 shrink-0 text-plate-green" aria-label="Incluido" />
              ) : (
                <Minus className="mt-0.5 size-4 shrink-0 text-steel/60" aria-label="No incluido" />
              )}
              {b.texto}
            </li>
          ))}
        </ul>

        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-5 text-sm">
          <div>
            <dt className="text-steel">Inscripción</dt>
            <dd className="font-medium tabular-nums">{inscripcion > 0 ? formatoMoneda(inscripcion) : 'Sin costo'}</dd>
          </div>
          <div>
            <dt className="text-steel">Mantenimiento anual</dt>
            <dd className="font-medium tabular-nums">{formatoMoneda(plan.cuota_mantenimiento_anual)}</dd>
          </div>
          <div>
            <dt className="text-steel">Permanencia mínima</dt>
            <dd className="font-medium">{plan.meses_permanencia_minima} meses</dd>
          </div>
          <div>
            <dt className="text-steel">Penalización</dt>
            <dd className="font-medium">{aNumero(plan.porcentaje_penalizacion)}% de los meses que faltan</dd>
          </div>
        </dl>

        <div className="mt-auto pt-6">
          <ButtonLink to="/" variante="secundario" className="w-full">
            Ver sedes
          </ButtonLink>
        </div>
      </div>
    </article>
  )
}
