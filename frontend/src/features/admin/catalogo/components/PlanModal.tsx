import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Aviso } from '@/components/ui/Aviso'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { TextArea } from '@/components/ui/TextArea'
import { estiloNivel, nivelPlan } from '@/features/catalog/planes'
import { aNumero } from '@/lib/format'
import { ApiError } from '@/lib/http'
import { cn } from '@/lib/cn'
import type { PlanAdmin, PlanDatos } from '../types'

const monto = (mensaje: string) =>
  z.string().refine((v) => v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0, mensaje)
const entero = (mensaje: string) =>
  z.string().refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0 && v.trim() !== '', mensaje)

/** Mismas reglas que PlanRequest en el backend. */
const esquema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre.').max(100, 'Máximo 100 caracteres.'),
  descripcion: z.string().trim().max(500, 'Máximo 500 caracteres.'),
  precioMensual: monto('Escribe un monto válido.'),
  cuotaInscripcion: monto('Escribe un monto válido (0 si no tiene).'),
  cuotaMantenimientoAnual: monto('Escribe un monto válido (0 si no tiene).'),
  mesesPermanenciaMinima: entero('Escribe un número entero.'),
  porcentajePenalizacion: z
    .string()
    .refine((v) => v.trim() !== '' && Number(v) >= 0 && Number(v) <= 100, 'Entre 0 y 100.'),
  invitadosMensualesGratis: entero('Escribe un número entero.'),
  permiteAccesoNacional: z.boolean(),
  permiteAccesoInternacional: z.boolean(),
  permiteAmenidadesVip: z.boolean(),
})

type Valores = z.infer<typeof esquema>

interface Props {
  abierto: boolean
  plan: PlanAdmin | null
  guardando: boolean
  error: unknown
  onGuardar: (datos: PlanDatos) => void
  onCerrar: () => void
}

export function PlanModal(props: Props) {
  return (
    <Modal
      abierto={props.abierto}
      titulo={props.plan ? `Editar ${props.plan.nombre}` : 'Nuevo plan'}
      descripcion={props.plan ? 'Los cambios de precio aplican a los cobros que vengan.' : 'Se podrá contratar en cuanto lo guardes.'}
      bloqueado={props.guardando}
      onCerrar={props.onCerrar}
    >
      <Formulario key={props.plan?.id ?? 'nuevo'} {...props} />
    </Modal>
  )
}

function Formulario({ plan, guardando, error, onGuardar, onCerrar }: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: plan?.nombre ?? '',
      descripcion: plan?.descripcion ?? '',
      precioMensual: plan ? String(aNumero(plan.precio_mensual)) : '',
      cuotaInscripcion: String(aNumero(plan?.cuota_inscripcion ?? 0)),
      cuotaMantenimientoAnual: String(aNumero(plan?.cuota_mantenimiento_anual ?? 0)),
      mesesPermanenciaMinima: String(plan?.meses_permanencia_minima ?? 12),
      porcentajePenalizacion: String(aNumero(plan?.porcentaje_penalizacion ?? 20)),
      invitadosMensualesGratis: String(plan?.invitados_mensuales_gratis ?? 0),
      permiteAccesoNacional: plan?.permite_acceso_nacional ?? false,
      permiteAccesoInternacional: plan?.permite_acceso_internacional ?? false,
      permiteAmenidadesVip: plan?.permite_amenidades_vip ?? false,
    },
  })

  const [nacional, vip] = useWatch({ control, name: ['permiteAccesoNacional', 'permiteAmenidadesVip'] })
  const nivel = estiloNivel[nivelPlan({ permite_acceso_nacional: nacional, permite_amenidades_vip: vip })]

  const mensajeError =
    error instanceof ApiError ? error.message : error ? 'No se pudo guardar el plan. Intenta de nuevo.' : null

  const enviar = handleSubmit((v) =>
    onGuardar({
      nombre: v.nombre.trim(),
      descripcion: v.descripcion.trim() || null,
      precioMensual: Number(v.precioMensual),
      cuotaInscripcion: Number(v.cuotaInscripcion),
      cuotaMantenimientoAnual: Number(v.cuotaMantenimientoAnual),
      mesesPermanenciaMinima: Number(v.mesesPermanenciaMinima),
      porcentajePenalizacion: Number(v.porcentajePenalizacion),
      invitadosMensualesGratis: Number(v.invitadosMensualesGratis),
      permiteAccesoNacional: v.permiteAccesoNacional,
      permiteAccesoInternacional: v.permiteAccesoInternacional,
      permiteAmenidadesVip: v.permiteAmenidadesVip,
      // Editar no cambia el estado; activar y desactivar se hace desde la lista.
      activo: plan?.activo ?? true,
    }),
  )

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {mensajeError && <Aviso tono="error">{mensajeError}</Aviso>}

      <Field label="Nombre" autoComplete="off" error={errors.nombre?.message} {...register('nombre')} />
      <TextArea label="Descripción (opcional)" rows={2} error={errors.descripcion?.message} {...register('descripcion')} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Mensualidad (Q)" type="number" inputMode="decimal" min={0} step="0.01" error={errors.precioMensual?.message} {...register('precioMensual')} />
        <Field label="Inscripción (Q)" type="number" inputMode="decimal" min={0} step="0.01" error={errors.cuotaInscripcion?.message} {...register('cuotaInscripcion')} />
        <Field label="Mantenimiento anual (Q)" type="number" inputMode="decimal" min={0} step="0.01" error={errors.cuotaMantenimientoAnual?.message} {...register('cuotaMantenimientoAnual')} />
        <Field label="Permanencia (meses)" type="number" inputMode="numeric" min={0} error={errors.mesesPermanenciaMinima?.message} {...register('mesesPermanenciaMinima')} />
        <Field
          label="Penalización (%)"
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step="0.01"
          ayuda="De las mensualidades que faltan si cancela antes."
          error={errors.porcentajePenalizacion?.message}
          {...register('porcentajePenalizacion')}
        />
        <Field label="Invitados gratis al mes" type="number" inputMode="numeric" min={0} error={errors.invitadosMensualesGratis?.message} {...register('invitadosMensualesGratis')} />
      </div>

      <fieldset className="space-y-3 rounded-panel border border-line p-4">
        <legend className="px-1 text-sm font-medium text-ink-soft">Qué incluye</legend>
        <Checkbox label="Todas las sedes del país" descripcion="Si no, solo su sede base." {...register('permiteAccesoNacional')} />
        <Checkbox label="Sedes de otros países" {...register('permiteAccesoInternacional')} />
        <Checkbox label="Zonas y sedes Black" descripcion="Sauna, hidromasaje, bronceado y sedes exclusivas Black." {...register('permiteAmenidadesVip')} />
        <p className="flex items-center gap-2 pt-1 text-sm text-steel">
          Se mostrará como plan
          <span className={cn('rounded-full px-2.5 py-0.5 text-[0.8rem] font-semibold', nivel.suave, nivel.texto)}>
            {nivel.etiqueta}
          </span>
        </p>
      </fieldset>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variante="secundario" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" cargando={guardando}>
          {plan ? 'Guardar cambios' : 'Crear plan'}
        </Button>
      </div>
    </form>
  )
}
