import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Cargando } from '@/components/ui/StateMessage'
import { PantallaCentrada } from '@/components/layout/PantallaCentrada'
import { enlaceInicial, supabase } from '@/lib/supabase'
import { useAuth } from '../AuthContext'
import { mensajeAuth } from '../errores'
import { rutaInicio } from '../types'

const esquema = z
  .object({
    contrasena: z.string().min(8, 'Usa al menos 8 caracteres.'),
    confirmacion: z.string(),
  })
  .refine((d) => d.contrasena === d.confirmacion, {
    path: ['confirmacion'],
    message: 'Las contraseñas no coinciden.',
  })

type Datos = z.infer<typeof esquema>

/**
 * Destino de los correos de Supabase (invitación de miembro y recuperación de contraseña).
 * Supabase ya creó la sesión con el token del enlace; aquí el usuario define su contraseña.
 */
export function AuthCallbackPage() {
  const { estado, sesion, perfil } = useAuth()

  if (enlaceInicial.error) {
    return (
      <PantallaCentrada>
        <h1 className="text-3xl">Este enlace ya no funciona</h1>
        <p className="mt-2 text-steel">
          {mensajeAuth(enlaceInicial.error)} Si eres miembro nuevo, pide a recepción que te reenvíe la invitación. Si ya
          tenías cuenta, recupera tu contraseña desde la pantalla de ingreso.
        </p>
        <ButtonLink to="/ingresar" variante="secundario" className="mt-6">
          Ir a ingresar
        </ButtonLink>
      </PantallaCentrada>
    )
  }

  if (estado === 'cargando' && !sesion) {
    return (
      <PantallaCentrada>
        <Cargando texto="Validando el enlace…" />
      </PantallaCentrada>
    )
  }

  if (!sesion) return <Navigate to="/ingresar" replace />

  const debeCrearContrasena = enlaceInicial.tipo === 'invite' || enlaceInicial.tipo === 'recovery'
  if (!debeCrearContrasena) return <Navigate to={rutaInicio(perfil?.rol)} replace />

  return (
    <PantallaCentrada>
      <FormularioContrasena esInvitacion={enlaceInicial.tipo === 'invite'} />
    </PantallaCentrada>
  )
}

function FormularioContrasena({ esInvitacion }: { esInvitacion: boolean }) {
  const navigate = useNavigate()
  const { correo, perfil } = useAuth()
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Datos>({ resolver: zodResolver(esquema) })

  const enviar = handleSubmit(async ({ contrasena }) => {
    setErrorServidor(null)
    const { error } = (await supabase?.auth.updateUser({ password: contrasena })) ?? {}
    if (error) {
      setErrorServidor(mensajeAuth(error))
      return
    }
    navigate(rutaInicio(perfil?.rol), { replace: true })
  })

  return (
    <>
      <h1 className="text-3xl">{esInvitacion ? 'Bienvenido a FlexPass' : 'Crea una contraseña nueva'}</h1>
      <p className="mt-1.5 text-steel">
        {esInvitacion ? 'Crea una contraseña para ' : 'Será la contraseña de '}
        <span className="font-medium text-ink">{correo}</span>.
      </p>

      <form onSubmit={enviar} noValidate className="mt-7 space-y-4">
        <Field
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          ayuda="Al menos 8 caracteres."
          error={errors.contrasena?.message}
          {...register('contrasena')}
        />
        <Field
          label="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.confirmacion?.message}
          {...register('confirmacion')}
        />
        {errorServidor && (
          <p role="alert" className="text-sm text-plate-red">
            {errorServidor}
          </p>
        )}
        <Button type="submit" className="w-full" cargando={isSubmitting}>
          Guardar contraseña
        </Button>
      </form>
    </>
  )
}
