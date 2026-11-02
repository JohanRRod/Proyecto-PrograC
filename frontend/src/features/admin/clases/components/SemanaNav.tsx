import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fechaDiaMes, hoyGT, lunesDe, sumarDias } from '@/features/clases/fechas'

/** Flechas para moverse de semana en semana, con un botón para volver a la actual. */
export function SemanaNav({ lunes, onCambiar }: { lunes: string; onCambiar: (lunes: string) => void }) {
  const actual = lunesDe(hoyGT())
  const domingo = sumarDias(lunes, 6)
  const anio = domingo.slice(0, 4)

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onCambiar(sumarDias(lunes, -7))}
        aria-label="Semana anterior"
        className="grid size-9 place-items-center rounded-full border border-line-strong bg-surface text-ink-soft hover:border-ink/40"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <p className="min-w-[9.5rem] text-center text-sm font-medium tabular-nums" aria-live="polite">
        {fechaDiaMes(lunes)} – {fechaDiaMes(domingo)} {anio}
      </p>
      <button
        type="button"
        onClick={() => onCambiar(sumarDias(lunes, 7))}
        aria-label="Semana siguiente"
        className="grid size-9 place-items-center rounded-full border border-line-strong bg-surface text-ink-soft hover:border-ink/40"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
      {lunes !== actual && (
        <button
          type="button"
          onClick={() => onCambiar(actual)}
          className="ml-1 h-9 rounded-full border border-line-strong bg-surface px-3.5 text-sm font-medium text-ink-soft hover:border-ink/40"
        >
          Esta semana
        </button>
      )}
    </div>
  )
}
