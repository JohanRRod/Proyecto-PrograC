import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Aviso } from '@/components/ui/Aviso'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { SelectField } from '@/components/ui/SelectField'
import { usePlanes } from '@/features/catalog/hooks'
import { planesUnicos } from '@/features/catalog/planes'
import { ApiError } from '@/lib/http'
import { formatoMoneda } from '@/lib/format'
import { SelectorMetodo } from '../../pagos/components/SelectorMetodo'
import type { MetodoPago } from '../../pagos/types'
import { useContratar } from '../hooks'

const esquema = z.object({
  planId: z.string().min(1, 'Elige un plan.'),
  metodoPagoId: z.string().min(1, 'Elige el método para el cobro automático.'),
  diaCorteMensual: z.coerce
    .number()
    .int('Escribe un número entero.')
    .min(1, 'Entre 1 y 28.')
    .max(28, 'Entre 1 y 28.'),
})

type Valores = z.input<typeof esquema>
type Salida = z.output<typeof esquema>

interface Props {
  abierto: boolean
  clienteId: string
  metodos: MetodoPago[]
  onCerrar: () => void
  onAgregarMetodo: () => void
  onContratado: () => void
}

export function ContratarModal({ abierto, clienteId, metodos, onCerrar, onAgregarMetodo, onContratado }: Props) {
  const contratar = useContratar(clienteId)
  const cerrar = () => {
    contratar.reset()
    onCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Contratar plan"
      descripcion="La membresía empieza hoy y se cobra cada mes de forma automática en el día de corte."
      bloqueado={contratar.isPending}
      onCerrar={cerrar}
    >
      {metodos.filter((m) => m.activo).length === 0 ? (
        <div className="space-y-4">
          <p>El cliente necesita un método de pago para el cobro automático.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variante="secundario" onClick={cerrar}>
              Cancelar
            </Button>
            <Button onClick={onAgregarMetodo}>Agregar método de pago</Button>
          </div>
        </div>
      ) : (
        <Formulario
          metodos={metodos}
          guardando={contratar.isPending}
          error={contratar.error}
          onCancelar={cerrar}
          onGuardar={(v) =>
            contratar.mutate(
              { planId: Number(v.planId), metodoPagoId: Number(v.metodoPagoId), diaCorteMensual: v.diaCorteMensual },
              { onSuccess: onContratado },
            )
          }
        />
      )}
    </Modal>
  )
}

function Formulario({
  metodos,
  guardando,
  error,
  onCancelar,
  onGuardar,
}: {
  metodos: MetodoPago[]
  guardando: boolean
  error: unknown
  onCancelar: () => void
  onGuardar: (v: Salida) => void
}) {
  const planes = usePlanes()
  const principal = metodos.find((m) => m.activo && m.es_predeterminado) ?? metodos.find((m) => m.activo)
  // Por defecto, el día de hoy (máximo 28). Se calcula una sola vez al abrir el formulario.
  const [diaPorDefecto] = useState(() => String(Math.min(new Date().getDate(), 28)))

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Valores, unknown, Salida>({
    resolver: zodResolver(esquema),
    defaultValues: {
      planId: '',
      metodoPagoId: principal ? String(principal.id) : '',
      diaCorteMensual: diaPorDefecto,
    },
  })

  const opciones = planesUnicos(planes.data ?? [])
  const planElegido = useWatch({ control, name: 'planId' })
  const plan = opciones.find((p) => String(p.id) === planElegido)

  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(onGuardar)}>
      {error != null && (
        <Aviso tono="error">{error instanceof ApiError ? error.message : 'No se pudo contratar el plan.'}</Aviso>
      )}
      <SelectField
        label="Plan"
        disabled={planes.isPending}
        error={errors.planId?.message ?? (planes.isError ? 'No se pudieron cargar los planes.' : undefined)}
        {...register('planId')}
      >
        <option value="">{planes.isPending ? 'Cargando planes…' : 'Elige un plan'}</option>
        {opciones.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre} ({formatoMoneda(p.precio_mensual)} al mes)
          </option>
        ))}
      </SelectField>
      {plan && (
        <p className="rounded-control bg-chalk px-3 py-2 text-sm text-steel">
          Permanencia mínima de {plan.meses_permanencia_minima} meses. Si cancela antes, paga el{' '}
          {Number(plan.porcentaje_penalizacion)}% de los meses que falten.
        </p>
      )}
      <SelectorMetodo metodos={metodos} error={errors.metodoPagoId?.message} {...register('metodoPagoId')} />
      <Field
        label="Día de cobro"
        type="number"
        inputMode="numeric"
        min={1}
        max={28}
        ayuda="Del 1 al 28 de cada mes."
        error={errors.diaCorteMensual?.message}
        {...register('diaCorteMensual')}
      />
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variante="secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" cargando={guardando}>
          Contratar plan
        </Button>
      </div>
    </form>
  )
}
