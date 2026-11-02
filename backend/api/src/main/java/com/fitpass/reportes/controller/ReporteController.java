package com.fitpass.reportes.controller;

import com.fitpass.reportes.dto.ReporteFiltros;
import com.fitpass.reportes.dto.ReporteInfo;
import com.fitpass.reportes.dto.ReporteResultado;
import com.fitpass.reportes.service.ExcelService;
import com.fitpass.reportes.service.PdfService;
import com.fitpass.reportes.service.ReporteService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Reportes administrativos. Todos aceptan los filtros opcionales
 * desde, hasta (yyyy-MM-dd) y sucursalId.
 */
@RestController
@RequestMapping("/api/reportes")
@PreAuthorize("hasRole('ADMIN')")
public class ReporteController {

    private static final MediaType EXCEL = MediaType.parseMediaType(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final ReporteService reportes;
    private final ExcelService excel;
    private final PdfService pdf;

    public ReporteController(ReporteService reportes, ExcelService excel, PdfService pdf) {
        this.reportes = reportes;
        this.excel = excel;
        this.pdf = pdf;
    }

    @GetMapping
    public List<ReporteInfo> disponibles() {
        return reportes.disponibles();
    }

    @GetMapping("/{codigo}")
    public ReporteResultado consultar(
            @PathVariable String codigo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) Integer sucursalId) {
        return reportes.generar(codigo, new ReporteFiltros(desde, hasta, sucursalId));
    }

    @GetMapping("/{codigo}/excel")
    public ResponseEntity<byte[]> exportarExcel(
            @PathVariable String codigo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) Integer sucursalId) {
        ReporteResultado resultado = reportes.generar(codigo, new ReporteFiltros(desde, hasta, sucursalId));
        return archivo(excel.generar(resultado), nombreArchivo(resultado, "xlsx"), EXCEL);
    }

    @GetMapping("/{codigo}/pdf")
    public ResponseEntity<byte[]> exportarPdf(
            @PathVariable String codigo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) Integer sucursalId) {
        ReporteResultado resultado = reportes.generar(codigo, new ReporteFiltros(desde, hasta, sucursalId));
        return archivo(pdf.generar(resultado), nombreArchivo(resultado, "pdf"), MediaType.APPLICATION_PDF);
    }

    private static String nombreArchivo(ReporteResultado resultado, String extension) {
        return "flexpass-" + resultado.reporte().codigo() + "-"
            + resultado.generadoEn().toLocalDate() + "." + extension;
    }

    private static ResponseEntity<byte[]> archivo(byte[] contenido, String nombre, MediaType tipo) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment().filename(nombre).build().toString())
            .contentType(tipo)
            .body(contenido);
    }
}
