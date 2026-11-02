import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ArrowLeft, DoorOpen, Mail, Pencil, UserX } from 'lucide-react'
import { Aviso } from '@/components/ui/Aviso'
import { EstadoBadge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Cargando, ErrorCarga } from '@/components/ui/StateMessage'
import { useSucursales } from '@/features/catalog/hooks'
import { ApiError } from '@/lib/http'
import { formatoFecha } from '@/lib/format'
import { HistorialAccesos } from '../../accesos/components/HistorialAccesos'
import { MembresiaPanel } from '../../membresias/components/MembresiaPanel'
import { MetodoPagoModal } from '../../pagos/components/MetodoPagoModal'
import { PagosPanel } from '../../pagos/components/PagosPanel'
import { useCliente, useDarDeBaja, useInvitar } from '../hooks'
import { nombreCompleto } from '../types'

type Dialogo = 'invitar' | 'baja' | 'metodo' | null

const mensajeError = (e: unknown) => (e instanceof ApiError ? e.message : 'No se pudo completar la acción.')

export function ClienteDetallePage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const cliente = useCliente(id)
  const sucursales = useSucursales()
  const invitar = useInvitar(id)
  const baja = useDarDeBaja(id)

  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [aviso, setAviso] = useState<string | null>((location.state as { aviso?: string } | null)?.aviso ?? null)

  const mostrarAviso = (mensaje: string) => {
    setAviso(mensaje)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cerrarAviso = () => {
    setAviso(null)
    navigate(location.pathname, { replace: true, state: null })
  }

  if (cliente.isPending) return <Cargando />
  if (cliente.isError) return <ErrorCarga error={cliente.error} onReintentar={() => void cliente.refetch()} />

  const c = cliente.data
  const sede = sucursales.data?.find((s) => s.id === c.sucursalBaseId)
  const deBaja = c.estado === 'INACTIVO'

  const confirmarInvitacion = () =>
    invitar.mutate(undefined, {
      onSuccess: () => {
        setDialogo(null)
        setAviso(`Invitación enviada a ${c.email}. Con el enlace del correo creará su contraseña.`)
      },
    })

  const confirmarBaja = () =>
    baja.mutate(undefined, {
      onSuccess: () => {
        setDialogo(null)
        setAviso(`${nombreCompleto(c)} quedó dado de baja.`)
        void cliente.refetch()
      },
    })

  return (
    <>
      <Link
        to="/admin/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-plate-blue hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Clientes
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[1.75rem] sm:text-3xl">{nombreCompleto(c)}</h1>
            <EstadoBadge estado={c.estado} />
          </div>
          <p className="mt-1 text-steel">{c.email}</p>
        </div>
        {!deBaja && (
          <div className="flex flex-wrap gap-2">
            <ButtonLink
              to={`/admin/recepcion?cliente=${id}`}
              variante="secundario"
              icono={<DoorOpen className="size-4" aria-hidden="true" />}
            >
              Registrar entrada
            </ButtonLink>
            <ButtonLink
              to={`/admin/clientes/${id}/editar`}
              variante="secundario"
              icono={<Pencil className="size-4" aria-hidden="true" />}
            >
              Editar
            </ButtonLink>
            <Button
              variante="secundario"
              icono={<Mail className="size-4" aria-hidden="true" />}
              onClick={() => {
                invitar.reset()
                setDialogo('invitar')
              }}
            >
              Invitar a la app
            </Button>
          </div>
        )}
      </div>

      {aviso && (
        <Aviso className="mb-5" onCerrar={cerrarAviso}>
          {aviso}
        </Aviso>
      )}

      <Panel>
        <PanelHeader titulo="Datos del cliente" />
        <dl className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2 sm:p-5">
          <Dato etiqueta="Documento de identidad">{c.documentoIdentidad}</Dato>
          <Dato etiqueta="Teléfono">{c.telefono || 'Sin registrar'}</Dato>
          <Dato etiqueta="Fecha de nacimiento">{c.fechaNacimiento ? formatoFecha(c.fechaNacimiento) : 'Sin registrar'}</Dato>
          <Dato etiqueta="Cliente desde">{formatoFecha(c.createdAt)}</Dato>
          <Dato etiqueta="Sede base">{sede ? `${sede.nombre} (${sede.ciudad}, ${sede.pais})` : `Sede #${c.sucursalBaseId}`}</Dato>
        </dl>
      </Panel>

      <div className="mt-6">
        <MembresiaPanel
          clienteId={id}
          clienteActivo={!deBaja}
          onAviso={mostrarAviso}
          onAgregarMetodo={() => setDialogo('metodo')}
        />
      </div>

      <div className="mt-6">
        <PagosPanel clienteId={id} puedeAgregar={!deBaja} onAgregarMetodo={() => setDialogo('metodo')} />
      </div>

      <div className="mt-6">
        <HistorialAccesos clienteId={id} />
      </div>

      <MetodoPagoModal
        abierto={dialogo === 'metodo'}
        clienteId={id}
        titularSugerido={nombreCompleto(c)}
        onCerrar={() => setDialogo(null)}
        onGuardado={() => {
          setDialogo(null)
          mostrarAviso('Método de pago agregado.')
        }}
      />

      {!deBaja && (
        <section className="mt-6 rounded-panel border border-plate-red/25 p-4 sm:p-5">
          <h2 className="text-lg">Dar de baja</h2>
          <p className="mt-1 text-steel">
            El cliente deja de poder entrar a las sedes. Su historial de pagos y accesos se conserva.
          </p>
          <Button
            variante="peligro"
            tamano="sm"
            className="mt-4"
            icono={<UserX className="size-4" aria-hidden="true" />}
            onClick={() => {
              baja.reset()
              setDialogo('baja')
            }}
          >
            Dar de baja
          </Button>
        </section>
      )}

      <ConfirmDialog
        abierto={dialogo === 'invitar'}
        titulo="Invitar a la app"
        confirmar="Enviar invitación"
        cargando={invitar.isPending}
        error={invitar.isError ? mensajeError(invitar.error) : null}
        onConfirmar={confirmarInvitacion}
        onCerrar={() => setDialogo(null)}
      >
        Le llegará un correo a <span className="font-medium text-ink">{c.email}</span> con un enlace para crear su
        contraseña y ver su pase y sus pagos.
      </ConfirmDialog>

      <ConfirmDialog
        abierto={dialogo === 'baja'}
        titulo={`¿Dar de baja a ${nombreCompleto(c)}?`}
        confirmar="Dar de baja"
        peligro
        cargando={baja.isPending}
        error={baja.isError ? mensajeError(baja.error) : null}
        onConfirmar={confirmarBaja}
        onCerrar={() => setDialogo(null)}
      >
        No podrá entrar a ninguna sede. Esta acción no se puede deshacer desde el panel.
      </ConfirmDialog>
    </>
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
