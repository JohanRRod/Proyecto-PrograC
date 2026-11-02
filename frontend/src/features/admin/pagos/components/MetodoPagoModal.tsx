import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Aviso } from '@/components/ui/Aviso'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { SelectField } from '@/components/ui/SelectField'
import { ApiError } from '@/lib/http'
import { useRegistrarMetodo } from '../hooks'
import { TIPOS_CUENTA } from '../types'

/** Mismas reglas que MetodoPagoRequest en el backend. */
const esquema = z.object({
  tipoCuenta: z.enum(['TARJETA_CREDITO', 'TARJETA_DEBITO', 'CUENTA_BANCARIA']),
  bancoEmisor: z.string().trim().min(1, 'Escribe el banco.').max(100, 'Máximo 100 caracteres.'),
  ultimosCuatroDigitos: z.string().regex(/^\d{4}$/, 'Escribe solo los últimos 4 dígitos.'),
  titular: z.string().trim().min(1, 'Escribe el nombre del titular.').max(150, 'Máximo 150 caracteres.'),
})

type Valores = z.infer<typeof esquema>

interface Props {
  abierto: boolean
  clienteId: string
  titularSugerido: string
  onCerrar: () => void
  onGuardado: () => void
}

export function MetodoPagoModal({ abierto, clienteId, titularSugerido, onCerrar, onGuardado }: Props) {
  const registrar = useRegistrarMetodo(clienteId)

  return (
    <Modal
      abierto={abierto}
      titulo="Agregar método de pago"
      descripcion="Es un pago simulado: solo se guardan el banco y los últimos 4 dígitos."
      bloqueado={registrar.isPending}
      onCerrar={onCerrar}
    >
      <Formulario
        titularSugerido={titularSugerido}
        guardando={registrar.isPending}
        error={registrar.error}
        onCancelar={onCerrar}
        onGuardar={(v) => registrar.mutate(v, { onSuccess: onGuardado })}
      />
    </Modal>
  )
}

function Formulario({
  titularSugerido,
  guardando,
  error,
  onCancelar,
  onGuardar,
}: {
  titularSugerido: string
  guardando: boolean
  error: unknown
  onCancelar: () => void
  onGuardar: (v: Valores) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: { tipoCuenta: 'TARJETA_DEBITO', bancoEmisor: '', ultimosCuatroDigitos: '', titular: titularSugerido },
  })

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((v) => onGuardar({ ...v, bancoEmisor: v.bancoEmisor.trim(), titular: v.titular.trim() }))}
    >
      {error != null && (
        <Aviso tono="error">{error instanceof ApiError ? error.message : 'No se pudo guardar el método de pago.'}</Aviso>
      )}
      <SelectField label="Tipo" error={errors.tipoCuenta?.message} {...register('tipoCuenta')}>
        {Object.entries(TIPOS_CUENTA).map(([valor, etiqueta]) => (
          <option key={valor} value={valor}>
            {etiqueta}
          </option>
        ))}
      </SelectField>
      <Field label="Banco" placeholder="Por ejemplo, Banrural" error={errors.bancoEmisor?.message} {...register('bancoEmisor')} />
      <Field
        label="Últimos 4 dígitos"
        inputMode="numeric"
        maxLength={4}
        autoComplete="off"
        ayuda="Nunca el número completo."
        error={errors.ultimosCuatroDigitos?.message}
        {...register('ultimosCuatroDigitos')}
      />
      <Field label="Titular" error={errors.titular?.message} {...register('titular')} />
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variante="secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" cargando={guardando}>
          Agregar método
        </Button>
      </div>
    </form>
  )
}
