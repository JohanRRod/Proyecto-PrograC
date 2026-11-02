import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Aviso } from '@/components/ui/Aviso'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { SelectField } from '@/components/ui/SelectField'
import type { SucursalAdmin } from '@/features/admin/catalogo/types'
import { ERRORES_CLASE, mensajeDe } from '@/features/clases/errores'
import { DIAS, NOMBRE_DIA, horaCorta } from '@/features/clases/fechas'
import type { Clase, ClaseDatos, DiaSemana, Instructor } from '@/features/clases/types'
import { formatoHora } from '@/lib/format'

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

interface Props {
  abierto: boolean
  /** Si viene, se edita; si no, se crea una clase nueva. */
  clase: Clase | null
  /** Sede preseleccionada al crear. */
  sedeInicial: number | null
  sedes: SucursalAdmin[]
  instructores: Instructor[]
  /** Todas las clases, para avisar si el instructor ya está ocupado. */
  clases: Clase[]
  guardando: boolean
  error: unknown
  onGuardar: (datos: ClaseDatos) => void
  onCerrar: () => void
}

export function ClaseModal(props: Props) {
  const { abierto, clase, guardando, onCerrar } = props
  return (
    <Modal
      abierto={abierto}
      titulo={clase ? `Editar ${clase.nombreClase}` : 'Nueva clase'}
      descripcion="Se repite cada semana el mismo día y a la misma hora."
      bloqueado={guardando}
      onCerrar={onCerrar}
    >
      <Formulario key={clase?.id ?? 'nueva'} {...props} />
    </Modal>
  )
}

