
package com.fitpass.pagos.controller;

import com.fitpass.pagos.dto.*;
import com.fitpass.pagos.service.PagoService;

import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/pagos")
public class PagoController {

    private final PagoService service;

    public PagoController(PagoService service) {
        this.service = service;
    }

    @PostMapping("/metodos")
    public ResponseEntity<Map<String, Object>> registrarMetodo(
            @Valid @RequestBody MetodoPagoRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(service.registrarMetodo(request));
    }

    @GetMapping("/metodos/cliente/{clienteId}")
    public List<Map<String, Object>> listarMetodos(
            @PathVariable UUID clienteId) {

        return service.listarMetodos(clienteId);
    }

    @PostMapping("/cobros")
    public ResponseEntity<Map<String, Object>> cobrar(
            @Valid @RequestBody CobroRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(service.cobrar(request));
    }

    @GetMapping("/cobros/{id}")
    public Map<String, Object> obtenerCobro(
            @PathVariable Integer id) {

        return service.obtenerCobro(id);
    }

    @GetMapping("/historial/cliente/{clienteId}")
    public List<Map<String, Object>> historial(
            @PathVariable UUID clienteId) {

        return service.historial(clienteId);
    }
}
