import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CalendarDays, Plus, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Aviso } from '@/components/ui/Aviso'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { useSedesAdmin } from '@/features/admin/catalogo/hooks'
import { DIAS, NOMBRE_DIA, ahoraGT, esFecha, fechaDiaMes, fechaEnSemana, hoyGT, lunesDe, sumarDias, yaEmpezo } from '@/features/clases/fechas'
import type { Clase, Instructor, Ocupacion } from '@/features/clases/types'
import { cn } from '@/lib/cn'
import { formatoHora } from '@/lib/format'
import { ClaseModal } from '../components/ClaseModal'
import { SemanaNav } from '../components/SemanaNav'
import { useClases, useGuardarClase, useInstructores, useOcupacion } from '../hooks'

export function ClasesAdminPage() {
  const sedes = useSedesAdmin()
  const clases = useClases()
  const instructores = useInstructores()
  const guardar = useGuardarClase()
  const [params, setParams] = useSearchParams()
  const [creando, setCreando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const semanaParam = params.get('semana')
  const lunes = lunesDe(esFecha(semanaParam) ? semanaParam : hoyGT())

  const sedesOrdenadas = useMemo(
    () => [...(sedes.data ?? [])].sort((a, b) => Number(b.activa) - Number(a.activa) || a.nombre.localeCompare(b.nombre, 'es')),
    [sedes.data],
  )
  const sedeParam = Number(params.get('sede'))
  const sede = sedesOrdenadas.find((s) => s.id === sedeParam) ?? sedesOrdenadas[0] ?? null

  const ocupacion = useOcupacion(sede?.id ?? null, lunes, sumarDias(lunes, 6))

  const actualizar = (cambios: Record<string, string>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(cambios)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    setParams(p, { replace: true })
  }

  if (sedes.isPending || clases.isPending || instructores.isPending) return <Cargando texto="Cargando clases…" />
  if (sedes.isError) return <ErrorCarga error={sedes.error} onReintentar={() => void sedes.refetch()} />
  if (clases.isError) return <ErrorCarga error={clases.error} onReintentar={() => void clases.refetch()} />
  if (instructores.isError) return <ErrorCarga error={instructores.error} onReintentar={() => void instructores.refetch()} />

  const delaSede = clases.data.filter((c) => c.sucursalId === sede?.id)

  return (
    <>
      <PageHeader
        titulo="Clases"
        descripcion="Programa las clases de cada sede y revisa quién reservó."
        accion={
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/admin/clases/instructores" variante="secundario" icono={<UserRound className="size-4" aria-hidden="true" />}>
              Instructores
            </ButtonLink>
            <Button icono={<Plus className="size-4" aria-hidden="true" />} onClick={() => setCreando(true)} disabled={!sede}>
              Nueva clase
            </Button>
          </div>
        }
      />

      {aviso && (
        <Aviso className="mb-4" onCerrar={() => setAviso(null)}>
          {aviso}
        </Aviso>
      )}

      {!sede ? (
        <Panel>
          <Vacio titulo="Aún no hay sedes" descripcion="Registra una sede en el catálogo para programar clases." accion={<ButtonLink to="/admin/catalogo/sedes/nueva">Nueva sede</ButtonLink>} />
        </Panel>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <label htmlFor="filtro-sede" className="sr-only">
                Sede
              </label>
              <select
                id="filtro-sede"
                value={sede.id}
                onChange={(e) => actualizar({ sede: e.target.value })}
                className="h-9 max-w-full rounded-full border border-line-strong bg-surface px-3 text-sm font-medium text-ink-soft"
              >
                {sedesOrdenadas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                    {s.activa ? '' : ' (inactiva)'}
                  </option>
                ))}
              </select>
              {!sede.activa && <Badge>Inactiva</Badge>}
            </div>
            <SemanaNav lunes={lunes} onCambiar={(l) => actualizar({ semana: l === lunesDe(hoyGT()) ? '' : l })} />
          </div>

          {delaSede.length === 0 ? (
            <Panel>
              <Vacio
                icono={<CalendarDays className="size-6" />}
                titulo="Esta sede aún no tiene clases"
                descripcion="Crea la primera; se repite cada semana el mismo día y a la misma hora."
                accion={<Button onClick={() => setCreando(true)}>Nueva clase</Button>}
              />
            </Panel>
          ) : (
            <>
              {ocupacion.isError && (
                <Aviso tono="error" className="mb-4">
                  No se pudieron cargar las reservas de esta semana. Las clases se muestran sin cupos.
                </Aviso>
              )}
              <Agenda
                lunes={lunes}
                sedeId={sede.id}
                clases={delaSede}
                instructores={instructores.data}
                ocupacion={ocupacion.data ?? []}
                cargandoOcupacion={ocupacion.isPending}
              />
            </>
          )}
        </>
      )}

      <ClaseModal
        abierto={creando}
        clase={null}
        sedeInicial={sede?.id ?? null}
        sedes={sedes.data}
        instructores={instructores.data}
        clases={clases.data}
        guardando={guardar.isPending}
        error={guardar.error}
        onCerrar={() => {
          setCreando(false)
          guardar.reset()
        }}
        onGuardar={(datos) =>
          guardar.mutate(
            { datos },
            {
              onSuccess: (c) => {
                setCreando(false)
                actualizar({ sede: String(c.sucursalId) })
                setAviso(`Clase creada: ${c.nombreClase}, cada ${NOMBRE_DIA[c.diaSemana].toLowerCase()} a las ${formatoHora(c.horaInicio)}.`)
              },
            },
          )
        }
      />
    </>
  )
}

