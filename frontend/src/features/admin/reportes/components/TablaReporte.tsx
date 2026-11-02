import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { esNumerica, formatearCelda } from '../formato'
import type { ReporteResultado } from '../types'

const POR_PAGINA = 25

/** Tabla de vista previa con paginación local y fila de totales. */
export function TablaReporte({ resultado }: { resultado: ReporteResultado }) {
  const { columnas, filas, totales } = resultado

  // La página vuelve a 1 cuando cambian los datos (otro reporte u otros filtros).
  const [estado, setEstado] = useState({ datos: filas, pagina: 0 })
  const pagina = estado.datos === filas ? estado.pagina : 0
  const irA = (n: number) => setEstado({ datos: filas, pagina: n })

  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA))
  const visibles = filas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)
  const hayTotales = Object.keys(totales).length > 0

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-chalk text-left">
              {columnas.map((c) => (
                <th
                  key={c.clave}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-3 py-2.5 font-semibold text-ink-soft first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5',
                    esNumerica(c.tipo) && 'text-right',
                  )}
                >
                  {c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((fila, i) => (
              <tr key={pagina * POR_PAGINA + i} className="border-b border-line last:border-b-0 hover:bg-chalk/60">
                {columnas.map((c) => (
                  <td
                    key={c.clave}
                    className={cn(
                      'px-3 py-2 align-top first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5',
                      esNumerica(c.tipo) ? 'whitespace-nowrap text-right tabular-nums' : 'min-w-[7rem] max-w-[22rem]',
                      (c.tipo === 'fecha' || c.tipo === 'fechaHora' || c.tipo === 'hora' || c.tipo === 'mes') && 'whitespace-nowrap',
                    )}
                  >
                    {formatearCelda(fila[c.clave], c.tipo)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {hayTotales && (
            <tfoot>
              <tr className="border-t-2 border-line-strong bg-chalk font-semibold">
                {columnas.map((c, i) => (
                  <td
                    key={c.clave}
                    className={cn(
                      'whitespace-nowrap px-3 py-2.5 first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5',
                      esNumerica(c.tipo) && 'text-right tabular-nums',
                    )}
                  >
                    {i === 0 ? 'Total' : c.clave in totales ? formatearCelda(totales[c.clave], c.tipo) : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {paginas > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-steel sm:px-5">
          <span>
            Mostrando {pagina * POR_PAGINA + 1}–{Math.min((pagina + 1) * POR_PAGINA, filas.length)} de {filas.length}
            {hayTotales && ' · los totales incluyen todos los registros'}
          </span>
          <div className="flex gap-2">
            <Button
              variante="secundario"
              tamano="sm"
              onClick={() => irA(pagina - 1)}
              disabled={pagina === 0}
              icono={<ChevronLeft className="size-4" />}
            >
              Anterior
            </Button>
            <Button variante="secundario" tamano="sm" onClick={() => irA(pagina + 1)} disabled={pagina >= paginas - 1}>
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
