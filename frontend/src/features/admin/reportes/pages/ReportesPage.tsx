import { useSearchParams } from 'react-router'
import { FileSpreadsheet, FileText, Table2 } from 'lucide-react'
import { Aviso } from '@/components/ui/Aviso'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { PageHeader } from '@/components/layout/PageHeader'
import { ApiError } from '@/lib/http'
import { formatoFechaHora } from '@/lib/format'
import { cn } from '@/lib/cn'
import { FiltrosReporte } from '../components/FiltrosReporte'
import { ListaReportes } from '../components/ListaReportes'
import { TablaReporte } from '../components/TablaReporte'
import { formatearCelda } from '../formato'
import { useDescargarReporte, useReporte, useReportes } from '../hooks'
import type { FiltrosReporte as Filtros, FormatoDescarga, ReporteResultado } from '../types'

/*
 * El reporte elegido y sus filtros viven en la URL (?r=&desde=&hasta=&sede=),
 * así un reporte filtrado se puede recargar o compartir con otro administrador.
 */
export function ReportesPage() {
  const reportes = useReportes()
  const descarga = useDescargarReporte()
  const [params, setParams] = useSearchParams()

  const codigo = params.get('r') ?? reportes.data?.[0]?.codigo ?? null
  const info = reportes.data?.find((r) => r.codigo === codigo) ?? null
  const filtros: Filtros = {
    desde: params.get('desde') ?? '',
    hasta: params.get('hasta') ?? '',
    sucursalId: params.get('sede') ?? '',
  }
  const errorRango =
    filtros.desde && filtros.hasta && filtros.desde > filtros.hasta
      ? 'La fecha inicial no puede ser posterior a la final.'
      : null

  const resultado = useReporte(info ? codigo : null, filtros, !errorRango)

  const actualizar = (cambios: Record<string, string>) => {
    const siguiente = new URLSearchParams(params)
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) siguiente.set(clave, valor)
      else siguiente.delete(clave)
    }
    setParams(siguiente, { replace: true })
    descarga.reset()
  }

  const cambiarFiltros = (c: Partial<Filtros>) =>
    actualizar({
      ...(c.desde !== undefined && { desde: c.desde }),
      ...(c.hasta !== undefined && { hasta: c.hasta }),
      ...(c.sucursalId !== undefined && { sede: c.sucursalId }),
    })

  const bajar = (formato: FormatoDescarga) => {
    if (codigo) descarga.mutate({ codigo, formato, filtros })
  }
  const bajando = (formato: FormatoDescarga) => descarga.isPending && descarga.variables?.formato === formato

  return (
    <>
      <PageHeader
        titulo="Reportes"
        descripcion="Consulta la información del negocio, filtra por fechas o por sede y descárgala en Excel o PDF."
      />

      {reportes.isPending ? (
        <Cargando texto="Cargando reportes…" />
      ) : reportes.isError ? (
        <Panel>
          <ErrorCarga error={reportes.error} onReintentar={() => void reportes.refetch()} />
        </Panel>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <ListaReportes
            reportes={reportes.data}
            activo={codigo ?? ''}
            onElegir={(r) => actualizar({ r })}
          />

          {info ? (
            <Panel className="min-w-0">
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <p className="text-sm text-steel">{info.categoria}</p>
                  <h2 className="text-xl">{info.titulo}</h2>
                  <p className="mt-1 text-steel">{info.descripcion}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variante="secundario"
                    tamano="sm"
                    icono={<FileSpreadsheet className="size-4" />}
                    cargando={bajando('excel')}
                    disabled={Boolean(errorRango) || descarga.isPending}
                    onClick={() => bajar('excel')}
                  >
                    Excel
                  </Button>
                  <Button
                    variante="secundario"
                    tamano="sm"
                    icono={<FileText className="size-4" />}
                    cargando={bajando('pdf')}
                    disabled={Boolean(errorRango) || descarga.isPending}
                    onClick={() => bajar('pdf')}
                  >
                    PDF
                  </Button>
                </div>
              </header>

              <div className="space-y-4 border-b border-line px-4 py-4 sm:px-5">
                <FiltrosReporte reporte={info} filtros={filtros} onCambiar={cambiarFiltros} errorRango={errorRango} />
                {descarga.isError && (
                  <Aviso tono="error" onCerrar={() => descarga.reset()}>
                    {descarga.error instanceof ApiError
                      ? descarga.error.message
                      : 'No se pudo descargar el archivo. Intenta de nuevo.'}
                  </Aviso>
                )}
              </div>

              {errorRango ? (
                <Vacio titulo="Revisa las fechas" descripcion={errorRango} />
              ) : resultado.isPending ? (
                <Cargando texto="Generando reporte…" />
              ) : resultado.isError ? (
                <ErrorCarga error={resultado.error} onReintentar={() => void resultado.refetch()} />
              ) : (
                <div className={cn('transition-opacity', resultado.isPlaceholderData && 'opacity-60')}>
                  <Resumen resultado={resultado.data} />
                  {resultado.data.filas.length === 0 ? (
                    <Vacio
                      icono={<Table2 className="size-6" />}
                      titulo="No hay datos"
                      descripcion="No hay registros con estos filtros. Prueba con otro rango de fechas u otra sede."
                    />
                  ) : (
                    <TablaReporte resultado={resultado.data} />
                  )}
                </div>
              )}
            </Panel>
          ) : (
            <Panel>
              <Vacio titulo="Reporte no encontrado" descripcion="Elige uno de la lista." />
            </Panel>
          )}
        </div>
      )}
    </>
  )
}

/** Número de registros y los totales del reporte, como indicadores. */
function Resumen({ resultado }: { resultado: ReporteResultado }) {
  const indicadores = [
    { etiqueta: 'Registros', valor: resultado.filas.length.toLocaleString('es-GT') },
    ...resultado.columnas
      .filter((c) => c.clave in resultado.totales)
      .map((c) => ({ etiqueta: c.titulo, valor: formatearCelda(resultado.totales[c.clave], c.tipo) })),
  ]

  return (
    <div className="border-b border-line px-4 py-4 sm:px-5">
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        {indicadores.map((i) => (
          <div key={i.etiqueta}>
            <dt className="text-sm text-steel">{i.etiqueta}</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{i.valor}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-steel">Generado el {formatoFechaHora(resultado.generadoEn)}</p>
    </div>
  )
}
