package com.fitpass.reportes.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/** Resultado listo para mostrar en pantalla o exportar a Excel/PDF. */
public record ReporteResultado(
        ReporteInfo reporte,
        FiltrosAplicados filtros,
        List<ColumnaReporte> columnas,
        List<Map<String, Object>> filas,
        Map<String, Object> totales,
        OffsetDateTime generadoEn) {

    public record FiltrosAplicados(
            LocalDate desde,
            LocalDate hasta,
            Integer sucursalId,
            String sucursal) {
    }
}
