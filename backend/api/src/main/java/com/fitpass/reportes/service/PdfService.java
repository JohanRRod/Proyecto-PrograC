package com.fitpass.reportes.service;

import com.fitpass.reportes.dto.ColumnaReporte;
import com.fitpass.reportes.dto.ReporteResultado;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;

@Service
public class PdfService {

    private static final Color TINTA = new Color(0x1F, 0x23, 0x2B);
    private static final Color GRIS = new Color(0x6B, 0x72, 0x80);
    private static final Color LINEA = new Color(0xE5, 0xE7, 0xEB);
    private static final Color FONDO_TOTAL = new Color(0xF3, 0xF4, 0xF6);

    private static final Font TITULO = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, TINTA);
    private static final Font NOTA = FontFactory.getFont(FontFactory.HELVETICA, 9, GRIS);
    private static final Font ENCABEZADO = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
    private static final Font CELDA = FontFactory.getFont(FontFactory.HELVETICA, 8, TINTA);
    private static final Font CELDA_TOTAL = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, TINTA);

    public byte[] generar(ReporteResultado resultado) {
        try (ByteArrayOutputStream salida = new ByteArrayOutputStream()) {

            Document documento = new Document(PageSize.A4.rotate(), 32, 32, 32, 40);
            PdfWriter.getInstance(documento, salida);

            HeaderFooter pie = new HeaderFooter(
                new Phrase("FlexPass · " + resultado.reporte().titulo() + " · Página ", NOTA), true);
            pie.setAlignment(Element.ALIGN_RIGHT);
            pie.setBorder(Rectangle.NO_BORDER);
            documento.setFooter(pie);
            documento.open();

            documento.add(new Paragraph("FlexPass · " + resultado.reporte().titulo(), TITULO));
            documento.add(new Paragraph(resultado.reporte().descripcion(), NOTA));
            String filtros = FormatoReporte.describirFiltros(resultado);
            documento.add(new Paragraph(
                (filtros.isEmpty() ? "" : filtros + " · ") + FormatoReporte.generado(resultado)
                    + " · " + resultado.filas().size() + " registros", NOTA));
            documento.add(new Paragraph(" ", NOTA));

            List<ColumnaReporte> columnas = resultado.columnas();
            if (columnas.isEmpty()) {
                documento.add(new Paragraph("No hay datos para los filtros elegidos.", CELDA));
            } else {
                documento.add(tabla(resultado, columnas));
            }

            documento.close();
            return salida.toByteArray();

        } catch (Exception e) {
            throw new IllegalStateException("Error al generar PDF", e);
        }
    }

    private static PdfPTable tabla(ReporteResultado resultado, List<ColumnaReporte> columnas) {
        PdfPTable tabla = new PdfPTable(columnas.size());
        tabla.setWidthPercentage(100);
        tabla.setHeaderRows(1);

        for (ColumnaReporte c : columnas) {
            PdfPCell cell = new PdfPCell(new Phrase(c.titulo(), ENCABEZADO));
            cell.setBackgroundColor(TINTA);
            cell.setBorderColor(TINTA);
            cell.setPadding(5);
            cell.setHorizontalAlignment(alineacion(c));
            tabla.addCell(cell);
        }

        for (Map<String, Object> fila : resultado.filas()) {
            for (ColumnaReporte c : columnas) {
                tabla.addCell(celda(FormatoReporte.texto(fila.get(c.clave()), c.tipo()), c, CELDA, null));
            }
        }

        if (!resultado.totales().isEmpty()) {
            for (int i = 0; i < columnas.size(); i++) {
                ColumnaReporte c = columnas.get(i);
                String texto = i == 0 ? "Total"
                    : resultado.totales().containsKey(c.clave())
                        ? FormatoReporte.texto(resultado.totales().get(c.clave()), c.tipo())
                        : "";
                tabla.addCell(celda(texto, c, CELDA_TOTAL, FONDO_TOTAL));
            }
        }
        return tabla;
    }

    private static PdfPCell celda(String texto, ColumnaReporte columna, Font fuente, Color fondo) {
        PdfPCell cell = new PdfPCell(new Phrase(texto, fuente));
        cell.setPadding(4);
        cell.setBorderColor(LINEA);
        cell.setHorizontalAlignment(alineacion(columna));
        if (fondo != null) cell.setBackgroundColor(fondo);
        return cell;
    }

    private static int alineacion(ColumnaReporte columna) {
        return FormatoReporte.esNumerico(columna.tipo()) ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT;
    }
}
