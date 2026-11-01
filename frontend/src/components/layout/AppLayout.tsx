import type { ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router'
import { LogOut, MapPin } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/cn'
import { Brand } from './Brand'

export interface ItemNav {
  to: string
  etiqueta: string
  icono: ComponentType<{ className?: string }>
  end?: boolean
}

/**
 * Shell del área privada.
 * Escritorio: barra lateral fija. Teléfono: encabezado compacto y pestañas abajo,
 * al alcance del pulgar.
 */
export function AppLayout({ items, area }: { items: ItemNav[]; area: string }) {
  const { correo, cerrarSesion } = useAuth()
  const itemsMovil: ItemNav[] = [...items, { to: '/', etiqueta: 'Sedes', icono: MapPin, end: true }]

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      {/* Barra lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface lg:flex">
        <div className="px-5 py-5">
          <Brand to={items[0]?.to} />
          <p className="mt-1 pl-[2.375rem] text-sm text-steel">{area}</p>
        </div>
        <nav aria-label={area} className="flex flex-1 flex-col gap-0.5 px-3">
          {items.map((item) => (
            <EnlaceLateral key={item.to} item={item} />
          ))}
          <div className="my-3 border-t border-line" />
          <EnlaceLateral item={{ to: '/', etiqueta: 'Mapa de sedes', icono: MapPin, end: true }} />
        </nav>
        <div className="border-t border-line px-5 py-4">
          <p className="truncate text-sm text-steel" title={correo ?? undefined}>
            {correo}
          </p>
          <button
            type="button"
            onClick={() => void cerrarSesion()}
            className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-plate-red"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Encabezado (teléfono) */}
      <header className="sticky top-0 z-[1000] flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <Brand to={items[0]?.to} />
        <button
          type="button"
          onClick={() => void cerrarSesion()}
          aria-label="Cerrar sesión"
          className="grid size-10 place-items-center rounded-control text-ink-soft hover:bg-chalk"
        >
          <LogOut className="size-5" aria-hidden="true" />
        </button>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
        <Outlet />
      </main>

      {/* Pestañas (teléfono) */}
      <nav
        aria-label={area}
        className="fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${itemsMovil.length}, minmax(0, 1fr))` }}>
          {itemsMovil.map(({ to, etiqueta, icono: Icono, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium',
                    isActive ? 'text-plate-blue' : 'text-steel',
                  )
                }
              >
                <Icono className="size-5" aria-hidden="true" />
                {etiqueta}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function EnlaceLateral({ item: { to, etiqueta, icono: Icono, end } }: { item: ItemNav }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-control px-3 py-2.5 text-[0.95rem] font-medium transition-colors',
          isActive ? 'bg-plate-blue-soft text-plate-blue' : 'text-ink-soft hover:bg-chalk',
        )
      }
    >
      <Icono className="size-[1.15rem]" aria-hidden="true" />
      {etiqueta}
    </NavLink>
  )
}
