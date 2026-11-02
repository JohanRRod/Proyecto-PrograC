import { useMemo, useState } from 'react'
import { Pencil, Plus, Sparkles } from 'lucide-react'
import { Aviso } from '@/components/ui/Aviso'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { cn } from '@/lib/cn'
import { useAmenidadesAdmin, useAsignaciones, useGuardarAsignacion } from '../hooks'
import type { Asignacion, AsignacionDatos } from '../types'
import { AsignacionModal } from './AsignacionModal'

type Dialogo = { tipo: 'nueva' } | { tipo: 'editar'; asignacion: Asignacion } | null

/** Amenidades (zonas) de una sede: cupo, horario especial y disponibilidad. */
export function AmenidadesSede({ sedeId }: { sedeId: number }) {
  const asignaciones = useAsignaciones(sedeId)
  const amenidades = useAmenidadesAdmin()
  const guardar = useGuardarAsignacion(sedeId)
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const porId = useMemo(() => new Map((amenidades.data ?? []).map((a) => [a.id, a])), [amenidades.data])
  const filas = useMemo(
    () =>
      [...(asignaciones.data ?? [])].sort((a, b) =>
        (porId.get(a.amenidadId)?.nombre ?? '').localeCompare(porId.get(b.amenidadId)?.nombre ?? '', 'es'),
      ),
    [asignaciones.data, porId],
  )
  const sinAsignar = useMemo(() => {
    const asignadas = new Set((asignaciones.data ?? []).map((a) => a.amenidadId))
    return (amenidades.data ?? [])
      .filter((a) => !asignadas.has(a.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [asignaciones.data, amenidades.data])

  const abrir = (d: Dialogo) => {
    guardar.reset()
    setAviso(null)
    setDialogo(d)
  }

  const onGuardar = (datos: AsignacionDatos) => {
    const nueva = dialogo?.tipo === 'nueva'
    guardar.mutate(
      { nueva, datos },
      {
        onSuccess: () => {
          const nombre = porId.get(datos.amenidadId)?.nombre ?? 'La amenidad'
          setDialogo(null)
          setAviso(nueva ? `${nombre} se agregó a la sede.` : `${nombre}: cambios guardados.`)
        },
      },
    )
  }

  const cargando = asignaciones.isPending || amenidades.isPending
  const error = asignaciones.error ?? amenidades.error

  return (
    <Panel>
      <PanelHeader
        titulo="Amenidades de la sede"
        accion={
          <Button
            variante="secundario"
            tamano="sm"
            icono={<Plus className="size-4" aria-hidden="true" />}
            disabled={cargando || Boolean(error) || sinAsignar.length === 0}
            onClick={() => abrir({ tipo: 'nueva' })}
          >
            Agregar
          </Button>
        }
      />

      {aviso && (
        <div className="px-4 pt-4 sm:px-5">
          <Aviso onCerrar={() => setAviso(null)}>{aviso}</Aviso>
        </div>
      )}

      {cargando ? (
        <Cargando texto="Cargando amenidades…" />
      ) : error ? (
        <ErrorCarga
          error={error}
          onReintentar={() => {
            void asignaciones.refetch()
            void amenidades.refetch()
          }}
        />
      ) : filas.length === 0 ? (
        <Vacio
          icono={<Sparkles className="size-6" />}
          titulo="Esta sede aún no tiene amenidades"
          descripcion="Agrégale las zonas que ofrece, como peso libre, cardio o sauna."
          accion={<Button onClick={() => abrir({ tipo: 'nueva' })}>Agregar amenidad</Button>}
        />
      ) : (
        <ul className="divide-y divide-line">
          {filas.map((a) => {
            const amenidad = porId.get(a.amenidadId)
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className={cn('min-w-0', !a.disponible && 'text-steel')}>
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {amenidad?.nombre ?? `Amenidad #${a.amenidadId}`}
                    {amenidad?.requierePlanVip && <Badge tono="tinta">Black</Badge>}
                    {!a.disponible && <Badge tono="aviso">No disponible</Badge>}
                  </p>
                  <p className="text-sm text-steel">
                    Cupo {a.capacidadZona}
                    {a.horarioEspecial ? ` · Horario ${a.horarioEspecial}` : ' · Horario de la sede'}
                  </p>
                </div>
                <Button
                  variante="fantasma"
                  tamano="sm"
                  icono={<Pencil className="size-4" aria-hidden="true" />}
                  onClick={() => abrir({ tipo: 'editar', asignacion: a })}
                >
                  Editar
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <AsignacionModal
        abierto={dialogo !== null}
        asignacion={dialogo?.tipo === 'editar' ? dialogo.asignacion : null}
        amenidad={dialogo?.tipo === 'editar' ? (porId.get(dialogo.asignacion.amenidadId) ?? null) : null}
        disponibles={sinAsignar}
        guardando={guardar.isPending}
        error={guardar.error}
        onGuardar={onGuardar}
        onCerrar={() => setDialogo(null)}
      />
    </Panel>
  )
}
