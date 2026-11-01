import { FileText, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { ApiError } from '@/lib/http'
import { formatoFechaHora } from '@/lib/format'
import { useDocumentosRag, useRecargarDocumentos } from '../hooks'

/**
 * Documentos que usa el asistente para responder (RAG).
 * "Recargar documentos" vuelve a leer los .md del backend, los fragmenta y regenera los embeddings;
 * reemplaza lo anterior, no duplica.
 */
export function DocumentosRag() {
  const documentos = useDocumentosRag()
  const recargar = useRecargarDocumentos()

  const resultado = recargar.data
  const error = recargar.error

  return (
    <Panel>
      <PanelHeader
        titulo="Documentos del asistente"
        accion={
          <Button
            variante="secundario"
            tamano="sm"
            cargando={recargar.isPending}
            icono={<RefreshCw className="size-4" aria-hidden="true" />}
            onClick={() => recargar.mutate()}
          >
            {recargar.isPending ? 'Recargando' : 'Recargar documentos'}
          </Button>
        }
      />

      <div className="px-4 pt-3 text-sm text-steel sm:px-5">
        El asistente responde con estos documentos y con el catálogo actual. Después de editar un documento en{' '}
        <code className="text-ink-soft">backend/api/src/main/resources/rag</code>, recárgalo aquí.
      </div>

      {(resultado || error) && (
        <p
          role="status"
          className={
            error
              ? 'mx-4 mt-3 rounded-control bg-plate-red-soft px-3 py-2 text-sm text-plate-red sm:mx-5'
              : 'mx-4 mt-3 rounded-control bg-plate-green-soft px-3 py-2 text-sm text-plate-green sm:mx-5'
          }
        >
          {error
            ? error instanceof ApiError
              ? error.message
              : 'No se pudieron recargar los documentos.'
            : `Documentos recargados: ${resultado?.documentos} archivos, ${resultado?.fragmentos} fragmentos.`}
        </p>
      )}

      {documentos.isPending ? (
        <Cargando />
      ) : documentos.isError ? (
        <ErrorCarga error={documentos.error} onReintentar={() => void documentos.refetch()} />
      ) : documentos.data.length === 0 ? (
        <Vacio
          icono={<FileText className="size-6" />}
          titulo="El asistente aún no tiene documentos"
          descripcion="Recarga los documentos para que pueda responder sobre políticas y reglamento."
        />
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {documentos.data.map((d) => (
            <li key={d.archivo} className="flex items-start gap-3 px-4 py-3 sm:px-5">
              <FileText className="mt-0.5 size-5 shrink-0 text-steel" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{d.titulo}</p>
                <p className="text-sm text-steel">
                  {d.categoria}, {d.fragmentos} {Number(d.fragmentos) === 1 ? 'fragmento' : 'fragmentos'}
                </p>
              </div>
              <p className="shrink-0 text-right text-sm text-steel">
                <span className="sr-only">Cargado el </span>
                {formatoFechaHora(d.ingerido)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
