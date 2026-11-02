import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  abierto: boolean
  titulo: string
  descripcion?: ReactNode
  children: ReactNode
  /** Mientras se guarda no se puede cerrar con Escape ni con la X. */
  bloqueado?: boolean
  onCerrar: () => void
}

/**
 * Ventana para formularios cortos (contratar plan, registrar método de pago...).
 * Usa <dialog> nativo: atrapa el foco y se cierra con Escape.
 */
export function Modal({ abierto, titulo, descripcion, children, bloqueado = false, onCerrar }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const tituloId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])

  return (
    <dialog
      ref={ref}
      aria-labelledby={tituloId}
      onCancel={(e) => {
        e.preventDefault()
        if (!bloqueado) onCerrar()
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-panel border border-line bg-surface p-0 text-ink shadow-[0_12px_40px_rgb(23_32_38/0.18)] backdrop:bg-ink/40"
    >
      {abierto && (
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id={tituloId} className="text-xl">
              {titulo}
            </h2>
            <button
              type="button"
              onClick={onCerrar}
              disabled={bloqueado}
              aria-label="Cerrar"
              className="-mr-2 -mt-1 grid size-9 place-items-center rounded-control text-ink-soft hover:bg-chalk disabled:opacity-40"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {descripcion && <div className="mt-1 text-steel">{descripcion}</div>}
          <div className="mt-5">{children}</div>
        </div>
      )}
    </dialog>
  )
}
