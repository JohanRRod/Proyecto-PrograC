import { useMemo, useState } from 'react'
import { Pencil, Plus, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Aviso } from '@/components/ui/Aviso'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { VolverCatalogo } from '@/features/admin/catalogo/components/VolverCatalogo'
import { useSedesAdmin } from '@/features/admin/catalogo/hooks'
import type { Instructor } from '@/features/clases/types'
import { cn } from '@/lib/cn'
import { InstructorModal } from '../components/InstructorModal'
import { useGuardarInstructor, useInstructores } from '../hooks'

const ESTADOS = [
  { valor: 'activos', etiqueta: 'Activos' },
  { valor: 'inactivos', etiqueta: 'Inactivos' },
  { valor: 'todos', etiqueta: 'Todos' },
] as const

type Estado = (typeof ESTADOS)[number]['valor']

export function InstructoresPage() {
  const instructores = useInstructores()
  const sedes = useSedesAdmin()
  const guardar = useGuardarInstructor()
  const [estado, setEstado] = useState<Estado>('activos')
  const [modal, setModal] = useState<{ instructor: Instructor | null } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const visibles = useMemo(
    () =>
      (instructores.data ?? [])
        .filter((i) => (estado === 'todos' ? true : estado === 'activos' ? i.activo : !i.activo))
        .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es')),
    [instructores.data, estado],
  )

  const cerrar = () => {
    setModal(null)
    guardar.reset()
  }

  return (
    <>
      <VolverCatalogo to="/admin/clases" texto="Clases" />
      <PageHeader
        titulo="Instructores"
        descripcion="Quienes dan las clases. Solo los activos aparecen al programar una clase."
        accion={
          <Button icono={<Plus className="size-4" aria-hidden="true" />} onClick={() => setModal({ instructor: null })} disabled={!sedes.data}>
            Nuevo instructor
          </Button>
        }
      />

      {aviso && (
        <Aviso className="mb-4" onCerrar={() => setAviso(null)}>
          {aviso}
        </Aviso>
      )}

      <div role="group" aria-label="Filtrar por estado" className="mb-4 flex gap-2">
        {ESTADOS.map((e) => (
          <button
            key={e.valor}
            type="button"
            aria-pressed={estado === e.valor}
            onClick={() => setEstado(e.valor)}
            className={cn(
              'h-9 rounded-full border px-3.5 text-sm font-medium transition-colors',
              estado === e.valor ? 'border-ink bg-ink text-white' : 'border-line-strong bg-surface text-ink-soft hover:border-ink/40',
            )}
          >
            {e.etiqueta}
          </button>
        ))}
      </div>

      <Panel>
        {instructores.isPending ? (
          <Cargando texto="Cargando instructores…" />
        ) : instructores.isError ? (
          <ErrorCarga error={instructores.error} onReintentar={() => void instructores.refetch()} />
        ) : instructores.data.length === 0 ? (
          <Vacio
            icono={<UserRound className="size-6" />}
            titulo="Aún no hay instructores"
            descripcion="Registra al primero para poder programar clases."
            accion={<Button onClick={() => setModal({ instructor: null })}>Nuevo instructor</Button>}
          />
        ) : visibles.length === 0 ? (
          <Vacio titulo={estado === 'inactivos' ? 'No hay instructores inactivos' : 'No hay instructores activos'} />
        ) : (
          <>
            <table className="hidden w-full text-left text-[0.95rem] md:table">
              <thead className="border-b border-line text-sm text-steel">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium">Instructor</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Sede base</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Contacto</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Clases</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Estado</th>
                  <th scope="col" className="px-5 py-2.5"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibles.map((i) => (
                  <tr key={i.id} className={cn(!i.activo && 'text-steel')}>
                    <td className="px-5 py-3">
                      <span className="font-medium">{i.nombreCompleto}</span>
                      <span className="block text-sm text-steel">{i.especialidad}</span>
                    </td>
                    <td className="px-5 py-3">{i.sucursal}</td>
                    <td className="px-5 py-3">
                      <span className="block break-all">{i.email}</span>
                      {i.telefono && <span className="block text-sm text-steel">{i.telefono}</span>}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{i.clases}</td>
                    <td className="px-5 py-3">{i.activo ? <Badge tono="exito">Activo</Badge> : <Badge>Inactivo</Badge>}</td>
                    <td className="px-5 py-3 text-right">
                      <Button variante="fantasma" tamano="sm" icono={<Pencil className="size-4" aria-hidden="true" />} onClick={() => setModal({ instructor: i })}>
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-line md:hidden">
              {visibles.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="font-medium">{i.nombreCompleto}</p>
                    <p className="text-sm text-steel">
                      {i.especialidad} · {i.sucursal}
                    </p>
                    <p className="text-sm text-steel">
                      {i.clases} {i.clases === 1 ? 'clase' : 'clases'}
                      {!i.activo && ' · Inactivo'}
                    </p>
                  </div>
                  <Button variante="secundario" tamano="sm" onClick={() => setModal({ instructor: i })}>
                    Editar
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {sedes.data && (
        <InstructorModal
          abierto={modal !== null}
          instructor={modal?.instructor ?? null}
          sedes={sedes.data}
          guardando={guardar.isPending}
          error={guardar.error}
          onCerrar={cerrar}
          onGuardar={(datos) =>
            guardar.mutate(
              { id: modal?.instructor?.id, datos },
              {
                onSuccess: (i) => {
                  setAviso(modal?.instructor ? `Se guardaron los cambios de ${i.nombreCompleto}.` : `${i.nombreCompleto} quedó registrado.`)
                  cerrar()
                },
              },
            )
          }
        />
      )}
    </>
  )
}
