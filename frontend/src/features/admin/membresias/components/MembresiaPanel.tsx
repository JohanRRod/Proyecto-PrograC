import { useState, type ReactNode } from 'react'
import { BadgeCheck, CircleDollarSign, Plus, XCircle } from 'lucide-react'
import { EstadoBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { usePlanes } from '@/features/catalog/hooks'
import { estiloNivel, nivelPlan } from '@/features/catalog/planes'
import type { Plan } from '@/features/catalog/types'
import { cn } from '@/lib/cn'
import { formatoFecha, formatoMoneda } from '@/lib/format'
import { CobrarModal } from '../../pagos/components/CobrarModal'
import { describirMetodo } from '../../pagos/formato'
import { useMetodosDeCliente } from '../../pagos/hooks'
import { useMembresiasDeCliente } from '../hooks'
import type { Membresia } from '../types'
import { CancelarModal } from './CancelarModal'
import { ContratarModal } from './ContratarModal'

type Ventana = 'contratar' | 'cancelar' | 'cobrar' | null

const ORDEN: Record<Membresia['estado'], number> = { ACTIVA: 0, SUSPENDIDA_IMPAGO: 1, CANCELADA: 2, FINALIZADA: 3 }

interface Props {
  clienteId: string
  clienteActivo: boolean
  onAviso: (mensaje: string) => void
  onAgregarMetodo: () => void
}

export function MembresiaPanel({ clienteId, clienteActivo, onAviso, onAgregarMetodo }: Props) {
  const membresias = useMembresiasDeCliente(clienteId)
  const metodos = useMetodosDeCliente(clienteId)
  const planes = usePlanes()
  const [ventana, setVentana] = useState<Ventana>(null)

  const ordenadas = [...(membresias.data ?? [])].sort(
    (a, b) => ORDEN[a.estado] - ORDEN[b.estado] || b.fechaInicio.localeCompare(a.fechaInicio),
  )
  const vigente = ordenadas.find((m) => m.estado === 'ACTIVA' || m.estado === 'SUSPENDIDA_IMPAGO') ?? null
  const anteriores = ordenadas.filter((m) => m !== vigente)
  const planDe = (id: number) => planes.data?.find((p) => p.id === id)
  const listaMetodos = metodos.data ?? []
  const metodoVigente = vigente ? listaMetodos.find((m) => m.id === vigente.metodoPagoId) : undefined

  return (
    <Panel>
      <PanelHeader
        titulo="Membresía"
        accion={
          !vigente && clienteActivo && !membresias.isPending ? (
            <Button tamano="sm" icono={<Plus className="size-4" aria-hidden="true" />} onClick={() => setVentana('contratar')}>
              Contratar plan
            </Button>
          ) : undefined
        }
      />

      {membresias.isPending ? (
        <Cargando />
      ) : membresias.isError ? (
        <ErrorCarga error={membresias.error} onReintentar={() => void membresias.refetch()} />
      ) : (
        <>
          {vigente ? (
            <Vigente
              membresia={vigente}
              plan={planDe(vigente.planId)}
              metodo={metodoVigente ? describirMetodo(metodoVigente) : null}
              onCobrar={() => setVentana('cobrar')}
              onCancelar={() => setVentana('cancelar')}
            />
          ) : (
            <Vacio
              icono={<BadgeCheck className="size-6" />}
              titulo="Sin membresía vigente"
              descripcion={
                clienteActivo
                  ? 'Contrata un plan para que pueda entrar a las sedes.'
                  : 'El cliente está dado de baja; no se le puede contratar un plan.'
              }
            />
          )}

          {anteriores.length > 0 && (
            <div className="border-t border-line px-4 py-3 sm:px-5">
              <h3 className="text-sm font-medium text-steel">Membresías anteriores</h3>
              <ul className="mt-2 space-y-1.5">
                {anteriores.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-[0.95rem]">
                    <span>
                      {planDe(m.planId)?.nombre ?? `Plan ${m.planId}`}
                      <span className="text-steel"> desde el {formatoFecha(m.fechaInicio)}</span>
                    </span>
                    <EstadoBadge estado={m.estado} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <ContratarModal
        abierto={ventana === 'contratar'}
        clienteId={clienteId}
        metodos={listaMetodos}
        onCerrar={() => setVentana(null)}
        onAgregarMetodo={() => {
          setVentana(null)
          onAgregarMetodo()
        }}
        onContratado={() => {
          setVentana(null)
          onAviso('Plan contratado. El primer cobro automático se hará en el día de corte.')
        }}
      />

      {vigente && (
        <>
          <CancelarModal
            abierto={ventana === 'cancelar'}
            clienteId={clienteId}
            membresia={vigente}
            plan={planDe(vigente.planId)}
            metodos={listaMetodos}
            onCerrar={() => setVentana(null)}
            onTerminado={onAviso}
          />
          <CobrarModal
            abierto={ventana === 'cobrar'}
            clienteId={clienteId}
            membresiaId={vigente.id}
            metodos={listaMetodos}
            metodoSugeridoId={vigente.metodoPagoId}
            onCerrar={() => setVentana(null)}
            onCobrado={(c) => onAviso(`Mensualidad de ${formatoMoneda(c.monto_total_cobrado)} cobrada.`)}
          />
        </>
      )}
    </Panel>
  )
}

function Vigente({
  membresia: m,
  plan,
  metodo,
  onCobrar,
  onCancelar,
}: {
  membresia: Membresia
  plan: Plan | undefined
  metodo: string | null
  onCobrar: () => void
  onCancelar: () => void
}) {
  const p = plan
  const nivel = p ? estiloNivel[nivelPlan(p)] : null

  return (
    <div className="relative pl-3">
      <div className={cn('absolute inset-y-0 left-0 w-1.5', nivel?.banda ?? 'bg-line-strong')} aria-hidden="true" />
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={cn('font-display text-sm font-semibold', nivel?.texto ?? 'text-steel')}>
              {nivel ? `Plan ${nivel.etiqueta}` : 'Plan'}
            </p>
            <p className="font-display text-xl font-bold">{p?.nombre ?? `Plan ${m.planId}`}</p>
          </div>
          <EstadoBadge estado={m.estado} />
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Dato etiqueta="Desde">{formatoFecha(m.fechaInicio)}</Dato>
          <Dato etiqueta="Permanencia hasta">{formatoFecha(m.fechaFinPermanenciaMinima)}</Dato>
          <Dato etiqueta="Cobro mensual">
            {p ? `${formatoMoneda(p.precio_mensual)} el día ${m.diaCorteMensual}` : `Día ${m.diaCorteMensual}`}
          </Dato>
          <Dato etiqueta="Método de pago">{metodo ?? 'Sin método asignado'}</Dato>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variante="secundario"
            tamano="sm"
            icono={<CircleDollarSign className="size-4" aria-hidden="true" />}
            onClick={onCobrar}
          >
            Cobrar mensualidad
          </Button>
          <Button
            variante="fantasma"
            tamano="sm"
            className="text-plate-red hover:bg-plate-red-soft"
            icono={<XCircle className="size-4" aria-hidden="true" />}
            onClick={onCancelar}
          >
            Cancelar membresía
          </Button>
        </div>
      </div>
    </div>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-steel">{etiqueta}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  )
}
