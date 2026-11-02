package com.fitpass.reportes.dto;

/** Datos públicos de un reporte para mostrarlo en el panel. */
public record ReporteInfo(
        String codigo,
        String titulo,
        String descripcion,
        String categoria,
        boolean filtraFechas,
        String campoFecha,
        boolean filtraSucursal) {
}
