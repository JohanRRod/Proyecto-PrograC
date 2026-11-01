import { NavLink, Outlet } from 'react-router'
import { useAuth } from '@/features/auth/AuthContext'
import { rutaInicio } from '@/features/auth/types'
import { cn } from '@/lib/cn'
import { ButtonLink } from '@/components/ui/Button'
import { Brand } from './Brand'

const enlaces = [
  { to: '/', etiqueta: 'Sedes', end: true },
  { to: '/planes', etiqueta: 'Planes', end: false },
]

export function PublicLayout() {
  const { estado, perfil } = useAuth()
  const conSesion = estado === 'listo' && perfil

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-[1000] border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Brand />
          <nav aria-label="Principal" className="ml-2 flex items-center gap-1 sm:ml-6">
            {enlaces.map((e) => (
              <NavLink
                key={e.to}
                to={e.to}
                end={e.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-control px-3 py-2 text-[0.95rem] font-medium transition-colors',
                    isActive ? 'text-plate-blue' : 'text-steel hover:text-ink',
                  )
                }
              >
                {e.etiqueta}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto">
            {conSesion ? (
              <ButtonLink to={rutaInicio(perfil.rol)} variante="secundario" tamano="sm">
                {perfil.rol === 'ADMIN' ? 'Panel' : 'Mi pase'}
              </ButtonLink>
            ) : (
              <ButtonLink to="/ingresar" tamano="sm">
                Ingresar
              </ButtonLink>
            )}
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