function Formulario({ clase, sedeInicial, sedes, instructores, clases, guardando, error, onGuardar, onCerrar }: Props) {
  const esquema = useMemo(
    () =>
      z
        .object({
          sucursalId: z.string().min(1, 'Elige una sede.'),
          nombreClase: z.string().trim().min(2, 'Escribe el nombre de la clase.').max(100, 'Máximo 100 caracteres.'),
          instructorId: z.string().min(1, 'Elige un instructor.'),
          diaSemana: z.enum(DIAS as [DiaSemana, ...DiaSemana[]], { message: 'Elige un día.' }),
          horaInicio: z.string().regex(HORA, 'Hora no válida.'),
          horaFin: z.string().regex(HORA, 'Hora no válida.'),
          cupoMaximo: z
            .string()
            .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 200, 'Entre 1 y 200 personas.'),
          requierePlanVip: z.boolean(),
        })
        .refine((v) => v.horaInicio < v.horaFin, { path: ['horaFin'], message: 'Debe ser después de la hora de inicio.' })
        .superRefine((v, ctx) => {
          const sede = sedes.find((s) => String(s.id) === v.sucursalId)
          if (sede && HORA.test(v.horaInicio) && HORA.test(v.horaFin)) {
            const abre = horaCorta(sede.horario_apertura)
            const cierra = horaCorta(sede.horario_cierre)
            if (abre < cierra && (v.horaInicio < abre || v.horaFin > cierra)) {
              ctx.addIssue({
                code: 'custom',
                path: ['horaInicio'],
                message: `${sede.nombre} abre de ${formatoHora(sede.horario_apertura)} a ${formatoHora(sede.horario_cierre)}.`,
              })
            }
          }
          const choque = clases.find(
            (c) =>
              c.id !== clase?.id &&
              String(c.instructorId) === v.instructorId &&
              c.diaSemana === v.diaSemana &&
              horaCorta(c.horaInicio) < v.horaFin &&
              horaCorta(c.horaFin) > v.horaInicio,
          )
          if (choque) {
            const sedeChoque = sedes.find((s) => s.id === choque.sucursalId)?.nombre
            ctx.addIssue({
              code: 'custom',
              path: ['instructorId'],
              message: `Ese día ya da ${choque.nombreClase} de ${formatoHora(choque.horaInicio)} a ${formatoHora(choque.horaFin)}${sedeChoque ? ` en ${sedeChoque}` : ''}.`,
            })
          }
        }),
    [sedes, clases, clase?.id],
  )

  type Valores = z.infer<typeof esquema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      sucursalId: String(clase?.sucursalId ?? sedeInicial ?? ''),
      nombreClase: clase?.nombreClase ?? '',
      instructorId: clase ? String(clase.instructorId) : '',
      diaSemana: clase?.diaSemana ?? 'LUNES',
      horaInicio: clase ? horaCorta(clase.horaInicio) : '07:00',
      horaFin: clase ? horaCorta(clase.horaFin) : '08:00',
      cupoMaximo: String(clase?.cupoMaximo ?? 25),
      requierePlanVip: clase?.requierePlanVip ?? false,
    },
  })

  // Activos, más el actual aunque esté inactivo (para no perderlo al editar).
  const opcionesInstructor = instructores
    .filter((i) => i.activo || i.id === clase?.instructorId)
    .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'))

  const opcionesSede = [...sedes].sort((a, b) => Number(b.activa) - Number(a.activa) || a.nombre.localeCompare(b.nombre, 'es'))

  const mensajeError = mensajeDe(error, ERRORES_CLASE, 'No se pudo guardar la clase. Intenta de nuevo.')

  const enviar = handleSubmit((v) =>
    onGuardar({
      sucursalId: Number(v.sucursalId),
      nombreClase: v.nombreClase.trim(),
      instructorId: Number(v.instructorId),
      diaSemana: v.diaSemana,
      horaInicio: v.horaInicio,
      horaFin: v.horaFin,
      cupoMaximo: Number(v.cupoMaximo),
      requierePlanVip: v.requierePlanVip,
    }),
  )

  if (opcionesInstructor.length === 0) {
    return (
      <div className="space-y-4">
        <Aviso tono="info">
          Para programar una clase primero registra al menos un instructor activo.
        </Aviso>
        <div className="flex justify-end">
          <ButtonLink to="/admin/clases/instructores">Ir a instructores</ButtonLink>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {mensajeError && <Aviso tono="error">{mensajeError}</Aviso>}

      <Field label="Nombre de la clase" placeholder="Spinning, Yoga, Funcional…" autoComplete="off" error={errors.nombreClase?.message} {...register('nombreClase')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Sede" error={errors.sucursalId?.message} {...register('sucursalId')}>
          <option value="">Elige una sede</option>
          {opcionesSede.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
              {s.activa ? '' : ' (inactiva)'}
            </option>
          ))}
        </SelectField>
        <SelectField label="Instructor" error={errors.instructorId?.message} {...register('instructorId')}>
          <option value="">Elige un instructor</option>
          {opcionesInstructor.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nombreCompleto} · {i.especialidad}
              {i.activo ? '' : ' (inactivo)'}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="Día" error={errors.diaSemana?.message} {...register('diaSemana')}>
          {DIAS.map((d) => (
            <option key={d} value={d}>
              {NOMBRE_DIA[d]}
            </option>
          ))}
        </SelectField>
        <Field label="Empieza" type="time" error={errors.horaInicio?.message} {...register('horaInicio')} />
        <Field label="Termina" type="time" error={errors.horaFin?.message} {...register('horaFin')} />
      </div>

      <Field
        label="Cupo"
        type="number"
        inputMode="numeric"
        min={1}
        max={200}
        ayuda="Cuántas personas pueden reservar cada semana."
        error={errors.cupoMaximo?.message}
        className="sm:max-w-[50%]"
        {...register('cupoMaximo')}
      />

      <Checkbox
        label="Solo plan Black"
        descripcion="Solo los miembros con plan Black podrán reservarla."
        {...register('requierePlanVip')}
      />

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variante="secundario" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" cargando={guardando}>
          {clase ? 'Guardar cambios' : 'Crear clase'}
        </Button>
      </div>
    </form>
  )
}
