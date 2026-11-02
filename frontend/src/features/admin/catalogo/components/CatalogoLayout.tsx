import { NavLink, Outlet } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/cn'

const PESTANAS = [
  { to: '/admin/catalogo/sedes', etiqueta: 'Sedes' },
  { to: '/admin/catalogo/planes', etiqueta: 'Planes' },
  { to: '/admin/catalogo/amenidades', etiqueta: 'Amenidades' },
]

/** Encabezado común de Sedes, Planes y Amenidades con sus pestañas. */
export function CatalogoLayout() {
  return (
    <>
      <PageHeader
        titulo="Catálogo"
        descripcion="Lo que ven los clientes en el mapa y en la página de planes. Los cambios se reflejan al instante."
      />
      <nav aria-label="Secciones del catálogo" className="mb-6 flex gap-1 border-b border-line">
        {PESTANAS.map((p) => (
          <NavLink
            key={p.to}
            to={p.to}
            className={({ isActive }) =>
              cn(
                '-mb-px border-b-2 px-3 py-2.5 font-medium transition-colors sm:px-4',
                isActive ? 'border-plate-blue text-plate-blue' : 'border-transparent text-ink-soft hover:text-ink',
              )
            }
          >
            {p.etiqueta}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  )
}
