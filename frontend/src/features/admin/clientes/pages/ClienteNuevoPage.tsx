import { useNavigate } from 'react-router'
import { Panel } from '@/components/ui/Panel'
import { PageHeader } from '@/components/layout/PageHeader'
import { ClienteForm } from '../components/ClienteForm'
import { useGuardarCliente } from '../hooks'

export function ClienteNuevoPage() {
  const navigate = useNavigate()
  const guardar = useGuardarCliente()

  return (
    <>
      <PageHeader titulo="Nuevo cliente" descripcion="Después de registrarlo podrás contratarle un plan e invitarlo a la app." />
      <Panel className="p-4 sm:p-6">
        <ClienteForm
          guardando={guardar.isPending}
          error={guardar.error}
          textoGuardar="Registrar cliente"
          cancelarHacia="/admin/clientes"
          onGuardar={(datos) =>
            guardar.mutate(datos, {
              onSuccess: (c) => navigate(`/admin/clientes/${c.id}`, { state: { aviso: 'Cliente registrado.' } }),
            })
          }
        />
      </Panel>
    </>
  )
}
