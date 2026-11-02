import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { PowerOff } from 'lucide-react'
import { Aviso } from '@/components/ui/Aviso'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Cargando, ErrorCarga } from '@/components/ui/StateMessage'
import { ApiError } from '@/lib/http'
import { AmenidadesSede } from '../components/AmenidadesSede'
import { SedeForm } from '../components/SedeForm'
import { VolverCatalogo } from '../components/VolverCatalogo'
import { useDesactivarSede, useGuardarSede, useSedeAdmin, useSedesAdmin } from '../hooks'

export function SedeDetallePage() {
  const id = Number(useParams().id)
  const location = useLocation()
  const navigate = useNavigate()
  const sede = useSedeAdmin(id)
  const sedes = useSedesAdmin()
  const guardar = useGuardarSede(id)
  const desactivar = useDesactivarSede(id)

  const [confirmando, setConfirmando] = useState(false)
  const [aviso, setAviso] = useState<string | null>((location.state as { aviso?: string } | null)?.aviso ?? null)

  const mostrarAviso = (mensaje: string) => {
    setAviso(mensaje)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cerrarAviso = () => {
    setAviso(null)
    navigate(location.pathname, { replace: true, state: null })
  }

  if (sede.isPending || sedes.isPending) return <Cargando />
  if (sede.isError) return <ErrorCarga error={sede.error} onReintentar={() => void sede.refetch()} />
  if (sedes.isError) return <ErrorCarga error={sedes.error} onReintentar={() => void sedes.refetch()} />

  const s = sede.data

  return (
    <>
      <VolverCatalogo to="/admin/catalogo/sedes" texto="Sedes" />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[1.75rem] sm:text-3xl">{s.nombre}</h1>
            {s.activa ? <Badge tono="exito">Activa</Badge> : <Badge>Inactiva</Badge>}
            {s.es_sede_vip && <Badge tono="tinta">Solo Black</Badge>}
          </div>
          <p className="mt-1 text-steel">
            {s.codigo_sucursal} · {s.ciudad}
          </p>
        </div>
        {s.activa && (
          <Button
            variante="secundario"
            icono={<PowerOff className="size-4" aria-hidden="true" />}
            onClick={() => {
              desactivar.reset()
              setConfirmando(true)
            }}
          >
            Desactivar sede
          </Button>
        )}
      </div>

      {aviso && (
        <Aviso className="mb-5" onCerrar={cerrarAviso}>
          {aviso}
        </Aviso>
      )}

      <div className="space-y-6">
        <Panel>
          <PanelHeader titulo="Datos y ubicación" />
          <div className="p-4 sm:p-6">
            <SedeForm
              key={`${s.id}-${s.activa}`}
              sede={s}
              sedes={sedes.data}
              guardando={guardar.isPending}
              error={guardar.error}
              textoGuardar="Guardar cambios"
              cancelarHacia="/admin/catalogo/sedes"
              onGuardar={(datos) => guardar.mutate(datos, { onSuccess: () => mostrarAviso('Cambios guardados.') })}
            />
          </div>
        </Panel>

        <AmenidadesSede sedeId={s.id} />
      </div>

      <ConfirmDialog
        abierto={confirmando}
        titulo={`¿Desactivar ${s.nombre}?`}
        confirmar="Desactivar"
        peligro
        cargando={desactivar.isPending}
        error={desactivar.error instanceof ApiError ? desactivar.error.message : desactivar.error ? 'No se pudo desactivar.' : null}
        onCerrar={() => setConfirmando(false)}
        onConfirmar={() =>
          desactivar.mutate(undefined, {
            onSuccess: () => {
              setConfirmando(false)
              void sede.refetch()
              mostrarAviso('La sede quedó desactivada. Para volver a abrirla, marca "Sede activa" y guarda.')
            },
          })
        }
      >
        Deja de aparecer en el mapa y recepción ya no podrá registrar entradas aquí. Los clientes con esta sede base no se
        borran.
      </ConfirmDialog>
    </>
  )
}
