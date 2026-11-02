import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  descripcion?: ReactNode
}

/** Casilla con etiqueta y una línea opcional que explica qué pasa al marcarla. */
export const Checkbox = forwardRef<HTMLInputElement, Props>(function Checkbox(
  { label, descripcion, className, id, ...props },
  ref,
) {
  const generado = useId()
  const inputId = id ?? generado

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        aria-describedby={descripcion ? `${inputId}-desc` : undefined}
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-line-strong accent-plate-blue"
        {...props}
      />
      <div>
        <label htmlFor={inputId} className="cursor-pointer font-medium text-ink">
          {label}
        </label>
        {descripcion && (
          <p id={`${inputId}-desc`} className="text-sm text-steel">
            {descripcion}
          </p>
        )}
      </div>
    </div>
  )
})
