import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'

interface Props {
  abierto: boolean
  titulo: string
  children: ReactNode
  /** Texto del botón que confirma; describe la acción ("Dar de baja", "Enviar invitación"). */
  confirmar: string
  peligro?: boolean
  cargando?: boolean
  error?: string | null
  onConfirmar: () => void
  onCerrar: () => void
}

/**
 * Confirmación para acciones con consecuencias. Usa <dialog> nativo:
 * atrapa el foco, se cierra con Escape y devuelve el foco al botón que lo abrió.
 */
export function ConfirmDialog({
  abierto,
  titulo,
  children,
  confirmar,
  peligro = false,
  cargando = false,
  error,
  onConfirmar,
  onCerrar,
}: Props) {
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
        if (!cargando) onCerrar()
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-panel border border-line bg-surface p-0 text-ink shadow-[0_12px_40px_rgb(23_32_38/0.18)] backdrop:bg-ink/40"
    >
      <div className="p-5 sm:p-6">
        <h2 id={tituloId} className="text-xl">
          {titulo}
        </h2>
        <div className="mt-2 text-steel">{children}</div>
        {error && (
          <p role="alert" className="mt-3 rounded-control bg-plate-red-soft px-3 py-2 text-sm text-plate-red">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variante="secundario" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </Button>
          <Button variante={peligro ? 'peligro' : 'primario'} cargando={cargando} onClick={onConfirmar}>
            {confirmar}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
