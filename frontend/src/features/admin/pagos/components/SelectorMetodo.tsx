import { forwardRef, type SelectHTMLAttributes } from 'react'
import { SelectField } from '@/components/ui/SelectField'
import { describirMetodo } from '../formato'
import type { MetodoPago } from '../types'

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  metodos: MetodoPago[]
  error?: string
  label?: string
}

/** Selector de métodos de pago activos del cliente; el principal queda primero. */
export const SelectorMetodo = forwardRef<HTMLSelectElement, Props>(function SelectorMetodo(
  { metodos, error, label = 'Método de pago', ...props },
  ref,
) {
  const activos = metodos
    .filter((m) => m.activo)
    .sort((a, b) => Number(b.es_predeterminado) - Number(a.es_predeterminado))

  return (
    <SelectField ref={ref} label={label} error={error} {...props}>
      <option value="">Elige un método</option>
      {activos.map((m) => (
        <option key={m.id} value={m.id}>
          {describirMetodo(m)}
          {m.es_predeterminado ? ' (principal)' : ''}
        </option>
      ))}
    </SelectField>
  )
})
