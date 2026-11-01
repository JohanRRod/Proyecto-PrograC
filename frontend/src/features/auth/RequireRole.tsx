import { Navigate, Outlet, useLocation } from 'react-router'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Cargando, ErrorCarga } from '@/components/ui/StateMessage'
import { PantallaCentrada } from '@/components/layout/PantallaCentrada'
import { useAuth } from './AuthContext'
import { rutaInicio, type Rol } from './types'

/** Protege un grupo de rutas: exige sesión y el rol indicado. */
export function RequireRole({ rol }: { rol: Rol }) {
  const { estado, perfil, errorPerfil, reintentarPerfil, cerrarSesion, correo } = useAuth()
  const location = useLocation()

  if (estado === 'cargando') {
    return (
      <PantallaCentrada>
        <Cargando texto="Verificando tu sesión…" />
      </PantallaCentrada>
    )
  }

  if (estado === 'anonimo') {
    return <Navigate to="/ingresar" replace state={{ desde: location.pathname }} />
  }

  if (estado === 'sin-perfil') {
    return (
      <PantallaCentrada>
        <h1 className="text-2xl">Tu cuenta aún no está habilitada</h1>
        <p className="mt-2 text-steel">
          Ingresaste como <span className="font-medium text-ink">{correo}</span>, pero esa cuenta no tiene un
          perfil activo en FlexPass. Pide a recepción que active tu membresía.
        </p>
        <Button variante="secundario" className="mt-6" icono={<LogOut className="size-4" />} onClick={() => void cerrarSesion()}>
          Cerrar sesión
        </Button>
      </PantallaCentrada>
    )
  }

  if (estado === 'error') {
    return (
      <PantallaCentrada>
        <ErrorCarga error={errorPerfil} onReintentar={reintentarPerfil} />
      </PantallaCentrada>
    )
  }

  if (perfil?.rol !== rol) {
    return <Navigate to={rutaInicio(perfil?.rol)} replace />
  }

  return <Outlet />
}
