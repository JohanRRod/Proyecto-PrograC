import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { useSucursales } from '@/features/catalog/hooks'
import { cn } from '@/lib/cn'
import { RANGOS, rangoIso } from '../rangos'
import type { FiltrosReporte as Filtros, ReporteInfo } from '../types'

export function FiltrosReporte({
  reporte,
  filtros,
  onCambiar,
  errorRango,
}: {
  reporte: ReporteInfo
  filtros: Filtros
  onCambiar: (cambios: Partial<Filtros>) => void
  errorRango: string | null
}) {
  const sucursales = useSucursales()

  if (!reporte.filtraFechas && !reporte.filtraSucursal) return null

  const hayFiltros = Boolean(filtros.desde || filtros.hasta || filtros.sucursalId)
  const rangoActivo = RANGOS.find((r) => {
    const [desde, hasta] = rangoIso(r)
    return desde === filtros.desde && hasta === filtros.hasta
  })?.id

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr]">
        {reporte.filtraFechas && (
          <>
            <Field
              label="Desde"
              type="date"
              value={filtros.desde}
              max={filtros.hasta || undefined}
              onChange={(e) => onCambiar({ desde: e.target.value })}
              error={errorRango ?? undefined}
            />
            <Field
              label="Hasta"
              type="date"
              value={filtros.hasta}
              min={filtros.desde || undefined}
              onChange={(e) => onCambiar({ hasta: e.target.value })}
            />
          </>
        )}
        {reporte.filtraSucursal && (
          <SelectField
            label="Sede"
            value={filtros.sucursalId}
            onChange={(e) => onCambiar({ sucursalId: e.target.value })}
            disabled={sucursales.isPending}
            className={cn(reporte.filtraFechas && 'sm:col-span-2 xl:col-span-1')}
          >
            <option value="">Todas las sedes</option>
            {sucursales.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </SelectField>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {reporte.filtraFechas &&
          RANGOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                const [desde, hasta] = rangoIso(r)
                onCambiar({ desde, hasta })
              }}
              aria-pressed={rangoActivo === r.id}
              className={cn(
                'h-8 rounded-full border px-3 text-sm transition-colors',
                rangoActivo === r.id
                  ? 'border-ink bg-ink text-white'
                  : 'border-line-strong text-ink-soft hover:bg-chalk',
              )}
            >
              {r.etiqueta}
            </button>
          ))}
        {hayFiltros && (
          <Button
            variante="fantasma"
            tamano="sm"
            icono={<X className="size-4" />}
            onClick={() => onCambiar({ desde: '', hasta: '', sucursalId: '' })}
          >
            Quitar filtros
          </Button>
        )}
      </div>

      {reporte.filtraFechas && reporte.campoFecha && (
        <p className="text-sm text-steel">Las fechas filtran por: {reporte.campoFecha.toLowerCase()}.</p>
      )}
    </div>
  )
}
