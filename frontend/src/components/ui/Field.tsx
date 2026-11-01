import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  ayuda?: string
}

export const Field = forwardRef<HTMLInputElement, Props>(function Field(
  { label, error, ayuda, className, id, ...props },
  ref,
) {
  const generado = useId()
  const inputId = id ?? generado
  const descripcionId = `${inputId}-desc`

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-soft">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || ayuda ? descripcionId : undefined}
        className={cn(
          'h-11 w-full rounded-control border bg-surface px-3 text-base text-ink placeholder:text-steel/70',
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
