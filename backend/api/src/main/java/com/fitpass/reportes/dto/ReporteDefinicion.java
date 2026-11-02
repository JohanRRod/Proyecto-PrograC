package com.fitpass.reportes.dto;

import java.util.List;

/**
 * Describe un reporte del catálogo: cómo se llama, qué filtros acepta,
 * qué columnas se suman en la fila de totales y la consulta que lo genera.
 * La consulta usa los parámetros :desde, :hasta y :sucursalId (pueden ser nulos).
 */
public record ReporteDefinicion(
        String codigo,
        String titulo,
        String descripcion,
        String categoria,
        String campoFecha,
        boolean filtraSucursal,
        List<String> columnasTotal,
        String sql) {

    public boolean filtraFechas() {
        return campoFecha != null;
    }

    public ReporteInfo info() {
        return new ReporteInfo(codigo, titulo, descripcion, categoria,
                filtraFechas(), campoFecha, filtraSucursal);
    }
}
