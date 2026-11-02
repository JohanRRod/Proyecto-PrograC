package com.fitpass.reportes.service;

import com.fitpass.reportes.dto.ColumnaReporte;
import com.fitpass.reportes.dto.ReporteResultado;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
public class ExcelService {

    public byte[] generar(ReporteResultado resultado) {
        try (XSSFWorkbook libro = new XSSFWorkbook();
             ByteArrayOutputStream salida = new ByteArrayOutputStream()) {

            Estilos estilos = new Estilos(libro);
            Sheet hoja = libro.createSheet("Reporte");
            List<ColumnaReporte> columnas = resultado.columnas();
            int ancho = Math.max(columnas.size(), 1);
            int fila = 0;

            celda(hoja.createRow(fila++), 0, "FlexPass · " + resultado.reporte().titulo(), estilos.titulo);
            celda(hoja.createRow(fila++), 0, resultado.reporte().descripcion(), estilos.nota);
            String filtros = FormatoReporte.describirFiltros(resultado);
            String detalle = (filtros.isEmpty() ? "" : filtros + " · ") + FormatoReporte.generado(resultado)
                + " · " + resultado.filas().size() + " registros";
            celda(hoja.createRow(fila++), 0, detalle, estilos.nota);
            for (int i = 0; i < 3; i++) {
                if (ancho > 1) hoja.addMergedRegion(new CellRangeAddress(i, i, 0, ancho - 1));
            }
            fila++;

            if (columnas.isEmpty()) {
                celda(hoja.createRow(fila), 0, "No hay datos para los filtros elegidos.", estilos.nota);
            } else {
                int encabezado = fila;
                Row filaEncabezado = hoja.createRow(fila++);
                for (int i = 0; i < columnas.size(); i++) {
                    celda(filaEncabezado, i, columnas.get(i).titulo(), estilos.encabezado);
                }

                for (Map<String, Object> registro : resultado.filas()) {
                    Row r = hoja.createRow(fila++);
                    for (int i = 0; i < columnas.size(); i++) {
                        ColumnaReporte c = columnas.get(i);
                        escribir(r.createCell(i), registro.get(c.clave()), c.tipo(), estilos, false);
                    }
                }

                if (!resultado.totales().isEmpty()) {
                    Row r = hoja.createRow(fila);
                    for (int i = 0; i < columnas.size(); i++) {
                        ColumnaReporte c = columnas.get(i);
                        Cell cell = r.createCell(i);
                        if (i == 0) {
                            cell.setCellValue("Total");
                            cell.setCellStyle(estilos.total);
                        } else if (resultado.totales().containsKey(c.clave())) {
                            escribir(cell, resultado.totales().get(c.clave()), c.tipo(), estilos, true);
                        } else {
                            cell.setCellStyle(estilos.total);
                        }
                    }
                }

                hoja.setAutoFilter(new CellRangeAddress(encabezado, encabezado + resultado.filas().size(),
                    0, columnas.size() - 1));
                hoja.createFreezePane(0, encabezado + 1);
                for (int i = 0; i < columnas.size(); i++) {
                    hoja.setColumnWidth(i, anchoColumna(columnas.get(i), resultado.filas()));
                }
            }

            libro.write(salida);
            return salida.toByteArray();

        } catch (Exception e) {
            throw new IllegalStateException("Error al generar Excel", e);
        }
    }

    private static void celda(Row fila, int columna, String valor, CellStyle estilo) {
        Cell cell = fila.createCell(columna);
        cell.setCellValue(valor);
        cell.setCellStyle(estilo);
    }

