import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, UserPlus } from 'lucide-react'
import { Aviso } from '@/components/ui/Aviso'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { VolverCatalogo } from '@/features/admin/catalogo/components/VolverCatalogo'
import { useSedesAdmin } from '@/features/admin/catalogo/hooks'
import { EstadoReservaBadge } from '@/features/clases/EstadoReservaBadge'
import { ERRORES_RESERVA, mensajeDe } from '@/features/clases/errores'
import { NOMBRE_DIA, diaDe, esFecha, fechaLarga, hoyGT, lunesDe, sumarDias, yaEmpezo } from '@/features/clases/fechas'
import type { Clase, ReservaDeClase } from '@/features/clases/types'
import { cn } from '@/lib/cn'
import { formatoHora } from '@/lib/format'
import { ClaseModal } from '../components/ClaseModal'
import { ReservarClienteModal } from '../components/ReservarClienteModal'
import {
  useCancelarReserva,
  useClases,
  useGuardarClase,
  useInstructores,
  useMarcarAsistencia,
  useReservarParaCliente,
  useReservasDeClase,
} from '../hooks'

/** La próxima fecha (desde hoy) en que toca la clase. */
function proximaFecha(clase: Clase): string {
  const hoy = hoyGT()
  for (let i = 0; i < 7; i++) {
    const f = sumarDias(hoy, i)
    if (diaDe(f) === clase.diaSemana) return f
  }
  return hoy
}

