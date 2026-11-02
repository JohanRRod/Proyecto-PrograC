import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  error?: string
  ayuda?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, Props>(function TextArea(
  { label, error, ayuda, className, id, rows = 3, ...props },
  ref,
) {
  const generado = useId()
  const areaId = id ?? generado
  const descripcionId = `${areaId}-desc`

  return (
    <div className={className}>
      <label htmlFor={areaId} className="mb-1.5 block text-sm font-medium text-ink-soft">
        {label}
      </label>
      <textarea
        ref={ref}
        id={areaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || ayuda ? descripcionId : undefined}
        className={cn(
          'w-full rounded-control border bg-surface px-3 py-2.5 text-base text-ink placeholder:text-steel/70',
          'focus:border-plate-blue focus:outline-none focus:ring-2 focus:ring-plate-blue/20',
          error ? 'border-plate-red' : 'border-line-strong',
        )}
        {...props}
      />
      {(error || ayuda) && (
        <p id={descripcionId} className={cn('mt-1.5 text-sm', error ? 'text-plate-red' : 'text-steel')}>
          {error ?? ayuda}
        </p>
      )}
    </div>
  )
})
