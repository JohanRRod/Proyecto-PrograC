import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'

export function VolverCatalogo({ to, texto }: { to: string; texto: string }) {
  return (
    <Link to={to} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-plate-blue hover:underline">
      <ArrowLeft className="size-4" aria-hidden="true" />
      {texto}
    </Link>
  )
}
