import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  pagina: number
  tamano: number
  total: number
  cargando?: boolean
  onCambiar: (pagina: number) => void
}

export function Paginador({ pagina, tamano, total, cargando, onCambiar }: Props) {
  if (total === 0) return null
  const desde = pagina * tamano + 1
  const hasta = Math.min(total, (pagina + 1) * tamano)
  const ultima = Math.max(0, Math.ceil(total / tamano) - 1)

  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm sm:px-5">
      <p className="text-steel tabular-nums">
        {desde.toLocaleString('es-GT')}–{hasta.toLocaleString('es-GT')} de {total.toLocaleString('es-GT')}
      </p>
      <div className="flex gap-2">
        <Button
          variante="secundario"
          tamano="sm"
          icono={<ChevronLeft className="size-4" aria-hidden="true" />}
          disabled={pagina === 0 || cargando}
          onClick={() => onCambiar(pagina - 1)}
        >
          Anterior
        </Button>
        <Button variante="secundario" tamano="sm" disabled={pagina >= ultima || cargando} onClick={() => onCambiar(pagina + 1)}>
          Siguiente
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
