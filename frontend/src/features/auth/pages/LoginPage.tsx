import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Cargando } from '@/components/ui/StateMessage'
import { PantallaCentrada } from '@/components/layout/PantallaCentrada'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../AuthContext'
import { mensajeAuth } from '../errores'
import { rutaInicio } from '../types'

const esquemaIngreso = z.object({
  correo: z.email('Escribe un correo válido.'),
  contrasena: z.string().min(1, 'Escribe tu contraseña.'),
})

const esquemaRecuperar = z.object({
  correo: z.email('Escribe un correo válido.'),
})

type Ingreso = z.infer<typeof esquemaIngreso>
type Recuperar = z.infer<typeof esquemaRecuperar>

export function LoginPage() {
  const { estado, perfil } = useAuth()
  const location = useLocation()
  const [modo, setModo] = useState<'ingresar' | 'recuperar'>('ingresar')
  const desde = (location.state as { desde?: string } | null)?.desde

  if (estado === 'listo' && perfil) {
    const destino = desde && desde.startsWith(rutaInicio(perfil.rol)) ? desde : rutaInicio(perfil.rol)
    return <Navigate to={destino} replace />
  }

  return (
    <PantallaCentrada>
      {estado === 'cargando' ? (
        <Cargando texto="Verificando tu sesión…" />
      ) : modo === 'ingresar' ? (
        <FormularioIngreso onRecuperar={() => setModo('recuperar')} />
      ) : (
        <FormularioRecuperar onVolver={() => setModo('ingresar')} />
      )}
    </PantallaCentrada>
  )
}

function AvisoConfiguracion() {
  if (supabase) return null
  return (
    <p role="alert" className="mb-5 rounded-control border border-plate-yellow/50 bg-plate-yellow-soft px-3 py-2 text-sm">
      Falta configurar Supabase en <code>.env.local</code> (<code>VITE_SUPABASE_URL</code> y{' '}
      <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>).
    </p>
  )
}

function FormularioIngreso({ onRecuperar }: { onRecuperar: () => void }) {
  const { iniciarSesion } = useAuth()
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Ingreso>({ resolver: zodResolver(esquemaIngreso) })

  const enviar = handleSubmit(async ({ correo, contrasena }) => {
    setErrorServidor(null)
    try {
      await iniciarSesion(correo.trim(), contrasena)
    } catch (e) {
      setErrorServidor(mensajeAuth(e))
    }
  })

  return (
    <>
      <h1 className="text-3xl">Ingresa a tu cuenta</h1>
      <p className="mt-1.5 text-steel">Con el correo con el que te registraste en recepción.</p>

      <form onSubmit={enviar} noValidate className="mt-7 space-y-4">
        <AvisoConfiguracion />
        <Field label="Correo" type="email" autoComplete="email" inputMode="email" error={errors.correo?.message} {...register('correo')} />
        <Field
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          error={errors.contrasena?.message}
          {...register('contrasena')}
        />

        {errorServidor && (
          <p role="alert" className="text-sm text-plate-red">
            {errorServidor}
          </p>
        )}

        <Button type="submit" className="w-full" cargando={isSubmitting}>
          Ingresar
        </Button>
      </form>

      <button type="button" onClick={onRecuperar} className="mt-5 text-sm font-medium text-plate-blue hover:underline">
        Olvidé mi contraseña
      </button>
    </>
  )
}

function FormularioRecuperar({ onVolver }: { onVolver: () => void }) {
  const [enviadoA, setEnviadoA] = useState<string | null>(null)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Recuperar>({ resolver: zodResolver(esquemaRecuperar) })

  const enviar = handleSubmit(async ({ correo }) => {
    setErrorServidor(null)
    if (!supabase) {
      setErrorServidor('La autenticación no está configurada en este entorno.')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(correo.trim(), {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    if (error) setErrorServidor(mensajeAuth(error))
    else setEnviadoA(correo.trim())
  })

  if (enviadoA) {
    return (
      <>
        <h1 className="text-3xl">Revisa tu correo</h1>
        <p className="mt-2 text-steel">
          Si <span className="font-medium text-ink">{enviadoA}</span> tiene una cuenta, te llegará un enlace para crear
          una contraseña nueva. Puede tardar un par de minutos.
        </p>
        <Button variante="secundario" className="mt-6" onClick={onVolver}>
          Volver a ingresar
        </Button>
      </>
    )
  }

  return (
    <>
      <h1 className="text-3xl">Recupera tu contraseña</h1>
      <p className="mt-1.5 text-steel">Te enviaremos un enlace para crear una nueva.</p>

      <form onSubmit={enviar} noValidate className="mt-7 space-y-4">
        <AvisoConfiguracion />
        <Field label="Correo" type="email" autoComplete="email" inputMode="email" error={errors.correo?.message} {...register('correo')} />
        {errorServidor && (
          <p role="alert" className="text-sm text-plate-red">
            {errorServidor}
          </p>
        )}
        <Button type="submit" className="w-full" cargando={isSubmitting}>
          Enviar enlace
        </Button>
      </form>

      <button type="button" onClick={onVolver} className="mt-5 text-sm font-medium text-plate-blue hover:underline">
        Volver a ingresar
      </button>
    </>
  )
}
