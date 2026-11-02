package com.fitpass.reportes.service;

import com.fitpass.reportes.dto.ReporteResultado;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Formatos compartidos por la exportación a Excel y a PDF. */
final class FormatoReporte {

    static final Locale ES_GT = Locale.forLanguageTag("es-GT");
    static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    static final DateTimeFormatter FECHA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");
    static final DateTimeFormatter MES = DateTimeFormatter.ofPattern("MMMM yyyy", ES_GT);

    private FormatoReporte() {
    }

    /** Texto con los filtros aplicados, por ejemplo "Del 01/10/2026 al 31/10/2026 · Sede: Xela Centro". */
    static String describirFiltros(ReporteResultado resultado) {
        var f = resultado.filtros();
        StringBuilder texto = new StringBuilder();
        if (f.desde() != null && f.hasta() != null) {
            texto.append("Del ").append(f.desde().format(FECHA)).append(" al ").append(f.hasta().format(FECHA));
        } else if (f.desde() != null) {
            texto.append("Desde el ").append(f.desde().format(FECHA));
        } else if (f.hasta() != null) {
            texto.append("Hasta el ").append(f.hasta().format(FECHA));
        } else if (resultado.reporte().filtraFechas()) {
            texto.append("Todas las fechas");
        }
        if (resultado.reporte().filtraSucursal()) {
            if (!texto.isEmpty()) texto.append(" · ");
            texto.append("Sede: ").append(f.sucursal() == null ? "todas" : f.sucursal());
        }
        return texto.toString();
    }

    static String generado(ReporteResultado resultado) {
        return "Generado el " + resultado.generadoEn().format(FECHA_HORA);
    }

    /** Valor como texto, para el PDF. */
    static String texto(Object valor, String tipo) {
        if (valor == null) return "—";
        return switch (tipo) {
            case "moneda" -> moneda(valor);
            case "porcentaje" -> decimal(valor, 1) + " %";
            case "booleano" -> Boolean.TRUE.equals(valor) ? "Sí" : "No";
            case "mes" -> valor instanceof LocalDate d ? capitalizar(d.format(MES)) : valor.toString();
            case "fecha" -> valor instanceof LocalDate d ? d.format(FECHA) : valor.toString();
            case "fechaHora" -> valor instanceof OffsetDateTime d ? d.format(FECHA_HORA) : valor.toString();
            case "hora" -> valor instanceof LocalTime t ? t.format(HORA) : valor.toString();
            case "numero" -> numero(valor);
            default -> valor.toString();
        };
    }

    private static String numero(Object valor) {
        if (!(valor instanceof Number n)) return valor.toString();
        NumberFormat formato = NumberFormat.getNumberInstance(ES_GT);
        formato.setMaximumFractionDigits(2);
        return formato.format(new BigDecimal(n.toString()));
    }

    static String moneda(Object valor) {
        return "Q " + decimal(valor, 2);
    }

    private static String decimal(Object valor, int decimales) {
        if (!(valor instanceof Number n)) return valor.toString();
        NumberFormat formato = NumberFormat.getNumberInstance(ES_GT);
        formato.setMinimumFractionDigits(decimales);
        formato.setMaximumFractionDigits(decimales);
        return formato.format(new BigDecimal(n.toString()).setScale(decimales, RoundingMode.HALF_UP));
    }

    static String capitalizar(String texto) {
        return texto.isEmpty() ? texto : Character.toUpperCase(texto.charAt(0)) + texto.substring(1);
    }

    static boolean esNumerico(String tipo) {
        return switch (tipo) {
            case "moneda", "porcentaje", "numero" -> true;
            default -> false;
        };
    }
}
