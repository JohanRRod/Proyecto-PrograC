import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CalendarDays, Check, Lock } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Aviso } from '@/components/ui/Aviso'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { useSucursales } from '@/features/catalog/hooks'
import { EstadoReservaBadge } from '@/features/clases/EstadoReservaBadge'
import { ERRORES_MI_RESERVA, mensajeDe } from '@/features/clases/errores'
import { ahoraGT, esFecha, fechaRelativa, hoyGT, sumarDias, yaEmpezo } from '@/features/clases/fechas'
import type { MiClase, MiReserva, MisClases } from '@/features/clases/types'
import { cn } from '@/lib/cn'
import { formatoHora } from '@/lib/format'
import { useCancelarMiReserva, useMisClases, useMisReservas, useReservarClase } from '../hooks'

const DIAS_VISIBLES = 7

/** "hoy", "mañana" o "el lun 9 nov". */
function cuando(fecha: string): string {
  const rel = fechaRelativa(fecha)
  return rel === 'Hoy' || rel === 'Mañana' ? rel.toLowerCase() : `el ${rel}`
}

/** Lo que se va a cancelar: viene de la lista de clases o de "Mis reservas". */
interface PorCancelar {
  id: number
  nombreClase: string
  fecha: string
  horaInicio: string
}

export function ClasesPage() {
  const [params, setParams] = useSearchParams()
  const sedeParam = Number(params.get('sede')) || null
  const diaParam = params.get('dia')

  const sedes = useSucursales()
  const clases = useMisClases(sedeParam)
  const reservas = useMisReservas()
  const reservar = useReservarClase()
  const cancelar = useCancelarMiReserva()

  const [aviso, setAviso] = useState<string | null>(null)
  const [porCancelar, setPorCancelar] = useState<PorCancelar | null>(null)

  const hoy = hoyGT()
  const dias = useMemo(() => Array.from({ length: DIAS_VISIBLES }, (_, i) => sumarDias(hoy, i)), [hoy])

  const actualizar = (cambios: Record<string, string>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(cambios)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    setParams(p, { replace: true })
  }

  const errorReserva = mensajeDe(reservar.error, ERRORES_MI_RESERVA, 'No se pudo reservar. Intenta de nuevo.')

  const reservarClase = (c: MiClase) => {
    setAviso(null)
    reservar.mutate(
      { claseId: c.claseId, fechaClase: c.fecha },
      {
        onSuccess: () =>
          setAviso(`Listo, reservaste ${c.nombreClase} ${cuando(c.fecha)} a las ${formatoHora(c.horaInicio)}.`),
      },
    )
  }

  return (
    <>
      <PageHeader titulo="Clases" descripcion="Reserva tu lugar en las clases de los próximos 7 días." />

      {aviso && (
        <Aviso className="mb-4" onCerrar={() => setAviso(null)}>
          {aviso}
        </Aviso>
      )}
      {errorReserva && (
        <Aviso tono="error" className="mb-4" onCerrar={() => reservar.reset()}>
          {errorReserva}
        </Aviso>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {clases.isPending ? (
            <Panel>
              <Cargando texto="Cargando clases…" />
            </Panel>
          ) : clases.isError ? (
            <Panel>
              <ErrorCarga error={clases.error} onReintentar={() => void clases.refetch()} />
            </Panel>
          ) : (
            <Agenda
              datos={clases.data}
              sedes={sedes.data ?? []}
              dias={dias}
              diaElegido={esFecha(diaParam) && dias.includes(diaParam) ? diaParam : null}
              reservandoId={reservar.isPending ? `${reservar.variables?.claseId}|${reservar.variables?.fechaClase}` : null}
              onSede={(id) => actualizar({ sede: String(id), dia: '' })}
              onDia={(d) => actualizar({ dia: d })}
              onReservar={reservarClase}
              onCancelar={(c) =>
                c.miReservaId && setPorCancelar({ id: c.miReservaId, nombreClase: c.nombreClase, fecha: c.fecha, horaInicio: c.horaInicio })
              }
            />
          )}
        </div>

        <MisReservas
          reservas={reservas.data}
          cargando={reservas.isPending}
          error={reservas.isError ? reservas.error : null}
          onReintentar={() => void reservas.refetch()}
          onCancelar={(r) => setPorCancelar({ id: r.id, nombreClase: r.nombreClase, fecha: r.fechaClase, horaInicio: r.horaInicio })}
        />
      </div>

      <ConfirmDialog
        abierto={porCancelar !== null}
        titulo="Cancelar la reserva"
        confirmar="Cancelar reserva"
        peligro
        cargando={cancelar.isPending}
        error={mensajeDe(cancelar.error, ERRORES_MI_RESERVA)}
        onCerrar={() => {
          setPorCancelar(null)
          cancelar.reset()
        }}
        onConfirmar={() =>
          porCancelar &&
          cancelar.mutate(porCancelar.id, {
            onSuccess: () => {
              setAviso(`Cancelaste tu lugar en ${porCancelar.nombreClase}.`)
              setPorCancelar(null)
            },
          })
        }
      >
        {porCancelar && (
          <>
            Vas a liberar tu lugar en {porCancelar.nombreClase} {cuando(porCancelar.fecha)} a las{' '}
            {formatoHora(porCancelar.horaInicio)}.
          </>
        )}
      </ConfirmDialog>
    </>
  )
}

interface AgendaProps {
  datos: MisClases
  sedes: { id: number; nombre: string }[]
  dias: string[]
  diaElegido: string | null
  reservandoId: string | null
  onSede: (id: number) => void
  onDia: (dia: string) => void
  onReservar: (c: MiClase) => void
  onCancelar: (c: MiClase) => void
}

function Agenda({ datos, sedes, dias, diaElegido, reservandoId, onSede, onDia, onReservar, onCancelar }: AgendaProps) {
  const porDia = new Map(dias.map((d) => [d, datos.clases.filter((c) => c.fecha === d)]))
  const dia = diaElegido ?? dias.find((d) => (porDia.get(d)?.length ?? 0) > 0) ?? dias[0]
  const delDia = porDia.get(dia) ?? []
  const motivo = datos.motivoSede ? (ERRORES_MI_RESERVA[datos.motivoSede] ?? datos.motivoSede) : null

  // Si la sede no aparece en el catálogo público (por ejemplo, inactiva), se agrega para no perderla.
  const opciones = sedes.some((s) => s.id === datos.sucursalId)
    ? sedes
    : [{ id: datos.sucursalId, nombre: datos.sucursal }, ...sedes]

  return (
    <Panel>
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <h2 className="text-lg">{datos.sucursal}</h2>
        <div>
          <label htmlFor="sede-clases" className="sr-only">
            Sede
          </label>
          <select
            id="sede-clases"
            value={datos.sucursalId}
            onChange={(e) => onSede(Number(e.target.value))}
            className="h-9 max-w-full rounded-full border border-line-strong bg-surface px-3 text-sm font-medium text-ink-soft"
          >
            {opciones.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
                {s.id === datos.sucursalId && datos.esSedeBase ? ' (tu sede)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {motivo && (
        <div className="flex gap-3 border-b border-line bg-plate-yellow-soft px-4 py-3 sm:px-5">
          <Lock className="mt-0.5 size-4 shrink-0 text-[#7a5a06]" aria-hidden="true" />
          <p className="text-sm">{motivo}</p>
        </div>
      )}

      <div role="tablist" aria-label="Día" className="flex gap-2 overflow-x-auto border-b border-line px-4 py-3 sm:px-5">
        {dias.map((d) => {
          const n = porDia.get(d)?.length ?? 0
          const activo = d === dia
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={activo}
              onClick={() => onDia(d)}
              className={cn(
                'flex shrink-0 flex-col items-center rounded-control border px-3 py-1.5 text-sm transition-colors',
                activo ? 'border-ink bg-ink text-white' : 'border-line-strong bg-surface text-ink-soft hover:border-ink/40',
              )}
            >
              <span className="font-medium first-letter:uppercase">{fechaRelativa(d)}</span>
              <span className={cn('text-xs', activo ? 'text-white/80' : 'text-steel')}>
                {n === 0 ? 'Sin clases' : `${n} ${n === 1 ? 'clase' : 'clases'}`}
              </span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel">
        {delDia.length === 0 ? (
          <Vacio
            icono={<CalendarDays className="size-6" />}
            titulo={datos.clases.length === 0 ? 'No hay clases en los próximos días' : 'No hay clases este día'}
            descripcion={datos.clases.length === 0 ? 'Prueba con otra sede.' : 'Elige otro día de la semana.'}
          />
        ) : (
          <ul className="divide-y divide-line">
            {delDia.map((c) => (
              <FilaClase
                key={`${c.claseId}|${c.fecha}`}
                clase={c}
                bloqueada={!!motivo}
                permiteVip={datos.permiteVip}
                reservando={reservandoId === `${c.claseId}|${c.fecha}`}
                ocupado={reservandoId !== null}
                onReservar={() => onReservar(c)}
                onCancelar={() => onCancelar(c)}
              />
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}

interface FilaProps {
  clase: MiClase
  bloqueada: boolean
  permiteVip: boolean
  reservando: boolean
  ocupado: boolean
  onReservar: () => void
  onCancelar: () => void
}

function FilaClase({ clase: c, bloqueada, permiteVip, reservando, ocupado, onReservar, onCancelar }: FilaProps) {
  const quedan = Math.max(0, c.cupoMaximo - c.reservadas)
  const soloBlack = c.requierePlanVip && !permiteVip

  return (
    <li className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
      <div className="w-14 shrink-0 tabular-nums">
        <p className="font-display text-lg font-bold leading-tight">{formatoHora(c.horaInicio)}</p>
        <p className="text-xs text-steel">a {formatoHora(c.horaFin)}</p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {c.nombreClase}
          {c.requierePlanVip && <Badge tono="tinta" className="px-2 text-[0.7rem]">Black</Badge>}
        </p>
        <p className="truncate text-sm text-steel">{c.instructor}</p>
        <p className={cn('text-sm', quedan === 0 && !c.miReservaId ? 'text-plate-red' : 'text-steel')}>
          {quedan === 0 ? 'Sin lugares' : quedan <= 3 ? `Quedan ${quedan} ${quedan === 1 ? 'lugar' : 'lugares'}` : `${quedan} de ${c.cupoMaximo} lugares libres`}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {c.miReservaId ? (
          <>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-plate-green">
              <Check className="size-4" aria-hidden="true" /> Reservada
            </span>
            <Button variante="fantasma" tamano="sm" onClick={onCancelar}>
              Cancelar
            </Button>
          </>
        ) : soloBlack ? (
          <span className="max-w-[7rem] text-right text-sm text-steel">Solo plan Black</span>
        ) : (
          <Button
            tamano="sm"
            cargando={reservando}
            disabled={bloqueada || quedan === 0 || (ocupado && !reservando)}
            onClick={onReservar}
          >
            {quedan === 0 ? 'Llena' : 'Reservar'}
          </Button>
        )}
      </div>
    </li>
  )
}

interface MisReservasProps {
  reservas: MiReserva[] | undefined
  cargando: boolean
  error: unknown
  onReintentar: () => void
  onCancelar: (r: MiReserva) => void
}

function MisReservas({ reservas, cargando, error, onReintentar, onCancelar }: MisReservasProps) {
  const [verHistorial, setVerHistorial] = useState(false)
  const ahora = ahoraGT()
  const lista = reservas ?? []

  const proximas = lista
    .filter((r) => r.estado === 'RESERVADA' && !yaEmpezo(r.fechaClase, r.horaInicio, ahora))
    .sort((a, b) => `${a.fechaClase}${a.horaInicio}`.localeCompare(`${b.fechaClase}${b.horaInicio}`))
  const historial = lista.filter((r) => !proximas.includes(r))

  return (
    <Panel>
      <PanelHeader titulo="Mis reservas" />
      {cargando ? (
        <Cargando className="py-8" />
      ) : error ? (
        <ErrorCarga error={error} onReintentar={onReintentar} />
      ) : (
        <>
          {proximas.length === 0 ? (
            <p className="px-4 py-5 text-steel sm:px-5">No tienes clases reservadas. Elige una de la lista para apartar tu lugar.</p>
          ) : (
            <ul className="divide-y divide-line">
              {proximas.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="font-medium">{r.nombreClase}</p>
                    <p className="text-sm text-steel first-letter:uppercase">
                      {fechaRelativa(r.fechaClase)} · {formatoHora(r.horaInicio)}
                    </p>
                    <p className="truncate text-sm text-steel">{r.sucursal}</p>
                  </div>
                  <Button variante="fantasma" tamano="sm" onClick={() => onCancelar(r)}>
                    Cancelar
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {historial.length > 0 && (
            <div className="border-t border-line">
              <button
                type="button"
                aria-expanded={verHistorial}
                onClick={() => setVerHistorial((v) => !v)}
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-plate-blue hover:underline sm:px-5"
              >
                {verHistorial ? 'Ocultar historial' : `Ver historial (${historial.length})`}
              </button>
              {verHistorial && (
                <ul className="divide-y divide-line border-t border-line">
                  {historial.slice(0, 20).map((r) => (
                    <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
                      <div className="min-w-0">
                        <p className="font-medium">{r.nombreClase}</p>
                        <p className="text-sm text-steel first-letter:uppercase">
                          {fechaRelativa(r.fechaClase)} · {formatoHora(r.horaInicio)} · {r.sucursal}
                        </p>
                      </div>
                      <EstadoReservaBadge estado={r.estado} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}
