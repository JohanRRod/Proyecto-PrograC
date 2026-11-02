import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Aviso } from '@/components/ui/Aviso'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { TextArea } from '@/components/ui/TextArea'
import { ApiError } from '@/lib/http'
import { ERRORES_AMENIDAD, type AmenidadAdmin, type AmenidadDatos } from '../types'

const esquema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre.').max(100, 'Máximo 100 caracteres.'),
  descripcion: z.string().trim().max(500, 'Máximo 500 caracteres.'),
  requierePlanVip: z.boolean(),
})

type Valores = z.infer<typeof esquema>

interface Props {
  abierto: boolean
  amenidad: AmenidadAdmin | null
  guardando: boolean
  error: unknown
  onGuardar: (datos: AmenidadDatos) => void
  onCerrar: () => void
}

export function AmenidadModal(props: Props) {
  return (
    <Modal
      abierto={props.abierto}
      titulo={props.amenidad ? `Editar ${props.amenidad.nombre}` : 'Nueva amenidad'}
      descripcion={props.amenidad ? undefined : 'Después se asigna a cada sede desde la sede.'}
      bloqueado={props.guardando}
      onCerrar={props.onCerrar}
    >
      <Formulario key={props.amenidad?.id ?? 'nueva'} {...props} />
    </Modal>
  )
}

function Formulario({ amenidad, guardando, error, onGuardar, onCerrar }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: amenidad?.nombre ?? '',
      descripcion: amenidad?.descripcion ?? '',
      requierePlanVip: amenidad?.requierePlanVip ?? false,
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
      nombre: v.nombre.trim(),
      descripcion: v.descripcion.trim() || null,
      // El ícono no se edita aquí: se conserva el que tenga.
      iconoUrl: amenidad?.iconoUrl ?? null,
      requierePlanVip: v.requierePlanVip,
    }),
  )

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {mensajeError && <Aviso tono="error">{mensajeError}</Aviso>}
      <Field label="Nombre" autoComplete="off" error={errors.nombre?.message} {...register('nombre')} />
      <TextArea label="Descripción (opcional)" rows={3} error={errors.descripcion?.message} {...register('descripcion')} />
      <Checkbox
        label="Exclusiva Black"
        descripcion="Solo los miembros con plan Black pueden usar esta zona."
        {...register('requierePlanVip')}
      />
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variante="secundario" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" cargando={guardando}>
          {amenidad ? 'Guardar cambios' : 'Crear amenidad'}
        </Button>
      </div>
    </form>
  )
}