    private static void escribir(Cell cell, Object valor, String tipo, Estilos estilos, boolean total) {
        if (valor == null) {
            cell.setBlank();
            if (total) cell.setCellStyle(estilos.total);
            return;
        }
        switch (tipo) {
            case "moneda" -> {
                cell.setCellValue(((Number) valor).doubleValue());
                cell.setCellStyle(total ? estilos.monedaTotal : estilos.moneda);
            }
            case "porcentaje" -> {
                cell.setCellValue(((Number) valor).doubleValue());
                cell.setCellStyle(estilos.porcentaje);
            }
            case "numero" -> {
                double numero = ((Number) valor).doubleValue();
                boolean entero = numero == Math.rint(numero);
                cell.setCellValue(numero);
                cell.setCellStyle(total
                    ? (entero ? estilos.numeroTotal : estilos.decimalTotal)
                    : (entero ? estilos.numero : estilos.decimal));
            }
            case "fecha" -> {
                cell.setCellValue((LocalDate) valor);
                cell.setCellStyle(estilos.fecha);
            }
            case "mes" -> cell.setCellValue(FormatoReporte.texto(valor, tipo));
            case "fechaHora" -> {
                cell.setCellValue(((OffsetDateTime) valor).toLocalDateTime());
                cell.setCellStyle(estilos.fechaHora);
            }
            case "hora" -> cell.setCellValue(((LocalTime) valor).format(FormatoReporte.HORA));
            case "booleano" -> cell.setCellValue(Boolean.TRUE.equals(valor) ? "Sí" : "No");
            default -> cell.setCellValue(valor.toString());
        }
    }

    private static int anchoColumna(ColumnaReporte columna, List<Map<String, Object>> filas) {
        int caracteres = columna.titulo().length();
        for (int i = 0; i < Math.min(filas.size(), 200); i++) {
            caracteres = Math.max(caracteres,
                FormatoReporte.texto(filas.get(i).get(columna.clave()), columna.tipo()).length());
        }
        return Math.min(Math.max(caracteres + 3, 10), 60) * 256;
    }

    /** Estilos del libro: se crean una sola vez porque Excel tiene un límite de estilos. */
    private static final class Estilos {
        final CellStyle titulo, nota, encabezado, total;
        final CellStyle moneda, monedaTotal, numero, numeroTotal, decimal, decimalTotal, porcentaje, fecha, fechaHora;

        Estilos(Workbook libro) {
            DataFormat formato = libro.createDataFormat();

            Font fuenteTitulo = libro.createFont();
            fuenteTitulo.setBold(true);
            fuenteTitulo.setFontHeightInPoints((short) 14);
            titulo = libro.createCellStyle();
            titulo.setFont(fuenteTitulo);

            Font fuenteNota = libro.createFont();
            fuenteNota.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
            nota = libro.createCellStyle();
            nota.setFont(fuenteNota);

            Font negrita = libro.createFont();
            negrita.setBold(true);
            Font blanca = libro.createFont();
            blanca.setBold(true);
            blanca.setColor(IndexedColors.WHITE.getIndex());

            encabezado = libro.createCellStyle();
            encabezado.setFont(blanca);
            encabezado.setFillForegroundColor(IndexedColors.GREY_80_PERCENT.getIndex());
            encabezado.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            encabezado.setVerticalAlignment(VerticalAlignment.CENTER);

            total = libro.createCellStyle();
            total.setFont(negrita);
            total.setBorderTop(BorderStyle.THIN);

            moneda = libro.createCellStyle();
            moneda.setDataFormat(formato.getFormat("\"Q\" #,##0.00"));
            monedaTotal = libro.createCellStyle();
            monedaTotal.cloneStyleFrom(total);
            monedaTotal.setDataFormat(formato.getFormat("\"Q\" #,##0.00"));

            numero = libro.createCellStyle();
            numero.setDataFormat(formato.getFormat("#,##0"));
            numeroTotal = libro.createCellStyle();
            numeroTotal.cloneStyleFrom(total);
            numeroTotal.setDataFormat(formato.getFormat("#,##0"));

            decimal = libro.createCellStyle();
            decimal.setDataFormat(formato.getFormat("#,##0.0"));
            decimalTotal = libro.createCellStyle();
            decimalTotal.cloneStyleFrom(total);
            decimalTotal.setDataFormat(formato.getFormat("#,##0.0"));

            porcentaje = libro.createCellStyle();
            porcentaje.setDataFormat(formato.getFormat("0.0\" %\""));

            fecha = libro.createCellStyle();
            fecha.setDataFormat(formato.getFormat("dd/mm/yyyy"));
            fechaHora = libro.createCellStyle();
            fechaHora.setDataFormat(formato.getFormat("dd/mm/yyyy hh:mm"));
        }
    }
}