export function ClaseDetallePage() {
  const id = Number(useParams().id)
  const [params, setParams] = useSearchParams()
  const clases = useClases()
  const instructores = useInstructores()
  const sedes = useSedesAdmin()
  const guardar = useGuardarClase()
  const [editando, setEditando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  if (clases.isPending || instructores.isPending || sedes.isPending) return <Cargando />
  if (clases.isError) return <ErrorCarga error={clases.error} onReintentar={() => void clases.refetch()} />
  if (instructores.isError) return <ErrorCarga error={instructores.error} onReintentar={() => void instructores.refetch()} />
  if (sedes.isError) return <ErrorCarga error={sedes.error} onReintentar={() => void sedes.refetch()} />

  const clase = clases.data.find((c) => c.id === id)
  if (!clase) {
    return (
      <>
        <VolverCatalogo to="/admin/clases" texto="Clases" />
        <Panel>
          <Vacio titulo="No encontramos esa clase" descripcion="Puede que el enlace esté mal escrito." />
        </Panel>
      </>
    )
  }

  const fechaParam = params.get('fecha')
  const fecha = esFecha(fechaParam) && diaDe(fechaParam) === clase.diaSemana ? fechaParam : proximaFecha(clase)
  const sede = sedes.data.find((s) => s.id === clase.sucursalId)
  const instructor = instructores.data.find((i) => i.id === clase.instructorId)

  const cambiarFecha = (f: string) => {
    const p = new URLSearchParams(params)
    p.set('fecha', f)
    setParams(p, { replace: true })
    setAviso(null)
  }

  return (
    <>
      <VolverCatalogo to={`/admin/clases?sede=${clase.sucursalId}&semana=${lunesDe(fecha)}`} texto="Clases" />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[1.75rem] sm:text-3xl">{clase.nombreClase}</h1>
            {clase.requierePlanVip && <Badge tono="tinta">Solo Black</Badge>}
          </div>
          <p className="mt-1 text-steel">
            Cada {NOMBRE_DIA[clase.diaSemana].toLowerCase()} de {formatoHora(clase.horaInicio)} a {formatoHora(clase.horaFin)} ·{' '}
            {sede?.nombre ?? `Sede N.º ${clase.sucursalId}`}
          </p>
          <p className="text-steel">
            Con {instructor?.nombreCompleto ?? `instructor N.º ${clase.instructorId}`}
            {instructor && !instructor.activo && ' (inactivo)'} · Cupo de {clase.cupoMaximo}
          </p>
        </div>
        <Button variante="secundario" icono={<Pencil className="size-4" aria-hidden="true" />} onClick={() => setEditando(true)}>
          Editar clase
        </Button>
      </div>

      {instructor && !instructor.activo && (
        <Aviso tono="info" className="mb-4">
          El instructor de esta clase está inactivo. Edita la clase para asignarle otro.
        </Aviso>
      )}

      {aviso && (
        <Aviso className="mb-4" onCerrar={() => setAviso(null)}>
          {aviso}
        </Aviso>
      )}

      <div className="mb-3 flex items-center gap-1">
        <button
          type="button"
          onClick={() => cambiarFecha(sumarDias(fecha, -7))}
          aria-label="Semana anterior"
          className="grid size-9 place-items-center rounded-full border border-line-strong bg-surface text-ink-soft hover:border-ink/40"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <p className="min-w-[13rem] px-2 text-center font-medium first-letter:uppercase" aria-live="polite">
          {fechaLarga(fecha)}
          {fecha === hoyGT() && <span className="font-normal text-steel"> (hoy)</span>}
        </p>
        <button
          type="button"
          onClick={() => cambiarFecha(sumarDias(fecha, 7))}
          aria-label="Semana siguiente"
          className="grid size-9 place-items-center rounded-full border border-line-strong bg-surface text-ink-soft hover:border-ink/40"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
        {fecha !== proximaFecha(clase) && (
          <button
            type="button"
            onClick={() => cambiarFecha(proximaFecha(clase))}
            className="ml-1 h-9 rounded-full border border-line-strong bg-surface px-3.5 text-sm font-medium text-ink-soft hover:border-ink/40"
          >
            {proximaFecha(clase) === hoyGT() ? 'Hoy' : 'Próxima'}
          </button>
        )}
      </div>

      <Reservas key={fecha} clase={clase} fecha={fecha} sedeActiva={sede?.activa ?? false} onAviso={setAviso} />

      <ClaseModal
        abierto={editando}
        clase={clase}
        sedeInicial={clase.sucursalId}
        sedes={sedes.data}
        instructores={instructores.data}
        clases={clases.data}
        guardando={guardar.isPending}
        error={guardar.error}
        onCerrar={() => {
          setEditando(false)
          guardar.reset()
        }}
        onGuardar={(datos) =>
          guardar.mutate(
            { id: clase.id, datos },
            {
              onSuccess: () => {
                setEditando(false)
                setAviso('Cambios guardados.')
              },
            },
          )
        }
      />
    </>
  )
}

interface ReservasProps {
  clase: Clase
  fecha: string
  sedeActiva: boolean
  onAviso: (mensaje: string) => void
}

function Reservas({ clase, fecha, sedeActiva, onAviso }: ReservasProps) {
  const reservas = useReservasDeClase(clase.id, fecha)
  const reservar = useReservarParaCliente()
  const cancelar = useCancelarReserva()
  const asistencia = useMarcarAsistencia()
  const [reservando, setReservando] = useState(false)
  const [porCancelar, setPorCancelar] = useState<ReservaDeClase | null>(null)

  const paso = yaEmpezo(fecha, clase.horaInicio)
  const lista = reservas.data ?? []
  const activas = lista.filter((r) => r.estado === 'RESERVADA').length
  const asistieron = lista.filter((r) => r.estado === 'ASISTIO').length
  const faltaron = lista.filter((r) => r.estado === 'INASISTENCIA').length
  const quedan = Math.max(0, clase.cupoMaximo - activas)
  const puedeReservar = !paso && sedeActiva && quedan > 0

  const errorAsistencia = mensajeDe(asistencia.error, ERRORES_RESERVA)

  return (
    <Panel>
      <PanelHeader
        titulo="Reservas"
        accion={
          !paso && (
            <Button
              tamano="sm"
              icono={<UserPlus className="size-4" aria-hidden="true" />}
              disabled={!puedeReservar || reservas.isPending}
              title={!sedeActiva ? 'La sede está inactiva' : quedan === 0 ? 'La clase está llena' : undefined}
              onClick={() => setReservando(true)}
            >
              Reservar a un cliente
            </Button>
          )
        }
      />

      {reservas.isPending ? (
        <Cargando className="py-8" />
      ) : reservas.isError ? (
        <ErrorCarga error={reservas.error} onReintentar={() => void reservas.refetch()} />
      ) : (
        <>
          <p className="border-b border-line px-4 py-2.5 text-sm text-steel sm:px-5">
            {paso
              ? lista.length === 0 || activas + asistieron + faltaron === 0
                ? 'Esta fecha ya pasó.'
                : `Asistieron ${asistieron} · No asistieron ${faltaron}${activas ? ` · Sin marcar ${activas}` : ''}`
              : quedan === 0
                ? `Llena: ${activas} de ${clase.cupoMaximo} lugares reservados.`
                : `${activas} de ${clase.cupoMaximo} lugares reservados · quedan ${quedan}.`}
            {!paso && !sedeActiva && ' La sede está inactiva, así que no se aceptan reservas nuevas.'}
          </p>

          {errorAsistencia && (
            <Aviso tono="error" className="m-4 mb-0 sm:mx-5" onCerrar={() => asistencia.reset()}>
              {errorAsistencia}
            </Aviso>
          )}

          {lista.length === 0 ? (
            <Vacio
              icono={<CalendarDays className="size-6" />}
              titulo={paso ? 'Nadie reservó esta fecha' : 'Aún no hay reservas'}
              descripcion={paso ? undefined : 'Los miembros reservan desde su cuenta; también puedes reservar a nombre de un cliente.'}
            />
          ) : (
            <ul className="divide-y divide-line">
              {lista.map((r) => (
                <li
                  key={r.id}
                  className={cn(
                    'flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5',
                    r.estado === 'CANCELADA' && 'text-steel',
                  )}
                >
                  <div className="min-w-0">
                    <Link to={`/admin/clientes/${r.clienteId}`} className="font-medium hover:text-plate-blue">
                      {r.nombreCliente}
                    </Link>
                    <span className="block text-sm text-steel">{r.documento}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {paso && r.estado !== 'CANCELADA' ? (
                      <div role="group" aria-label={`Asistencia de ${r.nombreCliente}`} className="flex gap-1.5">
                        {(['ASISTIO', 'INASISTENCIA'] as const).map((estado) => {
                          const activo = r.estado === estado
                          const enCurso = asistencia.isPending && asistencia.variables?.id === r.id
                          return (
                            <button
                              key={estado}
                              type="button"
                              aria-pressed={activo}
                              disabled={enCurso}
                              onClick={() => !activo && asistencia.mutate({ id: r.id, estado })}
                              className={cn(
                                'h-9 rounded-full border px-3.5 text-sm font-medium transition-colors disabled:opacity-60',
                                activo
                                  ? estado === 'ASISTIO'
                                    ? 'border-plate-green bg-plate-green text-white'
                                    : 'border-plate-red bg-plate-red text-white'
                                  : 'border-line-strong bg-surface text-ink-soft hover:border-ink/40',
                              )}
                            >
                              {estado === 'ASISTIO' ? 'Asistió' : 'No asistió'}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <EstadoReservaBadge estado={r.estado} />
                    )}
                    {!paso && r.estado === 'RESERVADA' && (
                      <Button variante="fantasma" tamano="sm" onClick={() => setPorCancelar(r)}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ReservarClienteModal
        abierto={reservando}
        descripcion={`${clase.nombreClase}, ${fechaLarga(fecha)} a las ${formatoHora(clase.horaInicio)}.`}
        guardando={reservar.isPending}
        error={reservar.error}
        onCerrar={() => {
          setReservando(false)
          reservar.reset()
        }}
        onReservar={(cliente) =>
          reservar.mutate(
            { claseId: clase.id, clienteId: cliente.id, fechaClase: fecha },
            {
              onSuccess: () => {
                setReservando(false)
                onAviso(`Listo, ${cliente.nombres} tiene su lugar en ${clase.nombreClase}.`)
              },
            },
          )
        }
      />

      <ConfirmDialog
        abierto={porCancelar !== null}
        titulo="Cancelar la reserva"
        confirmar="Cancelar reserva"
        peligro
        cargando={cancelar.isPending}
        error={mensajeDe(cancelar.error, ERRORES_RESERVA)}
        onCerrar={() => {
          setPorCancelar(null)
          cancelar.reset()
        }}
        onConfirmar={() =>
          porCancelar &&
          cancelar.mutate(porCancelar.id, {
            onSuccess: () => {
              onAviso(`Se canceló la reserva de ${porCancelar.nombreCliente}.`)
              setPorCancelar(null)
            },
          })
        }
      >
        Se libera el lugar de {porCancelar?.nombreCliente} para el {fechaLarga(fecha)}.
      </ConfirmDialog>
    </Panel>
  )
}
