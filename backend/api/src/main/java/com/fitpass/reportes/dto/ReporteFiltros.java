package com.fitpass.reportes.dto;

import java.time.LocalDate;

/** Filtros opcionales que el administrador aplica a un reporte. */
public record ReporteFiltros(LocalDate desde, LocalDate hasta, Integer sucursalId) {

    public static ReporteFiltros ninguno() {
        return new ReporteFiltros(null, null, null);
    }

    public boolean rangoInvalido() {
        return desde != null && hasta != null && desde.isAfter(hasta);
    }
}
