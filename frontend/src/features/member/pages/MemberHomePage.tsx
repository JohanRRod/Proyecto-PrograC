import { AlertTriangle, CalendarClock, Check, CreditCard, Minus } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/features/auth/AuthContext'
import { usePlanes } from '@/features/catalog/hooks'
import { beneficiosPlan } from '@/features/catalog/planes'
import type { Plan } from '@/features/catalog/types'
import { cn } from '@/lib/cn'
import { formatoFecha, formatoMoneda } from '@/lib/format'
import { Pase } from '../components/Pase'
import { membresiaPrincipal, useMisMembresias, useMisMetodos, useMisPeriodos } from '../hooks'
import { estadoPermanencia } from '../permanencia'
import { TIPOS_CUENTA, type MiMembresia } from '../types'

export function MemberHomePage() {
  const { correo } = useAuth()
  const membresias = useMisMembresias()
  const planes = usePlanes()

  if (membresias.isPending) return <Cargando texto="Cargando tu pase…" />
  if (membresias.isError) return <ErrorCarga error={membresias.error} onReintentar={() => void membresias.refetch()} />

  const membresia = membresiaPrincipal(membresias.data)

  if (!membresia) {
    return (
      <>
        <PageHeader titulo="Mi pase" />
        <Panel>
          <Vacio
            titulo="Aún no tienes una membresía"
            descripcion="Contrata un plan en la recepción de cualquier sede y aquí verás tu pase y tus cobros."
            accion={<ButtonLink to="/planes">Ver planes</ButtonLink>}
          />
        </Panel>
      </>
    )
  }

  const plan = planes.data?.find((p) => p.id === membresia.planId)

  return (
    <>
      <PageHeader titulo="Mi pase" />

      {membresia.estado === 'SUSPENDIDA_IMPAGO' && (
        <div role="alert" className="mb-5 flex gap-3 rounded-panel border border-plate-yellow/50 bg-plate-yellow-soft p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#7a5a06]" aria-hidden="true" />
          <p>
            Tu membresía está suspendida porque no se pudo cobrar la mensualidad. Revisa que tu método de pago tenga
            fondos; el cobro se reintenta automáticamente. Si necesitas cambiarlo, hazlo en recepción.
          </p>
        </div>
      )}

      <Pase membresia={membresia} plan={plan} correo={correo} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {membresia.estado !== 'CANCELADA' && membresia.estado !== 'FINALIZADA' && <ProximoCobro membresia={membresia} plan={plan} />}
        {plan && <Incluye plan={plan} />}
        {membresia.estado === 'ACTIVA' && <Permanencia membresia={membresia} plan={plan} />}
      </div>
    </>
  )
}

function ProximoCobro({ membresia, plan }: { membresia: MiMembresia; plan: Plan | undefined }) {
  const periodos = useMisPeriodos()
  const metodos = useMisMetodos()

  const pendiente = (periodos.data ?? [])
    .filter((p) => p.membresia_id === membresia.id && p.estado === 'PENDIENTE')
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))[0]
  const metodo = (metodos.data ?? []).find((m) => m.activo && m.es_predeterminado) ?? metodos.data?.find((m) => m.activo)

  return (
    <Panel>
      <PanelHeader titulo="Próximo cobro" accion={<ButtonLink to="/mi/pagos" variante="fantasma" tamano="sm">Ver pagos</ButtonLink>} />
      <div className="space-y-4 p-4 sm:p-5">
        {periodos.isPending || metodos.isPending ? (
          <Cargando className="py-4" />
        ) : periodos.isError ? (
          <ErrorCarga error={periodos.error} onReintentar={() => void periodos.refetch()} />
        ) : (
          <>
            <div className="flex gap-3">
              <CalendarClock className="mt-0.5 size-5 shrink-0 text-steel" aria-hidden="true" />
              <p>
                {plan && <span className="font-display text-2xl font-bold tabular-nums">{formatoMoneda(plan.precio_mensual)}</span>}
                <span className="block text-steel">
                  {pendiente
                    ? `Vence el ${formatoFecha(pendiente.fecha_vencimiento)}${pendiente.intentos > 0 ? `. Se ha intentado cobrar ${pendiente.intentos} ${pendiente.intentos === 1 ? 'vez' : 'veces'}.` : ''}`
                    : `Se cobra el día ${membresia.diaCorteMensual} de cada mes.`}
                </span>
              </p>
            </div>
            <div className="flex gap-3">
              <CreditCard className="mt-0.5 size-5 shrink-0 text-steel" aria-hidden="true" />
              <p>
                {metodo ? (
                  <>
                    {TIPOS_CUENTA[metodo.tipo_cuenta]} {metodo.banco_emisor} terminada en {metodo.ultimos_cuatro_digitos}
                  </>
                ) : (
                  <span className="text-steel">No tienes un método de pago registrado. Regístralo en recepción.</span>
                )}
                {!membresia.descuentoAutomaticoActivo && (
                  <span className="block text-sm text-steel">El cobro automático está desactivado para esta membresía.</span>
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </Panel>
  )
}

function Incluye({ plan }: { plan: Plan }) {
  return (
    <Panel>
      <PanelHeader titulo="Qué incluye tu plan" />
      <ul className="space-y-2.5 p-4 sm:p-5">
        {beneficiosPlan(plan).map((b) => (
          <li key={b.texto} className={cn('flex gap-2.5', !b.incluido && 'text-steel')}>
            {b.incluido ? (
              <Check className="mt-0.5 size-4 shrink-0 text-plate-green" aria-label="Incluido" />
            ) : (
              <Minus className="mt-0.5 size-4 shrink-0 text-steel/60" aria-label="No incluido" />
            )}
            {b.texto}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function Permanencia({ membresia, plan }: { membresia: MiMembresia; plan: Plan | undefined }) {
  const p = estadoPermanencia(membresia.fechaInicio, membresia.fechaFinPermanenciaMinima, plan)

  return (
    <Panel className="lg:col-span-2">
      <PanelHeader titulo="Permanencia mínima" />
      <div className="p-4 sm:p-5">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(p.avance * 100)}
          aria-label="Avance de la permanencia mínima"
          className="h-2 overflow-hidden rounded-full bg-chalk"
        >
          <div className="h-full rounded-full bg-plate-green" style={{ width: `${p.avance * 100}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-sm text-steel">
          <span>{formatoFecha(membresia.fechaInicio)}</span>
          <span>{formatoFecha(membresia.fechaFinPermanenciaMinima)}</span>
        </div>
        <p className="mt-4">
          {p.cumplida ? (
            'Ya cumpliste la permanencia mínima. Si cancelas, no se cobra penalización.'
          ) : (
            <>
              Te {p.mesesRestantes === 1 ? 'falta 1 mes' : `faltan ${p.mesesRestantes} meses`} para cumplir la
              permanencia.
              {p.penalizacion !== null && (
                <>
                  {' '}
                  Si cancelaras hoy, la penalización estimada sería de{' '}
                  <span className="font-medium tabular-nums">{formatoMoneda(p.penalizacion)}</span>.
                </>
              )}
            </>
          )}
        </p>
      </div>
    </Panel>
  )
}
