import { CreditCard, Landmark, Receipt } from 'lucide-react'
import { Badge, EstadoBadge } from '@/components/ui/Badge'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { PageHeader } from '@/components/layout/PageHeader'
import { aNumero, formatoFecha, formatoFechaHora, formatoMes, formatoMoneda } from '@/lib/format'
import { useMiHistorial, useMisMetodos, useMisPeriodos } from '../hooks'
import { CONCEPTOS, TIPOS_CUENTA, type Cobro } from '../types'

export function PagosPage() {
  return (
    <>
      <PageHeader titulo="Pagos" descripcion="Tus cobros automáticos, los meses pagados y los pendientes." />
      <div className="space-y-6">
        <Historial />
        <div className="grid gap-6 lg:grid-cols-2">
          <Periodos />
          <Metodos />
        </div>
      </div>
    </>
  )
}

function Historial() {
  const historial = useMiHistorial()

  return (
    <Panel>
      <PanelHeader titulo="Cobros" />
      {historial.isPending ? (
        <Cargando />
      ) : historial.isError ? (
        <ErrorCarga error={historial.error} onReintentar={() => void historial.refetch()} />
      ) : historial.data.length === 0 ? (
        <Vacio icono={<Receipt className="size-6" />} titulo="Aún no hay cobros" descripcion="Tu primer cobro aparecerá aquí." />
      ) : (
        <>
          {/* Escritorio: tabla */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-[0.95rem]">
              <thead className="border-b border-line text-sm text-steel">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium">Fecha</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Concepto</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Monto</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Estado</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Referencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {historial.data.map((c) => (
                  <tr key={c.id}>
                    <td className="whitespace-nowrap px-5 py-3">{formatoFechaHora(c.fecha_intento)}</td>
                    <td className="px-5 py-3">{CONCEPTOS[c.concepto] ?? c.concepto}</td>
                    <td className="px-5 py-3 text-right">
                      <Monto cobro={c} />
                    </td>
                    <td className="px-5 py-3">
                      <EstadoBadge estado={c.estado_transaccion} />
                    </td>
                    <td className="px-5 py-3 text-sm text-steel">{c.referencia_transaccion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Teléfono: lista */}
          <ul className="divide-y divide-line md:hidden">
            {historial.data.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="font-medium">{CONCEPTOS[c.concepto] ?? c.concepto}</p>
                  <p className="text-sm text-steel">{formatoFechaHora(c.fecha_intento)}</p>
                  <div className="mt-1.5">
                    <EstadoBadge estado={c.estado_transaccion} />
                  </div>
                </div>
                <div className="text-right">
                  <Monto cobro={c} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  )
}

function Monto({ cobro }: { cobro: Cobro }) {
  const descuento = aNumero(cobro.descuento_aplicado)
  return (
    <>
      <span className="font-medium tabular-nums">{formatoMoneda(cobro.monto_total_cobrado)}</span>
      {descuento > 0 && (
        <span className="block text-sm text-plate-green tabular-nums">Descuento {formatoMoneda(descuento)}</span>
      )}
    </>
  )
}

function Periodos() {
  const periodos = useMisPeriodos()

  return (
    <Panel>
      <PanelHeader titulo="Meses facturados" />
      {periodos.isPending ? (
        <Cargando />
      ) : periodos.isError ? (
        <ErrorCarga error={periodos.error} onReintentar={() => void periodos.refetch()} />
      ) : periodos.data.length === 0 ? (
        <Vacio titulo="Sin meses facturados" descripcion="Cuando se genere tu primer período de cobro aparecerá aquí." />
      ) : (
        <ul className="divide-y divide-line">
          {periodos.data.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div>
                <p className="font-medium">{formatoMes(p.periodo)}</p>
                <p className="text-sm text-steel">
                  Vence el {formatoFecha(p.fecha_vencimiento)}
                  {p.estado !== 'PAGADO' && p.intentos > 0 && `, ${p.intentos} ${p.intentos === 1 ? 'intento' : 'intentos'}`}
                </p>
              </div>
              <EstadoBadge estado={p.estado} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function Metodos() {
  const metodos = useMisMetodos()

  return (
    <Panel>
      <PanelHeader titulo="Métodos de pago" />
      {metodos.isPending ? (
        <Cargando />
      ) : metodos.isError ? (
        <ErrorCarga error={metodos.error} onReintentar={() => void metodos.refetch()} />
      ) : metodos.data.length === 0 ? (
        <Vacio titulo="Sin métodos de pago" descripcion="Registra una tarjeta o cuenta en recepción para el cobro automático." />
      ) : (
        <ul className="divide-y divide-line">
          {metodos.data.map((m) => {
            const Icono = m.tipo_cuenta === 'CUENTA_BANCARIA' ? Landmark : CreditCard
            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Icono className="size-5 shrink-0 text-steel" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {m.banco_emisor} terminada en {m.ultimos_cuatro_digitos}
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
  )
}
