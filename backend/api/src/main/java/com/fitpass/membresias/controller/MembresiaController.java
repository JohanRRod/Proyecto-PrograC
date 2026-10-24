
package com.fitpass.membresias.controller;

import com.fitpass.membresias.dto.MembresiaRequest;
import com.fitpass.membresias.dto.MembresiaResponse;
import com.fitpass.membresias.service.MembresiaService;
import com.fitpass.membresias.dto.CancelacionRequest;
import com.fitpass.membresias.dto.CancelacionResponse;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/membresias")
public class MembresiaController {

    private final MembresiaService membresiaService;

    public MembresiaController(MembresiaService membresiaService) {
        this.membresiaService = membresiaService;
    }

    // LISTAR MEMBRESIAS
    @GetMapping
    public ResponseEntity<List<MembresiaResponse>> listar() {

        List<MembresiaResponse> respuesta =
                membresiaService.listarMembresias()
                        .stream()
                        .map(MembresiaResponse::new)
                        .toList();

        return ResponseEntity.ok(respuesta);
    }

    // BUSCAR MEMBRESIA POR ID
    @GetMapping("/{id}")
    public ResponseEntity<MembresiaResponse> obtener(
            @PathVariable Integer id) {

        MembresiaResponse respuesta = new MembresiaResponse(
                membresiaService.obtenerMembresia(id)
        );

        return ResponseEntity.ok(respuesta);
    }
    
    // CONTRATAR MEMBRESIA
    @PostMapping
    public ResponseEntity<MembresiaResponse> contratar(
            @Valid @RequestBody MembresiaRequest request) {

        MembresiaResponse respuesta = new MembresiaResponse(
                membresiaService.contratarMembresia(request)
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(respuesta);
    }

    
    // LISTAR MEMBRESIAS POR CLIENTE
    @GetMapping("/cliente/{clienteId}")
    public ResponseEntity<List<MembresiaResponse>> listarPorCliente(
            @PathVariable UUID clienteId) {

        List<MembresiaResponse> respuesta =
                membresiaService.listarPorCliente(clienteId)
                        .stream()
                        .map(MembresiaResponse::new)
                        .toList();

        return ResponseEntity.ok(respuesta);
    }
    
    @GetMapping("/estado/{estado}")
    public ResponseEntity<List<MembresiaResponse>> listarPorEstado(
            @PathVariable String estado) {

        List<MembresiaResponse> respuesta =
                membresiaService.listarPorEstado(estado)
                        .stream()
                        .map(MembresiaResponse::new)
                        .toList();

        return ResponseEntity.ok(respuesta);
    }


    // SOLICITAR CANCELACION
    @PostMapping("/{id}/cancelacion")
    public ResponseEntity<CancelacionResponse> solicitarCancelacion(
            @PathVariable Integer id,
            @Valid @RequestBody CancelacionRequest request) {

        CancelacionResponse respuesta =
                membresiaService.solicitarCancelacion(id, request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(respuesta);
    }


}
