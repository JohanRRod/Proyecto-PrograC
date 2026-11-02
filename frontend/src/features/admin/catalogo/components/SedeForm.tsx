import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Aviso } from '@/components/ui/Aviso'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { Cargando, ErrorCarga } from '@/components/ui/StateMessage'
import { usePaises } from '@/features/catalog/hooks'
import { coordenada, type Coordenada } from '@/features/catalog/geo'
import type { Pais } from '@/features/catalog/types'
import { ApiError } from '@/lib/http'
import type { SucursalAdmin, SucursalDatos } from '../types'
import { MapaUbicacion } from './MapaUbicacion'

/** Centro aproximado de cada país, para empezar a ubicar una sede nueva. */
const CENTRO_PAIS: Record<string, Coordenada> = {
  GTM: [15.6, -90.3],
  MEX: [22.5, -101.5],
  COL: [4.6, -74.2],
}
const CENTRO_GENERAL: Coordenada = [14.5, -88]

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

const numeroEn = (min: number, max: number) => (v: string) => {
  const n = Number(v)
  return v.trim() !== '' && Number.isFinite(n) && n >= min && n <= max
}

function crearEsquema(codigosUsados: Set<string>) {
  return z
    .object({
      nombre: z.string().trim().min(1, 'Escribe el nombre.').max(150, 'Máximo 150 caracteres.'),
      codigoSucursal: z
        .string()
        .trim()
        .min(1, 'Escribe un código.')
        .max(20, 'Máximo 20 caracteres.')
        .regex(/^[A-Za-z0-9-]+$/, 'Solo letras, números y guiones.')
        .refine((v) => !codigosUsados.has(v.toUpperCase()), 'Ya hay otra sede con ese código.'),
      paisId: z.string().min(1, 'Elige el país.'),
      ciudad: z.string().trim().min(1, 'Escribe la ciudad.').max(100, 'Máximo 100 caracteres.'),
      direccion: z.string().trim().min(1, 'Escribe la dirección.'),
      telefono: z.string().trim().max(30, 'Máximo 30 caracteres.'),
      latitud: z.string().refine(numeroEn(-90, 90), 'Marca la ubicación en el mapa o escribe una latitud válida.'),
      longitud: z.string().refine(numeroEn(-180, 180), 'Escribe una longitud válida.'),
      horarioApertura: z.string().regex(HORA, 'Hora no válida.'),
      horarioCierre: z.string().regex(HORA, 'Hora no válida.'),
      capacidadMaxima: z
        .string()
        .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, 'Debe ser un número entero mayor a 0.'),
      esSedeVip: z.boolean(),
      activa: z.boolean(),
    })
    .refine((v) => v.horarioApertura < v.horarioCierre, {
      path: ['horarioCierre'],
      message: 'El cierre debe ser después de la apertura.',
    })
}

type Valores = z.infer<ReturnType<typeof crearEsquema>>

interface Props {
  sede?: SucursalAdmin
  /** Todas las sedes: para el mapa de referencia y para no repetir códigos. */
  sedes: SucursalAdmin[]
  guardando: boolean
  error: unknown
  textoGuardar: string
  cancelarHacia: string
  onGuardar: (datos: SucursalDatos) => void
}

/**
 * Espera a tener los países: si el select se monta sin opciones,
 * el navegador descarta el país de la sede que se está editando.
 */
export function SedeForm(props: Props) {
  const paises = usePaises()
  if (paises.isPending) return <Cargando />
  if (paises.isError) return <ErrorCarga error={paises.error} onReintentar={() => void paises.refetch()} />
  return <Formulario {...props} paises={paises.data} />
}

