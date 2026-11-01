import { ButtonLink } from '@/components/ui/Button'
import { PantallaCentrada } from '@/components/layout/PantallaCentrada'

export function NotFoundPage() {
  return (
    <PantallaCentrada>
      <h1 className="text-3xl">Esta página no existe</h1>
      <p className="mt-2 text-steel">Puede que el enlace esté mal escrito o que la página se haya movido.</p>
      <ButtonLink to="/" variante="secundario" className="mt-6">
        Ir al mapa de sedes
      </ButtonLink>
    </PantallaCentrada>
  )
}
