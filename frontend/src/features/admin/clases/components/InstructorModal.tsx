import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Aviso } from '@/components/ui/Aviso'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { SelectField } from '@/components/ui/SelectField'
import type { SucursalAdmin } from '@/features/admin/catalogo/types'
import { ERRORES_INSTRUCTOR, mensajeDe } from '@/features/clases/errores'
import type { Instructor, InstructorDatos } from '@/features/clases/types'

const esquema = z.object({
  nombreCompleto: z.string().trim().min(3, 'Escribe el nombre completo.').max(150, 'Máximo 150 caracteres.'),
  especialidad: z.string().trim().min(2, 'Escribe su especialidad.').max(100, 'Máximo 100 caracteres.'),
  email: z.string().trim().email('Correo no válido.').max(150, 'Máximo 150 caracteres.'),
  telefono: z.string().trim().max(30, 'Máximo 30 caracteres.'),
  sucursalBaseId: z.string().min(1, 'Elige su sede.'),
  activo: z.boolean(),
})

type Valores = z.infer<typeof esquema>

interface Props {
  abierto: boolean
  instructor: Instructor | null
  sedes: SucursalAdmin[]
  guardando: boolean
  error: unknown
  onGuardar: (datos: InstructorDatos) => void
  onCerrar: () => void
}

export function InstructorModal(props: Props) {
  const { abierto, instructor, guardando, onCerrar } = props
  return (
    <Modal
      abierto={abierto}
      titulo={instructor ? `Editar a ${instructor.nombreCompleto}` : 'Nuevo instructor'}
      bloqueado={guardando}
      onCerrar={onCerrar}
    >
      <Formulario key={instructor?.id ?? 'nuevo'} {...props} />
    </Modal>
  )
}

function Formulario({ instructor, sedes, guardando, error, onGuardar, onCerrar }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombreCompleto: instructor?.nombreCompleto ?? '',
      especialidad: instructor?.especialidad ?? '',
      email: instructor?.email ?? '',
      telefono: instructor?.telefono ?? '',
      sucursalBaseId: instructor ? String(instructor.sucursalBaseId) : '',
      activo: instructor?.activo ?? true,
    },
  })

  const mensajeError = mensajeDe(error, ERRORES_INSTRUCTOR, 'No se pudo guardar. Intenta de nuevo.')
  const opcionesSede = [...sedes].sort((a, b) => Number(b.activa) - Number(a.activa) || a.nombre.localeCompare(b.nombre, 'es'))

  const enviar = handleSubmit((v) =>
    onGuardar({
      nombreCompleto: v.nombreCompleto.trim(),
      especialidad: v.especialidad.trim(),
      email: v.email.trim().toLowerCase(),
      telefono: v.telefono.trim() || null,
      sucursalBaseId: Number(v.sucursalBaseId),
      activo: v.activo,
    }),
  )

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {mensajeError && <Aviso tono="error">{mensajeError}</Aviso>}

      <Field label="Nombre completo" autoComplete="off" error={errors.nombreCompleto?.message} {...register('nombreCompleto')} />
      <Field
        label="Especialidad"
        placeholder="Spinning, yoga, entrenamiento funcional…"
        autoComplete="off"
        error={errors.especialidad?.message}
        {...register('especialidad')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Correo" type="email" autoComplete="off" error={errors.email?.message} {...register('email')} />
        <Field label="Teléfono (opcional)" type="tel" autoComplete="off" error={errors.telefono?.message} {...register('telefono')} />
      </div>
      <SelectField label="Sede base" error={errors.sucursalBaseId?.message} {...register('sucursalBaseId')}>
        <option value="">Elige una sede</option>
        {opcionesSede.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
            {s.activa ? '' : ' (inactiva)'}
          </option>
        ))}
      </SelectField>

      {instructor && (
        <Checkbox
          label="Activo"
          descripcion={
            instructor.clases > 0
              ? `Tiene ${instructor.clases} ${instructor.clases === 1 ? 'clase' : 'clases'}. Si lo desactivas siguen programadas; asígnales otro instructor cuando puedas.`
              : 'Si lo desactivas ya no aparece al programar clases.'
          }
          {...register('activo')}
        />
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variante="secundario" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" cargando={guardando}>
          {instructor ? 'Guardar cambios' : 'Registrar'}
        </Button>
      </div>
    </form>
  )
}