function Formulario({
  sede,
  sedes,
  guardando,
  error,
  textoGuardar,
  cancelarHacia,
  onGuardar,
  paises,
}: Props & { paises: Pais[] }) {

  const esquema = useMemo(
    () => crearEsquema(new Set(sedes.filter((s) => s.id !== sede?.id).map((s) => s.codigo_sucursal.toUpperCase()))),
    [sedes, sede?.id],
  )

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors },
  } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: sede?.nombre ?? '',
      codigoSucursal: sede?.codigo_sucursal ?? '',
      paisId: sede ? String(sede.pais_id) : '',
      ciudad: sede?.ciudad ?? '',
      direccion: sede?.direccion ?? '',
      telefono: sede?.telefono ?? '',
      latitud: sede ? String(sede.latitud) : '',
      longitud: sede ? String(sede.longitud) : '',
      horarioApertura: sede?.horario_apertura.slice(0, 5) ?? '05:00',
      horarioCierre: sede?.horario_cierre.slice(0, 5) ?? '22:00',
      capacidadMaxima: String(sede?.capacidad_maxima ?? 200),
      esSedeVip: sede?.es_sede_vip ?? false,
      activa: sede?.activa ?? true,
    },
  })

  const [latTexto, lngTexto, paisId] = useWatch({ control, name: ['latitud', 'longitud', 'paisId'] })
  const lat = Number(latTexto)
  const lng = Number(lngTexto)
  const posicion: Coordenada | null =
    latTexto !== '' && lngTexto !== '' && numeroEn(-90, 90)(latTexto) && numeroEn(-180, 180)(lngTexto) ? [lat, lng] : null

  const iso = paises.find((p) => String(p.id) === paisId)?.codigo_iso
  const centro = (iso && CENTRO_PAIS[iso]) || CENTRO_GENERAL

  const otras = useMemo(
    () =>
      sedes
        .filter((s) => s.id !== sede?.id && s.activa)
        .map((s) => ({ id: s.id, nombre: s.nombre, posicion: coordenada(s) })),
    [sedes, sede?.id],
  )

  const moverMarcador = ([nLat, nLng]: Coordenada) => {
    setValue('latitud', String(nLat), { shouldValidate: true, shouldDirty: true })
    setValue('longitud', String(nLng), { shouldValidate: true, shouldDirty: true })
  }

  // Los datos inválidos que devuelve el backend se muestran en su campo.
  useEffect(() => {
    if (!(error instanceof ApiError) || !error.detalles) return
    for (const [campo, mensaje] of Object.entries(error.detalles)) {
      if (campo in esquema.shape) setError(campo as keyof Valores, { message: mensaje })
    }
  }, [error, esquema, setError])

  const errorGeneral =
    error && !(error instanceof ApiError && error.detalles)
      ? error instanceof ApiError && error.status !== 500
        ? error.message
        : 'No se pudo guardar la sede. Revisa que el código no esté repetido e intenta de nuevo.'
      : null

  const enviar = handleSubmit((v) =>
    onGuardar({
      paisId: Number(v.paisId),
      nombre: v.nombre.trim(),
      codigoSucursal: v.codigoSucursal.trim().toUpperCase(),
      direccion: v.direccion.trim(),
      ciudad: v.ciudad.trim(),
      latitud: Number(v.latitud),
      longitud: Number(v.longitud),
      telefono: v.telefono.trim() || null,
      horarioApertura: v.horarioApertura,
      horarioCierre: v.horarioCierre,
      capacidadMaxima: Number(v.capacidadMaxima),
      esSedeVip: v.esSedeVip,
      activa: v.activa,
    }),
  )

  return (
    <form onSubmit={enviar} noValidate className="space-y-7">
      {errorGeneral && <Aviso tono="error">{errorGeneral}</Aviso>}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-lg font-semibold">Datos de la sede</legend>
        <Field label="Nombre" autoComplete="off" error={errors.nombre?.message} {...register('nombre')} />
        <Field
          label="Código"
          autoComplete="off"
          ayuda="Único. Por ejemplo GTM-XEL-03."
          className="[&_input]:uppercase"
          error={errors.codigoSucursal?.message}
          {...register('codigoSucursal')}
        />
        <SelectField label="País" error={errors.paisId?.message} {...register('paisId')}>
          <option value="">Elige un país</option>
          {paises.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </SelectField>
        <Field label="Ciudad" autoComplete="off" error={errors.ciudad?.message} {...register('ciudad')} />
        <Field
          label="Dirección"
          autoComplete="off"
          className="sm:col-span-2"
          error={errors.direccion?.message}
          {...register('direccion')}
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

      <fieldset>
        <legend className="mb-1 font-display text-lg font-semibold">Ubicación</legend>
        <p className="mb-3 text-sm text-steel">
          Haz clic en el mapa para colocar la sede y arrastra el marcador para ajustarla. Los puntos grises son las
          demás sedes.
        </p>
        <div className="h-72 overflow-hidden rounded-panel border border-line sm:h-96">
          <MapaUbicacion posicion={posicion} centro={centro} otras={otras} onCambiar={moverMarcador} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Latitud" inputMode="decimal" autoComplete="off" error={errors.latitud?.message} {...register('latitud')} />
          <Field label="Longitud" inputMode="decimal" autoComplete="off" error={errors.longitud?.message} {...register('longitud')} />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-3 font-display text-lg font-semibold">Operación</legend>
        <Field label="Abre" type="time" error={errors.horarioApertura?.message} {...register('horarioApertura')} />
        <Field label="Cierra" type="time" error={errors.horarioCierre?.message} {...register('horarioCierre')} />
        <Field
          label="Capacidad máxima"
          type="number"
          inputMode="numeric"
          min={1}
          ayuda="Personas a la vez."
          error={errors.capacidadMaxima?.message}
          {...register('capacidadMaxima')}
        />
        <div className="space-y-4 sm:col-span-3">
          <Checkbox
            label="Sede exclusiva Black"
            descripcion="Solo los miembros con plan Black pueden entrar. A los demás planes recepción les rechaza la entrada."
            {...register('esSedeVip')}
          />
          {sede && (
            <Checkbox
              label="Sede activa"
              descripcion="Si la desactivas, deja de aparecer en el mapa y no se pueden registrar entradas."
              {...register('activa')}
            />
          )}
        </div>
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
