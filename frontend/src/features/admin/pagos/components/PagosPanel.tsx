import { CreditCard, Landmark, Plus, Receipt } from 'lucide-react'
import { Badge, EstadoBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { aNumero, formatoFechaHora, formatoMoneda } from '@/lib/format'
import { useCobrosDeCliente, useMetodosDeCliente } from '../hooks'
import { CONCEPTOS, TIPOS_CUENTA } from '../types'

interface Props {
  clienteId: string
  puedeAgregar: boolean
  onAgregarMetodo: () => void
}

export function PagosPanel({ clienteId, puedeAgregar, onAgregarMetodo }: Props) {
  const metodos = useMetodosDeCliente(clienteId)
  const cobros = useCobrosDeCliente(clienteId)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Panel>
        <PanelHeader
          titulo="Métodos de pago"
          accion={
            puedeAgregar ? (
              <Button
                variante="secundario"
                tamano="sm"
                icono={<Plus className="size-4" aria-hidden="true" />}
                onClick={onAgregarMetodo}
              >
                Agregar
              </Button>
            ) : undefined
          }
        />
        {metodos.isPending ? (
          <Cargando />
        ) : metodos.isError ? (
          <ErrorCarga error={metodos.error} onReintentar={() => void metodos.refetch()} />
        ) : metodos.data.length === 0 ? (
          <Vacio titulo="Sin métodos de pago" descripcion="Agrega uno para poder contratar un plan." />
        ) : (
          <ul className="divide-y divide-line">
            {metodos.data.map((m) => {
              const Icono = m.tipo_cuenta === 'CUENTA_BANCARIA' ? Landmark : CreditCard
              return (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <Icono className="size-5 shrink-0 text-steel" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {m.banco_emisor} •••• {m.ultimos_cuatro_digitos}
                    </p>
                    <p className="text-sm text-steel">{TIPOS_CUENTA[m.tipo_cuenta] ?? m.tipo_cuenta}</p>
                  </div>
                  {!m.activo ? <Badge>Inactivo</Badge> : m.es_predeterminado ? <Badge tono="info">Principal</Badge> : null}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelHeader titulo="Cobros" />
        {cobros.isPending ? (
          <Cargando />
        ) : cobros.isError ? (
          <ErrorCarga error={cobros.error} onReintentar={() => void cobros.refetch()} />
        ) : cobros.data.length === 0 ? (
          <Vacio icono={<Receipt className="size-6" />} titulo="Aún no hay cobros" />
        ) : (
          <ul className="max-h-96 divide-y divide-line overflow-y-auto">
            {cobros.data.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="font-medium">{CONCEPTOS[c.concepto] ?? c.concepto}</p>
                  <p className="text-sm text-steel">{formatoFechaHora(c.fecha_intento)}</p>
                  <div className="mt-1">
                    <EstadoBadge estado={c.estado_transaccion} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium tabular-nums">{formatoMoneda(c.monto_total_cobrado)}</p>
                  {aNumero(c.descuento_aplicado) > 0 && (
                    <p className="text-sm text-plate-green tabular-nums">Descuento {formatoMoneda(c.descuento_aplicado)}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
