/** Reporte disponible (GET /api/reportes). */
export interface ReporteInfo {
  codigo: string
  titulo: string
  descripcion: string
  categoria: string
  filtraFechas: boolean
  /** Qué fecha se filtra, por ejemplo "Fecha de registro". */
  campoFecha: string | null
  filtraSucursal: boolean
}

export type TipoColumna =
  | 'texto'
  | 'numero'
  | 'moneda'
  | 'porcentaje'
  | 'fecha'
  | 'fechaHora'
  | 'mes'
  | 'hora'
  | 'booleano'

export interface ColumnaReporte {
  clave: string
  titulo: string
  tipo: TipoColumna
}

export type ValorCelda = string | number | boolean | null

/** Resultado de GET /api/reportes/{codigo}. */
export interface ReporteResultado {
  reporte: ReporteInfo
  filtros: {
    desde: string | null
    hasta: string | null
    sucursalId: number | null
    sucursal: string | null
  }
  columnas: ColumnaReporte[]
  filas: Record<string, ValorCelda>[]
  /** Suma de las columnas que tienen total (solo algunas). */
  totales: Record<string, number>
  generadoEn: string
}

/** Filtros tal como están en la URL; cadena vacía = sin filtro. */
export interface FiltrosReporte {
  desde: string
  hasta: string
  sucursalId: string
}

export type FormatoDescarga = 'excel' | 'pdf'
