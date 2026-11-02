import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { MapPinned, Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { usePaises } from '@/features/catalog/hooks'
import { cn } from '@/lib/cn'
import { formatoHora } from '@/lib/format'
import { useSedesAdmin } from '../hooks'
import type { SucursalAdmin } from '../types'

const ESTADOS = [
  { valor: '', etiqueta: 'Activas' },
  { valor: 'inactivas', etiqueta: 'Inactivas' },
  { valor: 'todas', etiqueta: 'Todas' },
]

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function SedesAdminPage() {
  const sedes = useSedesAdmin()
  const paises = usePaises()
  const [params, setParams] = useSearchParams()
  const busqueda = params.get('q') ?? ''
  const pais = params.get('pais') ?? ''
  const estado = params.get('estado') ?? ''

  const nombrePais = useMemo(() => {
    const mapa = new Map((paises.data ?? []).map((p) => [p.id, p.nombre]))
    return (id: number) => mapa.get(id) ?? '—'
  }, [paises.data])

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return (sedes.data ?? [])
      .filter((s) => (estado === 'todas' ? true : estado === 'inactivas' ? !s.activa : s.activa))
      .filter((s) => !pais || String(s.pais_id) === pais)
      .filter(
        (s) =>
          !q ||
          normalizar(s.nombre).includes(q) ||
          normalizar(s.codigo_sucursal).includes(q) ||
          normalizar(s.ciudad).includes(q),
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [sedes.data, busqueda, pais, estado])

  const actualizar = (clave: string, valor: string) => {
    const p = new URLSearchParams(params)
    if (valor) p.set(clave, valor)
    else p.delete(clave)
    setParams(p, { replace: true })
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel" aria-hidden="true" />
          <label htmlFor="buscar-sede" className="sr-only">
            Buscar sede
          </label>
          <input
            id="buscar-sede"
            type="search"
            value={busqueda}
            onChange={(e) => actualizar('q', e.target.value)}
            placeholder="Nombre, código o ciudad"
            className="h-11 w-full rounded-control border border-line-strong bg-surface pl-9 pr-3 text-base placeholder:text-steel/70 focus:border-plate-blue focus:outline-none focus:ring-2 focus:ring-plate-blue/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="filtro-pais" className="sr-only">
            País
          </label>
          <select
            id="filtro-pais"
            value={pais}
            onChange={(e) => actualizar('pais', e.target.value)}
            className="h-9 rounded-full border border-line-strong bg-surface px-3 text-sm font-medium text-ink-soft"
          >
            <option value="">Todos los países</option>
            {paises.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <div role="group" aria-label="Filtrar por estado" className="flex gap-2">
            {ESTADOS.map((e) => (
              <button
                key={e.valor}
                type="button"
                aria-pressed={estado === e.valor}
                onClick={() => actualizar('estado', e.valor)}
                className={cn(
                  'h-9 rounded-full border px-3.5 text-sm font-medium transition-colors',
                  estado === e.valor
                    ? 'border-ink bg-ink text-white'
                    : 'border-line-strong bg-surface text-ink-soft hover:border-ink/40',
                )}
              >
                {e.etiqueta}
              </button>
            ))}
          </div>
          <ButtonLink
            to="/admin/catalogo/sedes/nueva"
            icono={<Plus className="size-4" aria-hidden="true" />}
            className="ml-auto lg:ml-2"
          >
            Nueva sede
          </ButtonLink>
        </div>
      </div>

      <Panel>
        {sedes.isPending ? (
          <Cargando texto="Cargando sedes…" />
        ) : sedes.isError ? (
          <ErrorCarga error={sedes.error} onReintentar={() => void sedes.refetch()} />
        ) : sedes.data.length === 0 ? (
          <Vacio
            icono={<MapPinned className="size-6" />}
            titulo="Aún no hay sedes"
            descripcion="Registra la primera para que aparezca en el mapa."
            accion={<ButtonLink to="/admin/catalogo/sedes/nueva">Nueva sede</ButtonLink>}
          />
        ) : visibles.length === 0 ? (
          <Vacio titulo="Ninguna sede coincide" descripcion="Prueba con otro nombre o cambia los filtros." />
        ) : (
          <>
            <p className="border-b border-line px-4 py-2.5 text-sm text-steel sm:px-5">
              {visibles.length} de {sedes.data.length} {sedes.data.length === 1 ? 'sede' : 'sedes'}
            </p>

            <table className="hidden w-full text-left text-[0.95rem] md:table">
              <thead className="border-b border-line text-sm text-steel">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium">Sede</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Ubicación</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Horario</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Capacidad</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibles.map((s) => (
                  <tr key={s.id} className={cn('hover:bg-chalk/60', !s.activa && 'text-steel')}>
                    <td className="px-5 py-3">
                      <Link to={`/admin/catalogo/sedes/${s.id}`} className="font-medium text-ink hover:text-plate-blue">
                        {s.nombre}
                      </Link>
                      <span className="block text-sm text-steel">{s.codigo_sucursal}</span>
                    </td>
                    <td className="px-5 py-3">
                      {s.ciudad}
                      <span className="block text-sm text-steel">{nombrePais(s.pais_id)}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 tabular-nums">
                      {formatoHora(s.horario_apertura)} – {formatoHora(s.horario_cierre)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{s.capacidad_maxima}</td>
                    <td className="px-5 py-3">
                      <Estados sede={s} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-line md:hidden">
              {visibles.map((s) => (
                <li key={s.id}>
                  <Link to={`/admin/catalogo/sedes/${s.id}`} className="flex items-start justify-between gap-3 px-4 py-3.5">
                    <span className="min-w-0">
                      <span className="block font-medium">{s.nombre}</span>
                      <span className="block text-sm text-steel">
                        {s.ciudad}, {nombrePais(s.pais_id)} · {formatoHora(s.horario_apertura)} – {formatoHora(s.horario_cierre)}
                      </span>
                    </span>
                    <Estados sede={s} />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </>
  )
}

function Estados({ sede }: { sede: SucursalAdmin }) {
  return (
    <span className="flex flex-wrap justify-end gap-1.5 md:justify-start">
      {sede.activa ? <Badge tono="exito">Activa</Badge> : <Badge>Inactiva</Badge>}
      {sede.es_sede_vip && <Badge tono="tinta">Solo Black</Badge>}
    </span>
  )
}
