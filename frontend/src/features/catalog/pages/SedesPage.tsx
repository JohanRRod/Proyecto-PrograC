import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Crosshair, MapPinOff } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { cn } from '@/lib/cn'
import { formatoHora } from '@/lib/format'
import { SedeDetalle } from '../components/SedeDetalle'
import { SedesMap } from '../components/SedesMap'
import { coordenada, distanciaKm, formatoDistancia, type Coordenada } from '../geo'
import { usePaises, useSucursales } from '../hooks'
import type { Sucursal } from '../types'

type EstadoUbicacion = 'inactiva' | 'buscando' | 'lista' | 'denegada'

export function SedesPage() {
  const sucursales = useSucursales()
  const paises = usePaises()
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const panelRef = useRef<HTMLDivElement>(null)

  const [ubicacion, setUbicacion] = useState<Coordenada | null>(null)
  const [estadoUbicacion, setEstadoUbicacion] = useState<EstadoUbicacion>('inactiva')

  const paisFiltro = searchParams.get('pais')
  const seleccionadaId = id ? Number(id) : null

  const visibles = useMemo(() => {
    const todas = sucursales.data ?? []
    const filtradas = paisFiltro ? todas.filter((s) => String(s.pais_id) === paisFiltro) : todas
    if (!ubicacion) return filtradas
    return [...filtradas].sort((a, b) => distanciaKm(ubicacion, coordenada(a)) - distanciaKm(ubicacion, coordenada(b)))
  }, [sucursales.data, paisFiltro, ubicacion])

  const seleccionada = (sucursales.data ?? []).find((s) => s.id === seleccionadaId) ?? null
  const distancia = (s: Sucursal) => (ubicacion ? formatoDistancia(distanciaKm(ubicacion, coordenada(s))) : null)

  const conservarFiltro = () => (paisFiltro ? `?pais=${paisFiltro}` : '')

  const seleccionar = (sedeId: number) => {
    navigate(`/sedes/${sedeId}${conservarFiltro()}`)
    // En teléfono el detalle queda debajo del mapa: llevar la vista hasta él.
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ block: 'start' }))
    }
  }

  const cambiarPais = (paisId: number | null) => {
    const params = new URLSearchParams(searchParams)
    if (paisId === null) params.delete('pais')
    else params.set('pais', String(paisId))
    navigate({ pathname: '/', search: params.toString() }, { replace: true })
  }

  const buscarCercanas = () => {
    if (!('geolocation' in navigator)) {
      setEstadoUbicacion('denegada')
      return
    }
    setEstadoUbicacion('buscando')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion([pos.coords.latitude, pos.coords.longitude])
        setEstadoUbicacion('lista')
      },
      () => setEstadoUbicacion('denegada'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  }

  const paisSeleccionado = paises.data?.find((p) => String(p.id) === paisFiltro) ?? null
  const numPaises = new Set((sucursales.data ?? []).map((s) => s.pais_id)).size

  return (
    <div className="flex flex-1 flex-col lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-[27rem_1fr]">
      {/* Mapa: arriba en teléfono, a la derecha en escritorio */}
      <div className="relative h-[42dvh] min-h-64 border-b border-line lg:order-2 lg:h-full lg:border-b-0 lg:border-l">
        <SedesMap
          sedes={visibles}
          seleccionadaId={seleccionadaId}
          ubicacionUsuario={ubicacion}
          onSeleccionar={seleccionar}
        />
        <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex gap-3 rounded-control border border-line bg-surface/95 px-3 py-1.5 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-plate-blue" aria-hidden="true" />
            Sede
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-ink ring-2 ring-plate-blue" aria-hidden="true" />
            Con zonas Black
          </span>
        </div>
      </div>

      <div ref={panelRef} className="flex-1 scroll-mt-16 bg-surface lg:order-1 lg:overflow-y-auto">
        <div className="px-4 py-5 sm:px-6">
          {sucursales.isPending ? (
            <Cargando texto="Cargando sedes…" />
          ) : sucursales.isError ? (
            <ErrorCarga
              error={sucursales.error}
              onReintentar={() => {
                void sucursales.refetch()
                if (paises.isError) void paises.refetch()
              }}
            />
          ) : seleccionada ? (
            <SedeDetalle
              key={seleccionada.id}
              sede={seleccionada}
              distancia={distancia(seleccionada)}
              onVolver={() => navigate(`/${conservarFiltro()}`)}
            />
          ) : (
            <>
              <h1 className="text-[1.75rem] leading-tight">
                {paisSeleccionado
                  ? `${visibles.length} ${visibles.length === 1 ? 'sede' : 'sedes'} en ${paisSeleccionado.nombre}`
                  : `${sucursales.data.length} ${sucursales.data.length === 1 ? 'sede' : 'sedes'} en ${numPaises} ${numPaises === 1 ? 'país' : 'países'}`}
              </h1>
              <p className="mt-1 text-steel">Elige una sede para ver su horario y sus amenidades.</p>

              {(paises.data?.length ?? 0) > 1 && (
                <div role="group" aria-label="Filtrar por país" className="-mx-1 mt-5 flex flex-wrap gap-2 px-1">
                  <Chip activo={!paisFiltro} onClick={() => cambiarPais(null)}>
                    Todos
                  </Chip>
                  {paises.data?.map((p) => (
                    <Chip key={p.id} activo={paisFiltro === String(p.id)} onClick={() => cambiarPais(p.id)}>
                      {p.nombre}
                    </Chip>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center gap-3">
                <Button
                  variante="fantasma"
                  tamano="sm"
                  className="-ml-3"
                  cargando={estadoUbicacion === 'buscando'}
                  icono={<Crosshair className="size-4" aria-hidden="true" />}
                  onClick={buscarCercanas}
                  disabled={estadoUbicacion === 'lista'}
                >
                  {estadoUbicacion === 'lista' ? 'Ordenadas por cercanía' : 'Ordenar por cercanía'}
                </Button>
                {estadoUbicacion === 'denegada' && (
                  <span className="text-sm text-steel">No pudimos obtener tu ubicación.</span>
                )}
              </div>

              {visibles.length === 0 ? (
                <Vacio
                  icono={<MapPinOff className="size-6" />}
                  titulo="No hay sedes en este país"
                  accion={
                    <Button variante="secundario" tamano="sm" onClick={() => cambiarPais(null)}>
                      Ver todas
                    </Button>
                  }
                />
              ) : (
                <ul className="mt-2 divide-y divide-line">
                  {visibles.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => seleccionar(s.id)}
                        className="group flex w-full items-start gap-3 py-3.5 text-left"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'mt-1.5 size-3 shrink-0 rounded-full ring-2',
                            s.es_sede_vip ? 'bg-ink ring-plate-blue' : 'bg-plate-blue ring-plate-blue/20',
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium group-hover:text-plate-blue">{s.nombre}</span>
                          <span className="block text-sm text-steel">
                            {s.ciudad}, {s.pais}
                            {ubicacion && `, ${distancia(s)}`}
                          </span>
                          <span className="block text-sm text-steel">
                            {formatoHora(s.horario_apertura)} a {formatoHora(s.horario_cierre)}
                          </span>
                        </span>
                        {s.es_sede_vip && <Badge tono="tinta">Black</Badge>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        'h-9 rounded-full border px-3.5 text-sm font-medium transition-colors',
        activo ? 'border-ink bg-ink text-white' : 'border-line-strong bg-surface text-ink-soft hover:border-ink/40',
      )}
    >
      {children}
    </button>
  )
}
