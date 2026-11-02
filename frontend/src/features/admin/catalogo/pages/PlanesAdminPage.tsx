import { useMemo, useState } from 'react'
import { Pencil, Plus, Power, PowerOff, Tags } from 'lucide-react'
import { Aviso } from '@/components/ui/Aviso'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Panel } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { beneficiosPlan, estiloNivel, nivelPlan } from '@/features/catalog/planes'
import { aNumero, formatoMoneda } from '@/lib/format'
import { ApiError } from '@/lib/http'
import { cn } from '@/lib/cn'
import { PlanModal } from '../components/PlanModal'
import { useDesactivarPlan, useGuardarPlan, usePlanesAdmin } from '../hooks'
import type { PlanAdmin, PlanDatos } from '../types'

/** Datos de un plan para reenviarlo con PUT cambiando solo el estado. */
function aDatos(p: PlanAdmin, activo: boolean): PlanDatos {
  return {
    nombre: p.nombre,
    descripcion: p.descripcion,
    precioMensual: aNumero(p.precio_mensual),
    cuotaInscripcion: aNumero(p.cuota_inscripcion),
    cuotaMantenimientoAnual: aNumero(p.cuota_mantenimiento_anual),
    mesesPermanenciaMinima: p.meses_permanencia_minima,
    porcentajePenalizacion: aNumero(p.porcentaje_penalizacion),
    permiteAccesoNacional: p.permite_acceso_nacional,
    permiteAccesoInternacional: p.permite_acceso_internacional,
    permiteAmenidadesVip: p.permite_amenidades_vip,
    invitadosMensualesGratis: p.invitados_mensuales_gratis,
    activo,
  }
}

const mensaje = (e: unknown) => (e instanceof ApiError ? e.message : e ? 'No se pudo completar. Intenta de nuevo.' : null)

