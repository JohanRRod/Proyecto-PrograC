package com.fitpass.reportes.dto;

/**
 * Columna de un reporte.
 * tipo: texto, numero, moneda, porcentaje, fecha, fechaHora, mes, hora o booleano.
 */
public record ColumnaReporte(String clave, String titulo, String tipo) {
}
