import { Panel } from '@/components/ui/Panel'
import { ButtonLink } from '@/components/ui/Button'
import { PageHeader } from '@/components/layout/PageHeader'
import { usePlanes, useSucursales } from '@/features/catalog/hooks'

/**
 * Inicio del panel administrativo.
 * Los CRUD (clientes, membresías, sedes, planes, amenidades) y la descarga de reportes
 * se agregan en la siguiente rama: feature/frontend-admin.
 */
export function AdminHomePage() {
  const sucursales = useSucursales()
  const planes = usePlanes()

  const resumen = [
    { etiqueta: 'Sedes activas', valor: sucursales.data?.length, to: '/' },
    { etiqueta: 'Planes activos', valor: planes.data?.length, to: '/planes' },
  ]

  return (
    <>
      <PageHeader titulo="Panel administrativo" descripcion="Resumen de la red. La gestión de cada módulo se habilita en las próximas versiones." />
      <div className="grid gap-4 sm:grid-cols-2">
        {resumen.map((r) => (
          <Panel key={r.etiqueta} className="p-5">
            <p className="text-steel">{r.etiqueta}</p>
            <p className="mt-1 font-display text-4xl font-bold tabular-nums">{r.valor ?? '—'}</p>
            <ButtonLink to={r.to} variante="fantasma" tamano="sm" className="-ml-3 mt-3">
              Ver detalle
            </ButtonLink>
          </Panel>
        ))}
      </div>
    </>
  )
}
