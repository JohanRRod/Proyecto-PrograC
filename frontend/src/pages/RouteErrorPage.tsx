import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Button } from '@/components/ui/Button'
import { PantallaCentrada } from '@/components/layout/PantallaCentrada'
import { NotFoundPage } from './NotFoundPage'

/** Último recurso si un componente falla al renderizar: evita la pantalla en blanco. */
export function RouteErrorPage() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  if (import.meta.env.DEV) console.error(error)

  return (
    <PantallaCentrada>
      <h1 className="text-3xl">Algo falló al mostrar esta página</h1>
      <p className="mt-2 text-steel">Recarga la página. Si el problema continúa, avísanos en recepción.</p>
      <Button variante="secundario" className="mt-6" onClick={() => window.location.reload()}>
        Recargar
      </Button>
    </PantallaCentrada>
  )
}
