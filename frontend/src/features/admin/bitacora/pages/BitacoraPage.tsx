import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ScrollText, Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Field } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { SelectField } from '@/components/ui/SelectField'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { esFecha, hoyGT, sumarDias } from '@/features/clases/fechas'
import { cn } from '@/lib/cn'
import { formatoFechaHora, legible } from '@/lib/format'
import { ConversacionesIa } from '../components/ConversacionesIa'
import { DetalleOperacion } from '../components/DetalleOperacion'
import { Paginador } from '../components/Paginador'
import { TAMANO_PAGINA, useOpcionesBitacora, useOperaciones } from '../hooks'
import { ACCIONES, TABLAS, type FiltrosBitacora, type Operacion } from '../types'

const VISTAS = [
  { valor: '', etiqueta: 'Operaciones' },
  { valor: 'ia', etiqueta: 'Asistente IA' },
] as const

const RESULTADOS = [
  { valor: '', etiqueta: 'Todas' },
  { valor: 'si', etiqueta: 'Correctas' },
  { valor: 'no', etiqueta: 'Con error' },
] as const

export function BitacoraPage() {
  const [params, setParams] = useSearchParams()
  const vista = params.get('vista') === 'ia' ? 'ia' : ''
  const pagina = Math.max(0, Number(params.get('pagina')) || 0)
  const hoy = hoyGT()

  const filtros: FiltrosBitacora = {
    desde: esFecha(params.get('desde')) ? (params.get('desde') as string) : sumarDias(hoy, -6),
    hasta: esFecha(params.get('hasta')) ? (params.get('hasta') as string) : hoy,
    modulo: params.get('modulo') ?? '',
    accion: params.get('accion') ?? '',
    resultado: (['si', 'no'].includes(params.get('resultado') ?? '') ? params.get('resultado') : '') as FiltrosBitacora['resultado'],
    q: params.get('q') ?? '',
  }

  /** Cambiar un filtro regresa a la primera página. */
  const actualizar = (cambios: Record<string, string>, conservarPagina = false) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(cambios)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    if (!conservarPagina) p.delete('pagina')
    setParams(p, { replace: true })
  }

  return (
    <>
      <PageHeader
        titulo="Bitácora"
        descripcion="Quién hizo qué y cuándo: cada alta, cambio, baja, cobro, entrada, reserva y exportación queda registrada con el antes y el después."
      />

      <div role="tablist" aria-label="Vista" className="mb-4 flex gap-2">
        {VISTAS.map((v) => (
          <button
            key={v.valor}
            type="button"
            role="tab"
            aria-selected={vista === v.valor}
            onClick={() => actualizar({ vista: v.valor })}
            className={cn(
              'h-9 rounded-full border px-3.5 text-sm font-medium transition-colors',
              vista === v.valor ? 'border-ink bg-ink text-white' : 'border-line-strong bg-surface text-ink-soft hover:border-ink/40',
            )}
          >
            {v.etiqueta}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[10rem_10rem_1fr_1fr]">
        <Field
          label="Desde"
          type="date"
          value={filtros.desde}
          max={filtros.hasta}
          onChange={(e) => actualizar({ desde: e.target.value })}
        />
        <Field
          label="Hasta"
          type="date"
          value={filtros.hasta}
          min={filtros.desde}
          onChange={(e) => actualizar({ hasta: e.target.value })}
        />
        {vista === '' && <FiltrosOperaciones filtros={filtros} onCambiar={actualizar} />}
      </div>

      {vista === 'ia' ? (
        <ConversacionesIa
          desde={filtros.desde}
          hasta={filtros.hasta}
          pagina={pagina}
          onPagina={(p) => actualizar({ pagina: p ? String(p) : '' }, true)}
        />
      ) : (
        <ListaOperaciones
          filtros={filtros}
          pagina={pagina}
          onPagina={(p) => actualizar({ pagina: p ? String(p) : '' }, true)}
          onResultado={(r) => actualizar({ resultado: r })}
        />
      )}
    </>
  )
}

function FiltrosOperaciones({
  filtros,
  onCambiar,
}: {
  filtros: FiltrosBitacora
  onCambiar: (cambios: Record<string, string>) => void
}) {
  const opciones = useOpcionesBitacora()
  const [texto, setTexto] = useState(filtros.q)

  // La búsqueda se aplica cuando se deja de escribir un momento.
  useEffect(() => {
    if (texto === filtros.q) return
    const t = setTimeout(() => onCambiar({ q: texto }), 400)
    return () => clearTimeout(t)
  }, [texto, filtros.q, onCambiar])

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Módulo" value={filtros.modulo} onChange={(e) => onCambiar({ modulo: e.target.value })}>
          <option value="">Todos</option>
          {opciones.data?.modulos.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </SelectField>
        <SelectField label="Acción" value={filtros.accion} onChange={(e) => onCambiar({ accion: e.target.value })}>
          <option value="">Todas</option>
          {opciones.data?.acciones.map((a) => (
            <option key={a} value={a}>
              {ACCIONES[a] ?? legible(a)}
            </option>
          ))}
        </SelectField>
      </div>
      <div>
        <label htmlFor="buscar-bitacora" className="mb-1.5 block text-sm font-medium text-ink-soft">
          Buscar
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel" aria-hidden="true" />
          <input
            id="buscar-bitacora"
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Usuario, id del registro o error"
            className="h-11 w-full rounded-control border border-line-strong bg-surface pl-9 pr-3 text-base placeholder:text-steel/70 focus:border-plate-blue focus:outline-none focus:ring-2 focus:ring-plate-blue/20"
          />
        </div>
      </div>
    </>
  )
}

function ListaOperaciones({
  filtros,
  pagina,
  onPagina,
  onResultado,
}: {
  filtros: FiltrosBitacora
  pagina: number
  onPagina: (p: number) => void
  onResultado: (r: string) => void
}) {
  const operaciones = useOperaciones(filtros, pagina)
  const [abierta, setAbierta] = useState<number | null>(null)

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div role="group" aria-label="Resultado" className="flex gap-2">
          {RESULTADOS.map((r) => (
            <button
              key={r.valor}
              type="button"
              aria-pressed={filtros.resultado === r.valor}
              onClick={() => onResultado(r.valor)}
              className={cn(
                'h-8 rounded-full border px-3 text-sm font-medium transition-colors',
                filtros.resultado === r.valor ? 'border-ink bg-ink text-white' : 'border-line-strong bg-surface text-ink-soft hover:border-ink/40',
              )}
            >
              {r.etiqueta}
            </button>
          ))}
        </div>
        {operaciones.data && (
          <p className="text-sm text-steel">
            {operaciones.data.total.toLocaleString('es-GT')} {operaciones.data.total === 1 ? 'operación' : 'operaciones'}
          </p>
        )}
      </div>

      {operaciones.isPending ? (
        <Cargando texto="Cargando la bitácora…" />
      ) : operaciones.isError ? (
        <ErrorCarga error={operaciones.error} onReintentar={() => void operaciones.refetch()} />
      ) : operaciones.data.total === 0 ? (
        <Vacio
          icono={<ScrollText className="size-6" />}
          titulo="No hay operaciones con estos filtros"
          descripcion="Prueba con otras fechas o quita algún filtro."
        />
      ) : (
        <>
          <table className={cn('hidden w-full text-left text-[0.95rem] md:table', operaciones.isFetching && 'opacity-60')}>
            <thead className="border-b border-line text-sm text-steel">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-medium">Fecha y hora</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Usuario</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Operación</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Registro</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {operaciones.data.items.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setAbierta(o.id)}
                  className="cursor-pointer hover:bg-chalk/60"
                >
                  <td className="whitespace-nowrap px-5 py-3 text-sm tabular-nums">{formatoFechaHora(o.fechaHora)}</td>
                  <td className="max-w-[14rem] truncate px-5 py-3" title={o.usuario ?? undefined}>
                    {o.usuario ?? '—'}
                    {o.ip && <span className="block text-xs text-steel">{o.ip}</span>}
                  </td>
                  <td className="px-5 py-3">
                    <button type="button" className="text-left font-medium hover:text-plate-blue" onClick={() => setAbierta(o.id)}>
                      {ACCIONES[o.accion] ?? legible(o.accion)}
                    </button>
                    <span className="block text-sm text-steel">{o.modulo}</span>
                  </td>
                  <td className="max-w-[16rem] px-5 py-3">
                    {TABLAS[o.tabla] ?? o.tabla}
                    {o.registroId && <span className="block truncate text-sm text-steel" title={o.registroId}>{o.registroId}</span>}
                  </td>
                  <td className="px-5 py-3">
                    <Resultado o={o} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className={cn('divide-y divide-line md:hidden', operaciones.isFetching && 'opacity-60')}>
            {operaciones.data.items.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => setAbierta(o.id)} className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left">
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {ACCIONES[o.accion] ?? legible(o.accion)} · {TABLAS[o.tabla] ?? o.tabla}
                    </span>
                    <span className="block truncate text-sm text-steel">{o.usuario ?? '—'}</span>
                    <span className="block text-sm text-steel tabular-nums">{formatoFechaHora(o.fechaHora)}</span>
                  </span>
                  <Resultado o={o} />
                </button>
              </li>
            ))}
          </ul>

          <Paginador
            pagina={pagina}
            tamano={TAMANO_PAGINA}
            total={operaciones.data.total}
            cargando={operaciones.isFetching}
            onCambiar={onPagina}
          />
        </>
      )}

      <DetalleOperacion id={abierta} onCerrar={() => setAbierta(null)} />
    </Panel>
  )
}

function Resultado({ o }: { o: Operacion }) {
  return o.exitoso ? (
    <Badge tono="exito">Correcta</Badge>
  ) : (
    <span title={o.mensajeError ?? undefined}>
      <Badge tono="peligro">Con error</Badge>
    </span>
  )
}
