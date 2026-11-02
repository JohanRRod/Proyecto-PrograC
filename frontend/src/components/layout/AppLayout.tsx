import { useEffect, useState, type ComponentType } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { LogOut, MapPin, Menu } from 'lucide-react'
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

      <PestanasMovil items={itemsMovil} area={area} />
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

/** En el teléfono caben 5 pestañas; si hay más, la última es "Más" y abre el resto. */
const MAX_PESTANAS = 5

function estaActivo(item: ItemNav, ruta: string) {
  return item.end ? ruta === item.to : ruta === item.to || ruta.startsWith(`${item.to}/`)
}

function PestanasMovil({ items, area }: { items: ItemNav[]; area: string }) {
  const { pathname } = useLocation()
  const [abierto, setAbierto] = useState(false)

  const sobran = items.length > MAX_PESTANAS
  const visibles = sobran ? items.slice(0, MAX_PESTANAS - 1) : items
  const ocultos = sobran ? items.slice(MAX_PESTANAS - 1) : []
  const masActivo = ocultos.some((i) => estaActivo(i, pathname))
  const columnas = visibles.length + (sobran ? 1 : 0)

  useEffect(() => {
    if (!abierto) return
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [abierto])

  const clasePestana = (activa: boolean) =>
    cn(
      'flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium',
      activa ? 'text-plate-blue' : 'text-steel',
    )

  return (
    <>
      {abierto && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 z-[999] bg-ink/30 lg:hidden"
            onClick={() => setAbierto(false)}
          />
          <div
            id="menu-mas"
            className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[1001] rounded-panel border border-line bg-surface p-2 shadow-[0_12px_40px_rgb(23_32_38/0.18)] lg:hidden"
          >
            {ocultos.map(({ to, etiqueta, icono: Icono, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setAbierto(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-control px-3 py-3 font-medium',
                    isActive ? 'bg-plate-blue-soft text-plate-blue' : 'text-ink-soft hover:bg-chalk',
                  )
                }
              >
                <Icono className="size-5" aria-hidden="true" />
                {to === '/' ? 'Mapa de sedes' : etiqueta}
              </NavLink>
            ))}
          </div>
        </>
      )}

      <nav
        aria-label={area}
        className="fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
          {visibles.map(({ to, etiqueta, icono: Icono, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} onClick={() => setAbierto(false)} className={({ isActive }) => clasePestana(isActive)}>
                <Icono className="size-5" aria-hidden="true" />
                {etiqueta}
              </NavLink>
            </li>
          ))}
          {sobran && (
            <li>
              <button
                type="button"
                aria-expanded={abierto}
                aria-controls="menu-mas"
                onClick={() => setAbierto((v) => !v)}
                className={clasePestana(abierto || masActivo)}
              >
                <Menu className="size-5" aria-hidden="true" />
                Más
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  )
}
