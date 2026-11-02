import { useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { Cargando, ErrorCarga } from '@/components/ui/StateMessage'
import { cn } from '@/lib/cn'
import { formatoFechaHora, legible } from '@/lib/format'
import { useOperacion } from '../hooks'
import { ACCIONES, TABLAS, type Json } from '../types'

interface Props {
  id: number | null
  onCerrar: () => void
}

/** El detalle de una operación: quién, cuándo, desde dónde y qué cambió. */
export function DetalleOperacion({ id, onCerrar }: Props) {
  const operacion = useOperacion(id)
  const o = operacion.data

  return (
    <Modal
      abierto={id !== null}
      amplio
      titulo={o ? `${ACCIONES[o.accion] ?? legible(o.accion)} · ${TABLAS[o.tabla] ?? o.tabla}` : 'Operación'}
      onCerrar={onCerrar}
    >
      {operacion.isPending ? (
        <Cargando className="py-8" />
      ) : operacion.isError ? (
        <ErrorCarga error={operacion.error} onReintentar={() => void operacion.refetch()} />
      ) : o ? (
        <div className="space-y-5">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Dato etiqueta="Fecha y hora">{formatoFechaHora(o.fechaHora)}</Dato>
            <Dato etiqueta="Usuario">{o.usuario ?? '—'}</Dato>
            <Dato etiqueta="Módulo">{o.modulo}</Dato>
            <Dato etiqueta="Registro">
              {TABLAS[o.tabla] ?? o.tabla}
              {o.registroId ? <span className="text-steel"> · {o.registroId}</span> : null}
            </Dato>
            <Dato etiqueta="Dirección IP">{o.ip ?? '—'}</Dato>
            <Dato etiqueta="Resultado">
              {o.exitoso ? <Badge tono="exito">Correcto</Badge> : <Badge tono="peligro">Con error</Badge>}
            </Dato>
          </dl>

          {!o.exitoso && o.mensajeError && (
            <p className="rounded-control bg-plate-red-soft px-3 py-2 text-sm text-plate-red">{o.mensajeError}</p>
          )}

          <Cambios antes={o.antes} despues={o.despues} />
        </div>
      ) : null}
    </Modal>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-steel">{etiqueta}</dt>
      <dd className="mt-0.5 break-words font-medium">{children}</dd>
    </div>
  )
}

const esObjeto = (v: Json): v is { [clave: string]: Json } => v !== null && typeof v === 'object' && !Array.isArray(v)

function mostrar(v: Json | undefined): string {
  if (v === undefined || v === null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/** Tabla campo por campo. Si hay antes y después, por defecto solo muestra lo que cambió. */
function Cambios({ antes, despues }: { antes: Json; despues: Json }) {
  const [todos, setTodos] = useState(false)

  if (antes == null && despues == null) {
    return <p className="text-sm text-steel">Esta operación no guardó datos del registro.</p>
  }

  if ((antes != null && !esObjeto(antes)) || (despues != null && !esObjeto(despues))) {
    return (
      <pre className="max-h-80 overflow-auto rounded-control bg-chalk p-3 text-xs">
        {JSON.stringify(despues ?? antes, null, 2)}
      </pre>
    )
  }

  const a = (antes ?? {}) as Record<string, Json>
  const d = (despues ?? {}) as Record<string, Json>
  const comparar = antes != null && despues != null
  const campos = [...new Set([...Object.keys(a), ...Object.keys(d)])]
  const filas = campos.map((campo) => ({
    campo,
    antes: a[campo],
    despues: d[campo],
    cambio: comparar && JSON.stringify(a[campo] ?? null) !== JSON.stringify(d[campo] ?? null),
  }))
  const cambiadas = filas.filter((f) => f.cambio)
  const visibles = comparar && !todos ? cambiadas : filas

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold">
          {comparar
            ? cambiadas.length === 0
              ? 'No cambió ningún campo'
              : `${cambiadas.length} ${cambiadas.length === 1 ? 'campo cambió' : 'campos cambiaron'}`
            : antes != null
              ? 'Cómo estaba'
              : 'Datos registrados'}
        </h3>
        {comparar && (
          <Checkbox label="Ver todos los campos" checked={todos} onChange={(e) => setTodos(e.target.checked)} />
        )}
      </div>

      {visibles.length > 0 && (
        <div className="overflow-x-auto rounded-control border border-line">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-chalk text-steel">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Campo</th>
                {comparar ? (
                  <>
                    <th scope="col" className="px-3 py-2 font-medium">Antes</th>
                    <th scope="col" className="px-3 py-2 font-medium">Después</th>
                  </>
                ) : (
                  <th scope="col" className="px-3 py-2 font-medium">Valor</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visibles.map((f) => (
                <tr key={f.campo} className={cn(f.cambio && 'bg-plate-yellow-soft/60')}>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-ink-soft">{f.campo}</td>
                  {comparar ? (
                    <>
                      <td className={cn('break-all px-3 py-2', f.cambio && 'text-plate-red line-through decoration-plate-red/40')}>
                        {mostrar(f.antes)}
                      </td>
                      <td className={cn('break-all px-3 py-2', f.cambio && 'font-medium text-plate-green')}>{mostrar(f.despues)}</td>
                    </>
                  ) : (
                    <td className="break-all px-3 py-2">{mostrar(f.antes ?? f.despues)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-steel">Los campos sensibles (claves y tokens) se guardan como ***.</p>
    </div>
  )
}
