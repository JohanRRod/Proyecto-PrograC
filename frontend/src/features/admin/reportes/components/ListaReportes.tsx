import { SelectField } from '@/components/ui/SelectField'
import { cn } from '@/lib/cn'
import type { ReporteInfo } from '../types'

function agrupar(reportes: ReporteInfo[]) {
  const grupos = new Map<string, ReporteInfo[]>()
  for (const r of reportes) grupos.set(r.categoria, [...(grupos.get(r.categoria) ?? []), r])
  return [...grupos.entries()]
}

/** Lista de reportes agrupada por categoría. En el teléfono se muestra como un selector. */
export function ListaReportes({
  reportes,
  activo,
  onElegir,
}: {
  reportes: ReporteInfo[]
  activo: string
  onElegir: (codigo: string) => void
}) {
  const grupos = agrupar(reportes)

  return (
    <>
      <SelectField
        label="Reporte"
        className="lg:hidden"
        value={activo}
        onChange={(e) => onElegir(e.target.value)}
      >
        {grupos.map(([categoria, items]) => (
          <optgroup key={categoria} label={categoria}>
            {items.map((r) => (
              <option key={r.codigo} value={r.codigo}>
                {r.titulo}
              </option>
            ))}
          </optgroup>
        ))}
      </SelectField>

      <nav aria-label="Reportes" className="hidden space-y-5 lg:block">
        {grupos.map(([categoria, items]) => (
          <div key={categoria}>
            <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-steel">{categoria}</p>
            <ul className="space-y-0.5">
              {items.map((r) => (
                <li key={r.codigo}>
                  <button
                    type="button"
                    onClick={() => onElegir(r.codigo)}
                    aria-current={r.codigo === activo ? 'page' : undefined}
                    className={cn(
                      'w-full rounded-control px-3 py-2 text-left text-[0.95rem] transition-colors',
                      r.codigo === activo
                        ? 'bg-ink text-white'
                        : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
                    )}
                  >
                    {r.titulo}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  )
}
