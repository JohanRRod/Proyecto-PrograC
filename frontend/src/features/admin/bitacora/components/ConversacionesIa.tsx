import { useState } from 'react'
import { Bot } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { cn } from '@/lib/cn'
import { formatoFechaHora } from '@/lib/format'
import { TAMANO_PAGINA, useConversaciones } from '../hooks'
import type { Conversacion } from '../types'
import { Paginador } from './Paginador'

interface Props {
  desde: string
  hasta: string
  pagina: number
  onPagina: (pagina: number) => void
}

/** Lo que la gente le preguntó al asistente y lo que respondió (tabla logs_agente_ia). */
export function ConversacionesIa({ desde, hasta, pagina, onPagina }: Props) {
  const conversaciones = useConversaciones(desde, hasta, pagina)

  return (
    <Panel>
      {conversaciones.isPending ? (
        <Cargando texto="Cargando conversaciones…" />
      ) : conversaciones.isError ? (
        <ErrorCarga error={conversaciones.error} onReintentar={() => void conversaciones.refetch()} />
      ) : conversaciones.data.total === 0 ? (
        <Vacio
          icono={<Bot className="size-6" />}
          titulo="Sin conversaciones en estas fechas"
          descripcion="Cada pregunta que alguien le hace al asistente desde la página pública queda registrada aquí."
        />
      ) : (
        <>
          <ul className={cn('divide-y divide-line', conversaciones.isFetching && 'opacity-60')}>
            {conversaciones.data.items.map((c) => (
              <FilaConversacion key={c.id} c={c} />
            ))}
          </ul>
          <Paginador
            pagina={pagina}
            tamano={TAMANO_PAGINA}
            total={conversaciones.data.total}
            cargando={conversaciones.isFetching}
            onCambiar={onPagina}
          />
        </>
      )}
    </Panel>
  )
}

function FilaConversacion({ c }: { c: Conversacion }) {
  const [abierta, setAbierta] = useState(false)
  const citados = Array.isArray(c.documentosCitados) ? c.documentosCitados.length : 0

  return (
    <li className="px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-medium">{c.pregunta}</p>
        <p className="text-sm text-steel tabular-nums">{formatoFechaHora(c.fechaHora)}</p>
      </div>
      <p className={cn('mt-1 whitespace-pre-line text-sm text-ink-soft', !abierta && 'line-clamp-2')}>{c.respuesta}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-steel">
        <button type="button" onClick={() => setAbierta((v) => !v)} className="font-medium text-plate-blue hover:underline">
          {abierta ? 'Ver menos' : 'Ver respuesta completa'}
        </button>
        <span>{citados} {citados === 1 ? 'fuente citada' : 'fuentes citadas'}</span>
        <span className="tabular-nums">{c.tokens.toLocaleString('es-GT')} tokens</span>
        <span className="tabular-nums">{(c.tiempoMs / 1000).toFixed(1)} s</span>
        <span className="truncate" title={c.sesionId}>Sesión {c.sesionId.slice(0, 8)}</span>
      </div>
    </li>
  )
}
