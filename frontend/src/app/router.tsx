import { createBrowserRouter, Navigate } from 'react-router'
import { BarChart3, CalendarDays, CreditCard, DoorOpen, LayoutDashboard, Store, Ticket, Users } from 'lucide-react'
import { AppLayout, type ItemNav } from '@/components/layout/AppLayout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { RequireRole } from '@/features/auth/RequireRole'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RouteErrorPage } from '@/pages/RouteErrorPage'

/*
 * Las páginas se cargan bajo demanda: quien solo ve los planes no descarga Leaflet,
 * y un visitante no descarga el panel del miembro ni el administrativo.
 */

const navMiembro: ItemNav[] = [
  { to: '/mi', etiqueta: 'Mi pase', icono: Ticket, end: true },
  { to: '/mi/clases', etiqueta: 'Clases', icono: CalendarDays },
  { to: '/mi/pagos', etiqueta: 'Pagos', icono: CreditCard },
]

const navAdmin: ItemNav[] = [
  { to: '/admin', etiqueta: 'Inicio', icono: LayoutDashboard, end: true },
  { to: '/admin/recepcion', etiqueta: 'Recepción', icono: DoorOpen },
  { to: '/admin/clientes', etiqueta: 'Clientes', icono: Users },
  { to: '/admin/clases', etiqueta: 'Clases', icono: CalendarDays },
  { to: '/admin/catalogo', etiqueta: 'Catálogo', icono: Store },
  { to: '/admin/reportes', etiqueta: 'Reportes', icono: BarChart3 },
]


const sedes = async () => ({ Component: (await import('@/features/catalog/pages/SedesPage')).SedesPage })

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { index: true, lazy: sedes },
          { path: 'sedes/:id', lazy: sedes },
          {
            path: 'planes',
            lazy: async () => ({ Component: (await import('@/features/catalog/pages/PlanesPage')).PlanesPage }),
          },
        ],
      },
      {
        path: 'ingresar',
        lazy: async () => ({ Component: (await import('@/features/auth/pages/LoginPage')).LoginPage }),
      },
      {
        path: 'auth/callback',
        lazy: async () => ({ Component: (await import('@/features/auth/pages/AuthCallbackPage')).AuthCallbackPage }),
      },
      {
        path: 'mi',
        element: <RequireRole rol="MIEMBRO" />,
        children: [
          {
            element: <AppLayout items={navMiembro} area="Mi cuenta" />,
            children: [
              {
                index: true,
                lazy: async () => ({ Component: (await import('@/features/member/pages/MemberHomePage')).MemberHomePage }),
              },
              {
                path: 'clases',
                lazy: async () => ({ Component: (await import('@/features/member/pages/ClasesPage')).ClasesPage }),
              },
              {
                path: 'pagos',
                lazy: async () => ({ Component: (await import('@/features/member/pages/PagosPage')).PagosPage }),
              },
            ],
          },
        ],
      },
      {
        path: 'admin',
        element: <RequireRole rol="ADMIN" />,
        children: [
          {
            element: <AppLayout items={navAdmin} area="Administración" />,
            children: [
              {
                index: true,
                lazy: async () => ({ Component: (await import('@/features/admin/pages/AdminHomePage')).AdminHomePage }),
              },
              {
                path: 'recepcion',
                lazy: async () => ({ Component: (await import('@/features/admin/accesos/pages/RecepcionPage')).RecepcionPage }),
              },
              {
                path: 'clases',
                lazy: async () => ({ Component: (await import('@/features/admin/clases/pages/ClasesAdminPage')).ClasesAdminPage }),
              },
              {
                path: 'clases/instructores',
                lazy: async () => ({ Component: (await import('@/features/admin/clases/pages/InstructoresPage')).InstructoresPage }),
              },
              {
                path: 'clases/:id',
                lazy: async () => ({ Component: (await import('@/features/admin/clases/pages/ClaseDetallePage')).ClaseDetallePage }),
              },
              {
                path: 'catalogo',
                children: [
                  {
                    lazy: async () => ({ Component: (await import('@/features/admin/catalogo/components/CatalogoLayout')).CatalogoLayout }),
                    children: [
                      { index: true, element: <Navigate to="sedes" replace /> },
                      {
                        path: 'sedes',
                        lazy: async () => ({ Component: (await import('@/features/admin/catalogo/pages/SedesAdminPage')).SedesAdminPage }),
                      },
                      {
                        path: 'planes',
                        lazy: async () => ({ Component: (await import('@/features/admin/catalogo/pages/PlanesAdminPage')).PlanesAdminPage }),
                      },
                      {
                        path: 'amenidades',
                        lazy: async () => ({ Component: (await import('@/features/admin/catalogo/pages/AmenidadesAdminPage')).AmenidadesAdminPage }),
                      },
                    ],
                  },
                  {
                    path: 'sedes/nueva',
                    lazy: async () => ({ Component: (await import('@/features/admin/catalogo/pages/SedeNuevaPage')).SedeNuevaPage }),
                  },
                  {
                    path: 'sedes/:id',
                    lazy: async () => ({ Component: (await import('@/features/admin/catalogo/pages/SedeDetallePage')).SedeDetallePage }),
                  },
                ],
              },
              {
                path: 'reportes',
                lazy: async () => ({ Component: (await import('@/features/admin/reportes/pages/ReportesPage')).ReportesPage }),
              },
              {
                path: 'clientes',
                lazy: async () => ({ Component: (await import('@/features/admin/clientes/pages/ClientesPage')).ClientesPage }),
              },
              {
                path: 'clientes/nuevo',
                lazy: async () => ({
                  Component: (await import('@/features/admin/clientes/pages/ClienteNuevoPage')).ClienteNuevoPage,
                }),
              },
              {
                path: 'clientes/:id',
                lazy: async () => ({
                  Component: (await import('@/features/admin/clientes/pages/ClienteDetallePage')).ClienteDetallePage,
                }),
              },
              {
                path: 'clientes/:id/editar',
                lazy: async () => ({
                  Component: (await import('@/features/admin/clientes/pages/ClienteEditarPage')).ClienteEditarPage,
                }),
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
