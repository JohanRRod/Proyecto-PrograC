import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

const tonos = {
  exito: 'border-plate-green/30 bg-plate-green-soft text-plate-green',
  error: 'border-plate-red/30 bg-plate-red-soft text-plate-red',
  info: 'border-plate-blue/30 bg-plate-blue-soft text-plate-blue',
}

/** Mensaje en línea tras una acción (guardado, enviado, error). Se puede cerrar. */
export function Aviso({
  tono = 'exito',
  children,
  onCerrar,
  className,
}: {
  tono?: keyof typeof tonos
  children: ReactNode
  onCerrar?: () => void
  className?: string
}) {
  return (
    <div
      role={tono === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-control border px-3 py-2.5 text-sm', tonos[tono], className)}
    >
      <div className="flex-1">{children}</div>
      {onCerrar && (
        <button type="button" onClick={onCerrar} aria-label="Cerrar aviso" className="-m-1 rounded p-1 hover:bg-black/5">
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
