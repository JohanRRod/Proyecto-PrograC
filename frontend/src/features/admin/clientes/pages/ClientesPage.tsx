import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Search, UserPlus, Users } from 'lucide-react'
import { EstadoBadge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { PageHeader } from '@/components/layout/PageHeader'
import { useSucursales } from '@/features/catalog/hooks'
import { cn } from '@/lib/cn'
import { formatoFecha } from '@/lib/format'
import { useClientes } from '../hooks'
import { nombreCompleto, type Cliente } from '../types'

const FILTROS: { valor: string; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'ACTIVO', etiqueta: 'Activos' },
  { valor: 'MOROSO', etiqueta: 'Morosos' },
  { valor: 'INACTIVO', etiqueta: 'De baja' },
]

/** Quita tildes y pasa a minúsculas para que "jose" encuentre a "José". */
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function ClientesPage() {
  const clientes = useClientes()
  const sucursales = useSucursales()
  const [params, setParams] = useSearchParams()
  const busqueda = params.get('q') ?? ''
  const estado = params.get('estado') ?? ''

  const nombreSede = useMemo(() => {
    const mapa = new Map((sucursales.data ?? []).map((s) => [s.id, s.nombre]))
    return (id: number) => mapa.get(id) ?? `Sede #${id}`
  }, [sucursales.data])

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return (clientes.data ?? [])
      .filter((c) => !estado || c.estado === estado)
      .filter(
        (c) =>
          !q ||
          normalizar(nombreCompleto(c)).includes(q) ||
          normalizar(c.email).includes(q) ||
          normalizar(c.documentoIdentidad ?? '').includes(q),
      )
      .sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es'))
  }, [clientes.data, busqueda, estado])

  const actualizar = (clave: string, valor: string) => {
    const p = new URLSearchParams(params)
    if (valor) p.set(clave, valor)
    else p.delete(clave)
    setParams(p, { replace: true })
  }

  return (
    <>
      <PageHeader
        titulo="Clientes"
        descripcion="Busca a un cliente para ver sus datos, invitarlo a la app o darlo de baja."
        accion={
          <ButtonLink to="/admin/clientes/nuevo" icono={<UserPlus className="size-4" aria-hidden="true" />}>
            Nuevo cliente
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel" aria-hidden="true" />
          <label htmlFor="buscar-cliente" className="sr-only">
            Buscar cliente
          </label>
          <input
            id="buscar-cliente"
            type="search"
            value={busqueda}
            onChange={(e) => actualizar('q', e.target.value)}
            placeholder="Nombre, correo o documento"
            className="h-11 w-full rounded-control border border-line-strong bg-surface pl-9 pr-3 text-base placeholder:text-steel/70 focus:border-plate-blue focus:outline-none focus:ring-2 focus:ring-plate-blue/20"
          />
        </div>
        <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              aria-pressed={estado === f.valor}
              onClick={() => actualizar('estado', f.valor)}
              className={cn(
                'h-9 rounded-full border px-3.5 text-sm font-medium transition-colors',
                estado === f.valor
                  ? 'border-ink bg-ink text-white'
                  : 'border-line-strong bg-surface text-ink-soft hover:border-ink/40',
              )}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <Panel>
        {clientes.isPending ? (
          <Cargando texto="Cargando clientes…" />
        ) : clientes.isError ? (
          <ErrorCarga error={clientes.error} onReintentar={() => void clientes.refetch()} />
        ) : clientes.data.length === 0 ? (
          <Vacio
            icono={<Users className="size-6" />}
            titulo="Aún no hay clientes"
            descripcion="Registra al primero para poder contratarle un plan."
            accion={<ButtonLink to="/admin/clientes/nuevo">Nuevo cliente</ButtonLink>}
          />
        ) : visibles.length === 0 ? (
          <Vacio titulo="Ningún cliente coincide" descripcion="Prueba con otro nombre, correo o documento, o quita el filtro." />
        ) : (
          <>
            <p className="border-b border-line px-4 py-2.5 text-sm text-steel sm:px-5">
              {visibles.length} de {clientes.data.length} {clientes.data.length === 1 ? 'cliente' : 'clientes'}
            </p>

            {/* Escritorio */}
            <table className="hidden w-full text-left text-[0.95rem] md:table">
              <thead className="border-b border-line text-sm text-steel">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium">Cliente</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Documento</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Sede base</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Estado</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibles.map((c) => (
                  <tr key={c.id} className="hover:bg-chalk/60">
                    <td className="px-5 py-3">
                      <Link to={`/admin/clientes/${c.id}`} className="font-medium text-ink hover:text-plate-blue">
                        {nombreCompleto(c)}
                      </Link>
                      <span className="block text-sm text-steel">{c.email}</span>
                    </td>
                    <td className="px-5 py-3 tabular-nums">{c.documentoIdentidad}</td>
                    <td className="px-5 py-3">{nombreSede(c.sucursalBaseId)}</td>
                    <td className="px-5 py-3">
                      <EstadoBadge estado={c.estado} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-steel">{formatoFecha(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Teléfono */}
            <ul className="divide-y divide-line md:hidden">
              {visibles.map((c) => (
                <FilaMovil key={c.id} cliente={c} sede={nombreSede(c.sucursalBaseId)} />
              ))}
            </ul>
          </>
        )}
      </Panel>
    </>
  )
}

function FilaMovil({ cliente: c, sede }: { cliente: Cliente; sede: string }) {
  return (
    <li>
      <Link to={`/admin/clientes/${c.id}`} className="flex items-start justify-between gap-3 px-4 py-3.5">
        <span className="min-w-0">
          <span className="block font-medium">{nombreCompleto(c)}</span>
          <span className="block truncate text-sm text-steel">{c.email}</span>
          <span className="block text-sm text-steel">{sede}</span>
        </span>
        <EstadoBadge estado={c.estado} />
      </Link>
    </li>
  )
}
