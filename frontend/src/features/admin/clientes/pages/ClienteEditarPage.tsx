import { useNavigate, useParams } from 'react-router'
import { Panel } from '@/components/ui/Panel'
import { Cargando, ErrorCarga } from '@/components/ui/StateMessage'
import { PageHeader } from '@/components/layout/PageHeader'
import { ClienteForm } from '../components/ClienteForm'
import { useCliente, useGuardarCliente } from '../hooks'
import { nombreCompleto } from '../types'

export function ClienteEditarPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const cliente = useCliente(id)
  const guardar = useGuardarCliente(id)

  if (cliente.isPending) return <Cargando />
  if (cliente.isError) return <ErrorCarga error={cliente.error} onReintentar={() => void cliente.refetch()} />

  return (
    <>
      <PageHeader titulo={`Editar a ${nombreCompleto(cliente.data)}`} />
      <Panel className="p-4 sm:p-6">
        <ClienteForm
          cliente={cliente.data}
          guardando={guardar.isPending}
          error={guardar.error}
          textoGuardar="Guardar cambios"
          cancelarHacia={`/admin/clientes/${id}`}
          onGuardar={(datos) =>
            guardar.mutate(datos, {
              onSuccess: () => navigate(`/admin/clientes/${id}`, { state: { aviso: 'Cambios guardados.' } }),
            })
          }
        />
      </Panel>
    </>
  )
}
