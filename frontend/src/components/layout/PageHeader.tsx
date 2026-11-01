import type { ReactNode } from 'react'

export function PageHeader({ titulo, descripcion, accion }: { titulo: string; descripcion?: string; accion?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 lg:mb-8">
      <div>
        <h1 className="text-[1.75rem] sm:text-3xl">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-2xl text-steel">{descripcion}</p>}
      </div>
      {accion}
    </div>
  )
}
