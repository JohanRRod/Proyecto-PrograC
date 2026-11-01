import type { ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { ApiError } from '@/lib/http'
import { cn } from '@/lib/cn'
import { Button } from './Button'
import { Spinner } from './Spinner'

export function Cargando({ texto = 'Cargando…', className }: { texto?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-3 py-12 text-steel', className)}>
      <Spinner />
      <span>{texto}</span>
    </div>
  )
}

export function Vacio({
  titulo,
  descripcion,
  accion,
  icono,
}: {
  titulo: string
  descripcion?: string
  accion?: ReactNode
  icono?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icono && <div className="mb-3 text-steel">{icono}</div>}
      <p className="font-display text-lg font-semibold">{titulo}</p>
      {descripcion && <p className="mt-1 max-w-sm text-steel">{descripcion}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  )
}

export function ErrorCarga({ error, onReintentar }: { error: unknown; onReintentar?: () => void }) {
  const mensaje =
    error instanceof ApiError ? error.message : 'Ocurrió un error inesperado al cargar la información.'

  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <AlertTriangle className="mb-3 size-6 text-plate-red" aria-hidden="true" />
      <p className="max-w-sm">{mensaje}</p>
      {onReintentar && (
        <Button variante="secundario" tamano="sm" className="mt-4" onClick={onReintentar} icono={<RotateCw className="size-4" />}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
