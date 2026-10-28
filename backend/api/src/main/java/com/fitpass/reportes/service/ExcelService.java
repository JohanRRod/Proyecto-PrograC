package com.fitpass.reportes.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;

@Service
public class ExcelService {

    public byte[] generar(String titulo, List<Map<String, Object>> datos) {
        try (Workbook libro = new XSSFWorkbook();
             ByteArrayOutputStream salida = new ByteArrayOutputStream()) {

            Sheet hoja = libro.createSheet("Reporte");
            int filaActual = 0;

            Row tituloFila = hoja.createRow(filaActual++);
            tituloFila.createCell(0).setCellValue(titulo);

            if (!datos.isEmpty()) {
                List<String> columnas = List.copyOf(datos.get(0).keySet());

                Row encabezado = hoja.createRow(filaActual++);
                for (int i = 0; i < columnas.size(); i++) {
                    encabezado.createCell(i).setCellValue(columnas.get(i));
                }

                for (Map<String, Object> registro : datos) {
                    Row fila = hoja.createRow(filaActual++);
                    for (int i = 0; i < columnas.size(); i++) {
                        Object valor = registro.get(columnas.get(i));
                        fila.createCell(i).setCellValue(
                            valor == null ? "" : valor.toString()
                        );
                    }
                }

                for (int i = 0; i < columnas.size(); i++) {
                    hoja.setColumnWidth(i, 6000);
                }
            }

            libro.write(salida);
            return salida.toByteArray();

        } catch (Exception e) {
            throw new IllegalStateException("Error al generar Excel", e);
        }
    }
}