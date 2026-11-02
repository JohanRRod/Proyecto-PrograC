import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { Aviso } from '@/components/ui/Aviso'
import { useSucursales } from '@/features/catalog/hooks'
import { ApiError } from '@/lib/http'
import type { Cliente, ClienteDatos } from '../types'

const hoy = () => new Date().toISOString().slice(0, 10)

/** Mismas reglas que ClienteRequest en el backend. */
const esquema = z.object({
  nombres: z.string().trim().min(1, 'Escribe los nombres.').max(100, 'Máximo 100 caracteres.'),
  apellidos: z.string().trim().min(1, 'Escribe los apellidos.').max(100, 'Máximo 100 caracteres.'),
  documentoIdentidad: z.string().trim().min(1, 'Escribe el documento de identidad.').max(30, 'Máximo 30 caracteres.'),
  email: z.email('Escribe un correo válido.'),
  telefono: z.string().trim().max(20, 'Máximo 20 caracteres.'),
  fechaNacimiento: z
    .string()
    .refine((v) => v === '' || v < hoy(), 'La fecha debe ser anterior a hoy.'),
  sucursalBaseId: z.string().min(1, 'Elige la sede base.'),
})

type Valores = z.infer<typeof esquema>

interface Props {
  cliente?: Cliente
  guardando: boolean
  error: unknown
  textoGuardar: string
  cancelarHacia: string
  onGuardar: (datos: ClienteDatos) => void
}

export function ClienteForm({ cliente, guardando, error, textoGuardar, cancelarHacia, onGuardar }: Props) {
  const sucursales = useSucursales()
  const edicion = Boolean(cliente)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombres: cliente?.nombres ?? '',
      apellidos: cliente?.apellidos ?? '',
      documentoIdentidad: cliente?.documentoIdentidad ?? '',
      email: cliente?.email ?? '',
      telefono: cliente?.telefono ?? '',
      fechaNacimiento: cliente?.fechaNacimiento ?? '',
      sucursalBaseId: cliente ? String(cliente.sucursalBaseId) : '',
    },
  })

  // Los duplicados (409) se muestran en el campo que corresponde.
  useEffect(() => {
    if (!(error instanceof ApiError)) return
    const m = error.message.toLowerCase()
    if (error.status === 409 && m.includes('correo')) setError('email', { message: error.message })
    if (error.status === 409 && m.includes('documento')) setError('documentoIdentidad', { message: error.message })
    if (error.detalles) {
      for (const [campo, mensaje] of Object.entries(error.detalles)) {
        if (campo in esquema.shape) setError(campo as keyof Valores, { message: mensaje })
      }
    }
  }, [error, setError])

  const errorGeneral =
    error && !(error instanceof ApiError && (error.status === 409 || error.detalles))
      ? error instanceof ApiError
        ? error.message
        : 'No se pudo guardar. Intenta de nuevo.'
      : null

  const enviar = handleSubmit((v) =>
    onGuardar({
      nombres: v.nombres.trim(),
      apellidos: v.apellidos.trim(),
      documentoIdentidad: v.documentoIdentidad.trim(),
      email: v.email.trim().toLowerCase(),
      telefono: v.telefono.trim() || null,
      fechaNacimiento: v.fechaNacimiento || null,
      sucursalBaseId: Number(v.sucursalBaseId),
    }),
  )

  return (
    <form onSubmit={enviar} noValidate className="space-y-6">
      {errorGeneral && <Aviso tono="error">{errorGeneral}</Aviso>}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-lg font-semibold">Datos personales</legend>
        <Field label="Nombres" autoComplete="off" error={errors.nombres?.message} {...register('nombres')} />
        <Field label="Apellidos" autoComplete="off" error={errors.apellidos?.message} {...register('apellidos')} />
        <Field
          label="Documento de identidad"
          autoComplete="off"
          readOnly={edicion}
          className={edicion ? '[&_input]:bg-chalk [&_input]:text-steel' : undefined}
          ayuda={edicion ? 'El documento no se puede cambiar.' : 'DPI o pasaporte.'}
          error={errors.documentoIdentidad?.message}
          {...register('documentoIdentidad')}
        />
        <Field
          label="Fecha de nacimiento (opcional)"
          type="date"
          max={hoy()}
          error={errors.fechaNacimiento?.message}
          {...register('fechaNacimiento')}
        />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-lg font-semibold">Contacto</legend>
        <Field
          label="Correo"
          type="email"
          inputMode="email"
          autoComplete="off"
          ayuda="Aquí le llegará la invitación para usar la app."
          error={errors.email?.message}
          {...register('email')}
        />
        <Field
          label="Teléfono (opcional)"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          error={errors.telefono?.message}
          {...register('telefono')}
        />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-lg font-semibold">Sede</legend>
        {edicion ? (
          <>
            {/* En edición la sede no cambia: se envía la actual en un campo oculto. */}
            <input type="hidden" {...register('sucursalBaseId')} />
            <SelectField
              label="Sede base"
              disabled
              value={String(cliente?.sucursalBaseId ?? '')}
              onChange={() => undefined}
              ayuda="La sede base no se puede cambiar."
            >
              {sucursales.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} ({s.ciudad}, {s.pais})
                </option>
              ))}
              {!sucursales.data?.some((s) => s.id === cliente?.sucursalBaseId) && (
                <option value={cliente?.sucursalBaseId}>Sede #{cliente?.sucursalBaseId}</option>
              )}
            </SelectField>
          </>
        ) : (
          <SelectField
            label="Sede base"
            disabled={sucursales.isPending}
            ayuda="Donde se inscribe; siempre podrá entrar ahí."
            error={errors.sucursalBaseId?.message ?? (sucursales.isError ? 'No se pudieron cargar las sedes.' : undefined)}
            {...register('sucursalBaseId')}
          >
            <option value="">{sucursales.isPending ? 'Cargando sedes…' : 'Elige una sede'}</option>
            {sucursales.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} ({s.ciudad}, {s.pais})
              </option>
            ))}
          </SelectField>
        )}
      </fieldset>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <ButtonLink to={cancelarHacia} variante="secundario">
          Cancelar
        </ButtonLink>
        <Button type="submit" cargando={guardando}>
          {textoGuardar}
        </Button>
      </div>
    </form>
  )
}
