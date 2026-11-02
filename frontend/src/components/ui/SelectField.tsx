import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  error?: string
  ayuda?: string
}

export const SelectField = forwardRef<HTMLSelectElement, Props>(function SelectField(
  { label, error, ayuda, className, id, children, ...props },
  ref,
) {
  const generado = useId()
  const selectId = id ?? generado
  const descripcionId = `${selectId}-desc`

  return (
    <div className={className}>
      <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-ink-soft">
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || ayuda ? descripcionId : undefined}
          className={cn(
            'h-11 w-full appearance-none rounded-control border bg-surface pl-3 pr-9 text-base text-ink',
            'focus:border-plate-blue focus:outline-none focus:ring-2 focus:ring-plate-blue/20 disabled:bg-chalk disabled:text-steel',
            error ? 'border-plate-red' : 'border-line-strong',
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-steel"
          aria-hidden="true"
        />
      </div>
      {(error || ayuda) && (
        <p id={descripcionId} className={cn('mt-1.5 text-sm', error ? 'text-plate-red' : 'text-steel')}>
          {error ?? ayuda}
        </p>
      )}
    </div>
  )
})
