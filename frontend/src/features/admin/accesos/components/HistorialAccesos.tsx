import { DoorOpen } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { useAmenidades, useSucursales } from '@/features/catalog/hooks'
import { formatoFechaHora } from '@/lib/format'
import { useAccesosDeCliente } from '../hooks'
import { motivoLegible, TIPOS_ACCESO } from '../motivos'

/** Entradas registradas de un cliente, permitidas y rechazadas, de la más reciente a la más antigua. */
export function HistorialAccesos({ clienteId, titulo = 'Historial de accesos' }: { clienteId: string; titulo?: string }) {
  const accesos = useAccesosDeCliente(clienteId)
  const sucursales = useSucursales()
  const amenidades = useAmenidades()

  const sede = (id: number) => sucursales.data?.find((s) => s.id === id)?.nombre ?? `Sede #${id}`
  const zona = (id: number | null) =>
    id === null ? null : (amenidades.data?.find((a) => a.id === id)?.nombre ?? `Zona #${id}`)

  return (
    <Panel>
      <PanelHeader titulo={titulo} />
      {accesos.isPending ? (
        <Cargando />
      ) : accesos.isError ? (
        <ErrorCarga error={accesos.error} onReintentar={() => void accesos.refetch()} />
      ) : accesos.data.length === 0 ? (
        <Vacio icono={<DoorOpen className="size-6" />} titulo="Sin entradas registradas" />
      ) : (
        <ul className="max-h-[28rem] divide-y divide-line overflow-y-auto">
          {accesos.data.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="font-medium">
                  {sede(a.sucursal_id)}
                  {zona(a.amenidad_id) && <span className="font-normal text-steel">, {zona(a.amenidad_id)}</span>}
                </p>
                <p className="text-sm text-steel">
                  {formatoFechaHora(a.fecha_hora_acceso)}
                  {/* En los rechazados el tipo no aplica: el backend lo calcula antes de rechazar. */}
                  {a.acceso_permitido && `, ${TIPOS_ACCESO[a.tipo_acceso] ?? a.tipo_acceso}`}
                </p>
                {!a.acceso_permitido && <p className="mt-0.5 text-sm text-plate-red">{motivoLegible(a.motivo_rechazo)}</p>}
              </div>
              {a.acceso_permitido ? <Badge tono="exito">Permitido</Badge> : <Badge tono="peligro">Rechazado</Badge>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
