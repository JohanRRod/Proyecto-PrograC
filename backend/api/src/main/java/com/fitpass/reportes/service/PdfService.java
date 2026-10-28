package com.fitpass.reportes.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;

@Service
public class PdfService {

    public byte[] generar(String titulo, List<Map<String, Object>> datos) {
        try (ByteArrayOutputStream salida = new ByteArrayOutputStream()) {

            Document documento = new Document(PageSize.A4.rotate());
            PdfWriter.getInstance(documento, salida);
            documento.open();

            documento.add(new Paragraph(titulo));
            documento.add(new Paragraph(" "));

            if (datos.isEmpty()) {
                documento.add(new Paragraph("No hay datos disponibles."));
            } else {
                List<String> columnas = List.copyOf(datos.get(0).keySet());
                PdfPTable tabla = new PdfPTable(columnas.size());
                tabla.setWidthPercentage(100);

                for (String columna : columnas) {
                    tabla.addCell(columna);
                }

                for (Map<String, Object> registro : datos) {
                    for (String columna : columnas) {
                        Object valor = registro.get(columna);
                        tabla.addCell(valor == null ? "" : valor.toString());
                    }
                }

                documento.add(tabla);
            }

            documento.close();
            return salida.toByteArray();

        } catch (Exception e) {
            throw new IllegalStateException("Error al generar PDF", e);
        }
    }
}