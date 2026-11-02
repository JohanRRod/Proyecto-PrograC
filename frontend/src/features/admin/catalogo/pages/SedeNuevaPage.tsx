import { useNavigate } from 'react-router'
import { Panel } from '@/components/ui/Panel'
import { Cargando, ErrorCarga } from '@/components/ui/StateMessage'
import { PageHeader } from '@/components/layout/PageHeader'
import { SedeForm } from '../components/SedeForm'
import { VolverCatalogo } from '../components/VolverCatalogo'
import { useGuardarSede, useSedesAdmin } from '../hooks'

export function SedeNuevaPage() {
  const navigate = useNavigate()
  const sedes = useSedesAdmin()
  const guardar = useGuardarSede()

  return (
    <>
      <VolverCatalogo to="/admin/catalogo/sedes" texto="Sedes" />
      <PageHeader titulo="Nueva sede" descripcion="Al guardarla aparece en el mapa y ya se le pueden asignar amenidades." />
      <Panel className="p-4 sm:p-6">
        {sedes.isPending ? (
          <Cargando />
        ) : sedes.isError ? (
          <ErrorCarga error={sedes.error} onReintentar={() => void sedes.refetch()} />
        ) : (
          <SedeForm
            sedes={sedes.data}
            guardando={guardar.isPending}
            error={guardar.error}
            textoGuardar="Crear sede"
            cancelarHacia="/admin/catalogo/sedes"
            onGuardar={(datos) =>
              guardar.mutate(datos, {
                onSuccess: (sede) =>
                  navigate(`/admin/catalogo/sedes/${sede.id}`, {
                    state: { aviso: 'Sede creada. Ahora asígnale sus amenidades.' },
                  }),
              })
            }
          />
        )}
      </Panel>
    </>
  )
}
