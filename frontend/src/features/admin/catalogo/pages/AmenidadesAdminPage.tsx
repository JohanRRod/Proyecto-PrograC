import { useMemo, useState } from 'react'
import { Pencil, Plus, Sparkles } from 'lucide-react'
import { Aviso } from '@/components/ui/Aviso'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { AmenidadModal } from '../components/AmenidadModal'
import { useAmenidadesAdmin, useGuardarAmenidad } from '../hooks'
import type { AmenidadAdmin } from '../types'

export function AmenidadesAdminPage() {
  const amenidades = useAmenidadesAdmin()
  const guardar = useGuardarAmenidad()
  const [editando, setEditando] = useState<AmenidadAdmin | 'nueva' | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const ordenadas = useMemo(
    () => [...(amenidades.data ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') || a.id - b.id),
    [amenidades.data],
  )
  const repetidas = useMemo(() => {
    const nombres = ordenadas.map((a) => a.nombre.trim().toLowerCase())
    return new Set(nombres.filter((n, i) => nombres.indexOf(n) !== i))
  }, [ordenadas])

  const abrir = (a: AmenidadAdmin | 'nueva') => {
    guardar.reset()
    setAviso(null)
    setEditando(a)
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-steel">
          Zonas que puede ofrecer una sede. Para ponerlas en una sede, entra a la sede y agrégalas ahí.
        </p>
        <Button icono={<Plus className="size-4" aria-hidden="true" />} onClick={() => abrir('nueva')}>
          Nueva amenidad
        </Button>
      </div>

      {aviso && (
        <Aviso className="mb-4" onCerrar={() => setAviso(null)}>
          {aviso}
        </Aviso>
      )}

      <Panel>
        {amenidades.isPending ? (
          <Cargando texto="Cargando amenidades…" />
        ) : amenidades.isError ? (
          <ErrorCarga error={amenidades.error} onReintentar={() => void amenidades.refetch()} />
        ) : ordenadas.length === 0 ? (
          <Vacio
            icono={<Sparkles className="size-6" />}
            titulo="Aún no hay amenidades"
            descripcion="Crea la primera, por ejemplo peso libre o cardio."
            accion={<Button onClick={() => abrir('nueva')}>Nueva amenidad</Button>}
          />
        ) : (
          <ul className="divide-y divide-line">
            {ordenadas.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {a.nombre}
                    {repetidas.has(a.nombre.trim().toLowerCase()) && (
                      <span className="text-sm font-normal text-steel">N.º {a.id}</span>
                    )}
                    {a.requierePlanVip && <Badge tono="tinta">Black</Badge>}
                  </p>
                  {a.descripcion && <p className="text-sm text-steel">{a.descripcion}</p>}
                </div>
                <Button
                  variante="fantasma"
                  tamano="sm"
                  icono={<Pencil className="size-4" aria-hidden="true" />}
                  onClick={() => abrir(a)}
                >
                  Editar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <AmenidadModal
        abierto={editando !== null}
        amenidad={editando === 'nueva' ? null : editando}
        guardando={guardar.isPending}
        error={guardar.error}
        onCerrar={() => setEditando(null)}
        onGuardar={(datos) => {
          const id = editando === 'nueva' ? undefined : editando?.id
          guardar.mutate(
            { id, datos },
            {
              onSuccess: () => {
                setEditando(null)
                setAviso(id ? `${datos.nombre}: cambios guardados.` : `${datos.nombre} se creó. Ahora agrégala a las sedes que la tengan.`)
              },
            },
          )
        }}
      />
    </>
  )
}
