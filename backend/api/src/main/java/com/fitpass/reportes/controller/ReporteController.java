package com.fitpass.reportes.controller;

import com.fitpass.reportes.service.ReporteService;
import com.fitpass.reportes.service.ExcelService;
import com.fitpass.reportes.service.PdfService;

import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reportes")
@PreAuthorize("hasRole('ADMIN')")
public class ReporteController {

    private final ReporteService reportes;
    private final ExcelService excel;
    private final PdfService pdf;

    public ReporteController(
            ReporteService reportes,
            ExcelService excel,
            PdfService pdf) {
        this.reportes = reportes;
        this.excel = excel;
        this.pdf = pdf;
    }

    @GetMapping("/clientes")
    public List<Map<String, Object>> clientes() {
        return reportes.clientesRegistrados();
    }

    @GetMapping("/clientes/excel")
    public ResponseEntity<byte[]> clientesExcel() {
        byte[] archivo = excel.generar(
            "Clientes registrados - FitPass",
            reportes.clientesRegistrados()
        );

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"clientes_fitpass.xlsx\"")
            .contentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(archivo);
    }

    @GetMapping("/clientes/pdf")
    public ResponseEntity<byte[]> clientesPdf() {
        byte[] archivo = pdf.generar(
            "Clientes registrados - FitPass",
            reportes.clientesRegistrados()
        );

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"clientes_fitpass.pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(archivo);
    }

    @GetMapping
public Set<String> disponibles() {
    return reportes.disponibles();
}

@GetMapping("/{codigo}/excel")
public ResponseEntity<byte[]> exportarExcel(
        @PathVariable String codigo) {

    validarCodigo(codigo);

    byte[] archivo = excel.generar(
        "FitPass - " + codigo,
        reportes.consultar(codigo)
    );

    return ResponseEntity.ok()
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"" + codigo + ".xlsx\""
        )
        .contentType(MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ))
        .body(archivo);
}

@GetMapping("/{codigo}/pdf")
public ResponseEntity<byte[]> exportarPdf(
        @PathVariable String codigo) {

    validarCodigo(codigo);

    byte[] archivo = pdf.generar(
        "FitPass - " + codigo,
        reportes.consultar(codigo)
    );

    return ResponseEntity.ok()
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"" + codigo + ".pdf\""
        )
        .contentType(MediaType.APPLICATION_PDF)
        .body(archivo);
}

private void validarCodigo(String codigo) {
    if (!reportes.disponibles().contains(codigo)) {
        throw new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "Reporte no encontrado"
        );
    }
}
}