interface AgendaProps {
  lunes: string
  sedeId: number
  clases: Clase[]
  instructores: Instructor[]
  ocupacion: Ocupacion[]
  cargandoOcupacion: boolean
}

/** La semana de la sede: siete columnas en pantallas anchas y una lista por día en el teléfono. */
function Agenda({ lunes, sedeId, clases, instructores, ocupacion, cargandoOcupacion }: AgendaProps) {
  const hoy = hoyGT()
  const ahora = ahoraGT()
  const nombreInstructor = new Map(instructores.map((i) => [i.id, i.nombreCompleto]))
  const ocupacionDe = new Map(ocupacion.map((o) => [`${o.claseId}|${o.fecha}`, o]))

  return (
    <div className="grid gap-3 lg:grid-cols-7">
      {DIAS.map((dia) => {
        const fecha = fechaEnSemana(lunes, dia)
        const delDia = clases
          .filter((c) => c.diaSemana === dia)
          .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
        const esHoy = fecha === hoy

        return (
          <section key={dia} aria-label={`${NOMBRE_DIA[dia]} ${fechaDiaMes(fecha)}`} className="min-w-0">
            <h2
              className={cn(
                'mb-2 flex items-baseline justify-between gap-2 rounded-control px-2.5 py-1.5 text-sm font-semibold lg:flex-col lg:items-start lg:gap-0',
                esHoy ? 'bg-plate-blue text-white' : 'text-ink-soft',
              )}
            >
              <span>{NOMBRE_DIA[dia]}</span>
              <span className={cn('font-normal tabular-nums', esHoy ? 'text-white/85' : 'text-steel')}>
                {esHoy ? 'Hoy' : fechaDiaMes(fecha)}
              </span>
            </h2>

            {delDia.length === 0 ? (
              <p className="rounded-control border border-dashed border-line px-3 py-3 text-sm text-steel lg:py-6 lg:text-center">Sin clases</p>
            ) : (
              <ul className="space-y-2">
                {delDia.map((c) => (
                  <li key={c.id}>
                    <TarjetaClase
                      clase={c}
                      fecha={fecha}
                      sedeId={sedeId}
                      instructor={nombreInstructor.get(c.instructorId) ?? `Instructor N.º ${c.instructorId}`}
                      ocupacion={ocupacionDe.get(`${c.id}|${fecha}`)}
                      cargandoOcupacion={cargandoOcupacion}
                      paso={yaEmpezo(fecha, c.horaInicio, ahora)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

interface TarjetaProps {
  clase: Clase
  fecha: string
  sedeId: number
  instructor: string
  ocupacion: Ocupacion | undefined
  cargandoOcupacion: boolean
  paso: boolean
}

function TarjetaClase({ clase, fecha, sedeId, instructor, ocupacion, cargandoOcupacion, paso }: TarjetaProps) {
  const reservadas = ocupacion?.reservadas ?? 0
  const asistieron = ocupacion?.asistieron ?? 0
  const faltaron = ocupacion?.inasistencias ?? 0
  const inscritos = reservadas + asistieron + faltaron
  const porcentaje = Math.min(100, Math.round((inscritos / Math.max(1, clase.cupoMaximo)) * 100))
  const llena = !paso && reservadas >= clase.cupoMaximo

  return (
    <Link
      to={`/admin/clases/${clase.id}?fecha=${fecha}&sede=${sedeId}`}
      className={cn(
        'block rounded-control border border-line bg-surface px-3 py-2.5 transition-colors hover:border-plate-blue/50 hover:bg-plate-blue-soft/40',
        paso && 'bg-chalk/70',
      )}
    >
      <p className="flex items-center justify-between gap-2 text-sm tabular-nums text-steel">
        <span>
          {formatoHora(clase.horaInicio)} – {formatoHora(clase.horaFin)}
        </span>
        {clase.requierePlanVip && <Badge tono="tinta" className="px-2 text-[0.7rem]">Black</Badge>}
      </p>
      <p className="mt-0.5 font-medium leading-snug text-ink">{clase.nombreClase}</p>
      <p className="truncate text-sm text-steel">{instructor}</p>

      <div className="mt-2">
        {cargandoOcupacion ? (
          <p className="h-5 text-sm text-steel">…</p>
        ) : paso ? (
          <p className="text-sm text-steel">
            {inscritos === 0
              ? 'Nadie reservó'
              : reservadas > 0
                ? `${inscritos} ${inscritos === 1 ? 'reserva' : 'reservas'} · falta marcar ${reservadas}`
                : `${asistieron} ${asistieron === 1 ? 'asistió' : 'asistieron'}${faltaron ? ` · ${faltaron} no` : ''}`}
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className={cn('tabular-nums', llena ? 'font-medium text-plate-red' : 'text-ink-soft')}>
                {reservadas}/{clase.cupoMaximo}
              </span>
              {llena && <span className="text-plate-red">Llena</span>}
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
              <div
                className={cn('h-full rounded-full', llena ? 'bg-plate-red' : porcentaje >= 80 ? 'bg-plate-yellow' : 'bg-plate-green')}
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </>
        )}
      </div>
    </Link>
  )
}