export function PlanesAdminPage() {
  const planes = usePlanesAdmin()
  const guardar = useGuardarPlan()
  const desactivar = useDesactivarPlan()

  const [verInactivos, setVerInactivos] = useState(false)
  const [editando, setEditando] = useState<PlanAdmin | 'nuevo' | null>(null)
  const [porDesactivar, setPorDesactivar] = useState<PlanAdmin | null>(null)
  const [aviso, setAviso] = useState<{ tono: 'exito' | 'error'; texto: string } | null>(null)

  const visibles = useMemo(
    () =>
      (planes.data ?? [])
        .filter((p) => verInactivos || p.activo)
        .sort((a, b) => Number(b.activo) - Number(a.activo) || aNumero(a.precio_mensual) - aNumero(b.precio_mensual) || a.id - b.id),
    [planes.data, verInactivos],
  )

  const repetidos = useMemo(() => {
    const nombres = (planes.data ?? []).filter((p) => p.activo).map((p) => p.nombre.trim().toLowerCase())
    return new Set(nombres.filter((n, i) => nombres.indexOf(n) !== i))
  }, [planes.data])

  const inactivos = (planes.data ?? []).filter((p) => !p.activo).length

  const abrirEdicion = (p: PlanAdmin | 'nuevo') => {
    guardar.reset()
    setAviso(null)
    setEditando(p)
  }

  const reactivar = (p: PlanAdmin) =>
    guardar.mutate(
      { id: p.id, datos: aDatos(p, true) },
      {
        onSuccess: () => setAviso({ tono: 'exito', texto: `${p.nombre} se puede volver a contratar.` }),
        onError: (e) => setAviso({ tono: 'error', texto: mensaje(e) ?? '' }),
      },
    )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Checkbox
          label={`Mostrar inactivos${inactivos ? ` (${inactivos})` : ''}`}
          checked={verInactivos}
          onChange={(e) => setVerInactivos(e.target.checked)}
        />
        <Button icono={<Plus className="size-4" aria-hidden="true" />} onClick={() => abrirEdicion('nuevo')}>
          Nuevo plan
        </Button>
      </div>

      {aviso && (
        <Aviso tono={aviso.tono} className="mb-4" onCerrar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      {repetidos.size > 0 && (
        <Aviso tono="info" className="mb-4">
          Hay planes activos con el mismo nombre. Los clientes solo ven uno por nombre; puedes desactivar los repetidos
          (el número al lado del nombre los distingue).
        </Aviso>
      )}

      {planes.isPending ? (
        <Cargando texto="Cargando planes…" />
      ) : planes.isError ? (
        <Panel>
          <ErrorCarga error={planes.error} onReintentar={() => void planes.refetch()} />
        </Panel>
      ) : visibles.length === 0 ? (
        <Panel>
          <Vacio
            icono={<Tags className="size-6" />}
            titulo="No hay planes activos"
            descripcion="Crea un plan para que los clientes lo puedan contratar."
            accion={<Button onClick={() => abrirEdicion('nuevo')}>Nuevo plan</Button>}
          />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibles.map((p) => {
            const nivel = estiloNivel[nivelPlan(p)]
            const repetido = repetidos.has(p.nombre.trim().toLowerCase())
            return (
              <Panel key={p.id} className={cn('flex flex-col overflow-hidden', !p.activo && 'opacity-70')}>
                <div className={cn('h-1.5', nivel.banda)} />
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn('text-sm font-semibold uppercase tracking-wide', nivel.texto)}>{nivel.etiqueta}</p>
                      <h2 className="text-lg leading-tight">
                        {p.nombre}
                        {repetido && <span className="ml-1.5 text-sm font-normal text-steel">N.º {p.id}</span>}
                      </h2>
                    </div>
                    {p.activo ? <Badge tono="exito">Activo</Badge> : <Badge>Inactivo</Badge>}
                  </div>

                  <p className="mt-3 font-display text-3xl font-bold tabular-nums">
                    {formatoMoneda(p.precio_mensual)}
                    <span className="ml-1 text-base font-normal text-steel">/ mes</span>
                  </p>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <dt className="text-steel">Inscripción</dt>
                    <dd className="text-right tabular-nums">{formatoMoneda(p.cuota_inscripcion)}</dd>
                    <dt className="text-steel">Mantenimiento</dt>
                    <dd className="text-right tabular-nums">{formatoMoneda(p.cuota_mantenimiento_anual)}</dd>
                    <dt className="text-steel">Permanencia</dt>
                    <dd className="text-right tabular-nums">{p.meses_permanencia_minima} meses</dd>
                    <dt className="text-steel">Penalización</dt>
                    <dd className="text-right tabular-nums">{aNumero(p.porcentaje_penalizacion)} %</dd>
                  </dl>

                  <ul className="mt-3 space-y-1 text-sm">
                    {beneficiosPlan(p)
                      .filter((b) => b.incluido)
                      .map((b) => (
                        <li key={b.texto}>· {b.texto}</li>
                      ))}
                  </ul>

                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <Button
                      variante="secundario"
                      tamano="sm"
                      icono={<Pencil className="size-4" aria-hidden="true" />}
                      onClick={() => abrirEdicion(p)}
                    >
                      Editar
                    </Button>
                    {p.activo ? (
                      <Button
                        variante="fantasma"
                        tamano="sm"
                        icono={<PowerOff className="size-4" aria-hidden="true" />}
                        onClick={() => {
                          desactivar.reset()
                          setPorDesactivar(p)
                        }}
                      >
                        Desactivar
                      </Button>
                    ) : (
                      <Button
                        variante="fantasma"
                        tamano="sm"
                        icono={<Power className="size-4" aria-hidden="true" />}
                        cargando={guardar.isPending && guardar.variables?.id === p.id && editando === null}
                        onClick={() => reactivar(p)}
                      >
                        Reactivar
                      </Button>
                    )}
                  </div>
                </div>
              </Panel>
            )
          })}
        </div>
      )}

      <PlanModal
        abierto={editando !== null}
        plan={editando === 'nuevo' ? null : editando}
        guardando={guardar.isPending}
        error={guardar.error}
        onCerrar={() => setEditando(null)}
        onGuardar={(datos) => {
          const id = editando === 'nuevo' ? undefined : editando?.id
          guardar.mutate(
            { id, datos },
            {
              onSuccess: () => {
                setEditando(null)
                setAviso({ tono: 'exito', texto: id ? `${datos.nombre}: cambios guardados.` : `${datos.nombre} se creó.` })
              },
            },
          )
        }}
      />

      <ConfirmDialog
        abierto={porDesactivar !== null}
        titulo={`¿Desactivar ${porDesactivar?.nombre ?? 'el plan'}?`}
        confirmar="Desactivar"
        peligro
        cargando={desactivar.isPending}
        error={mensaje(desactivar.error)}
        onCerrar={() => setPorDesactivar(null)}
        onConfirmar={() => {
          const p = porDesactivar
          if (!p) return
          desactivar.mutate(p.id, {
            onSuccess: () => {
              setPorDesactivar(null)
              setAviso({ tono: 'exito', texto: `${p.nombre} ya no se puede contratar.` })
            },
          })
        }}
      >
        Deja de mostrarse en la página de planes y ya no se podrá contratar. Las membresías que ya lo tienen siguen igual.
      </ConfirmDialog>
    </>
  )
}
