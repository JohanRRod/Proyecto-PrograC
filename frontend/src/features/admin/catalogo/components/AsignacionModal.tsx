import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Aviso } from '@/components/ui/Aviso'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { SelectField } from '@/components/ui/SelectField'
import { ApiError } from '@/lib/http'
import { ERRORES_AMENIDAD, type AmenidadAdmin, type Asignacion, type AsignacionDatos } from '../types'

const esquema = z.object({
  amenidadId: z.string().min(1, 'Elige una amenidad.'),
  capacidadZona: z
    .string()
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, 'Debe ser un número entero mayor a 0.'),
  horarioEspecial: z.string().trim().max(100, 'Máximo 100 caracteres.'),
  disponible: z.boolean(),
})

type Valores = z.infer<typeof esquema>

interface Props {
  abierto: boolean
  /** Si viene, se edita esa asignación; si no, se agrega una amenidad nueva. */
  asignacion: Asignacion | null
  amenidad: AmenidadAdmin | null
  /** Amenidades que todavía no tiene la sede. */
  disponibles: AmenidadAdmin[]
  guardando: boolean
  error: unknown
  onGuardar: (datos: AsignacionDatos) => void
  onCerrar: () => void
}

export function AsignacionModal(props: Props) {
  const { abierto, asignacion, amenidad, guardando, onCerrar } = props
  return (
    <Modal
      abierto={abierto}
      titulo={asignacion ? `Editar ${amenidad?.nombre ?? 'amenidad'}` : 'Agregar amenidad'}
      descripcion={asignacion ? 'Cupo, horario y disponibilidad de esta zona en la sede.' : 'Elige una amenidad del catálogo y configura su zona en esta sede.'}
      bloqueado={guardando}
      onCerrar={onCerrar}
    >
      <Formulario key={asignacion?.id ?? 'nueva'} {...props} />
    </Modal>
  )
}

function Formulario({ asignacion, disponibles, guardando, error, onGuardar, onCerrar }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      amenidadId: asignacion ? String(asignacion.amenidadId) : '',
      capacidadZona: String(asignacion?.capacidadZona ?? 10),
      horarioEspecial: asignacion?.horarioEspecial ?? '',
      disponible: asignacion?.disponible ?? true,
    },
  })

  const mensajeError =
    error instanceof ApiError
      ? (ERRORES_AMENIDAD[error.message] ?? error.message)
      : error
        ? 'No se pudo guardar. Intenta de nuevo.'
        : null

  const enviar = handleSubmit((v) =>
    onGuardar({
      amenidadId: Number(v.amenidadId),
      capacidadZona: Number(v.capacidadZona),
      horarioEspecial: v.horarioEspecial.trim() || null,
      disponible: v.disponible,
    }),
  )

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {mensajeError && <Aviso tono="error">{mensajeError}</Aviso>}

      {asignacion ? (
        <input type="hidden" {...register('amenidadId')} />
      ) : (
        <SelectField label="Amenidad" error={errors.amenidadId?.message} {...register('amenidadId')}>
          <option value="">{disponibles.length ? 'Elige una amenidad' : 'La sede ya tiene todas'}</option>
          {disponibles.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
              {disponibles.some((o) => o.id !== a.id && o.nombre === a.nombre) ? ` · N.º ${a.id}` : ''}
              {a.requierePlanVip ? ' (Black)' : ''}
            </option>
          ))}
        </SelectField>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Cupo de la zona"
          type="number"
          inputMode="numeric"
          min={1}
          ayuda="Personas a la vez."
          error={errors.capacidadZona?.message}
          {...register('capacidadZona')}
        />
        <Field
          label="Horario especial (opcional)"
          placeholder="07:00-20:00"
          autoComplete="off"
          ayuda="Si es distinto al de la sede."
          error={errors.horarioEspecial?.message}
          {...register('horarioEspecial')}
        />
      </div>

      <Checkbox
        label="Disponible"
        descripcion="Si la desmarcas (por mantenimiento, por ejemplo), recepción no deja entrar a esa zona."
        {...register('disponible')}
      />

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variante="secundario" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" cargando={guardando}>
          {asignacion ? 'Guardar cambios' : 'Agregar'}
        </Button>
      </div>
    </form>
  )
}
