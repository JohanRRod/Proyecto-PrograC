
package com.fitpass.amenidades.controller;

import com.fitpass.amenidades.dto.AmenidadRequest;
import com.fitpass.amenidades.dto.SucursalAmenidadRequest;
import com.fitpass.amenidades.entity.Amenidad;
import com.fitpass.amenidades.entity.SucursalAmenidad;
import com.fitpass.amenidades.service.AmenidadService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@PreAuthorize("hasRole('ADMIN')")
public class AmenidadController {

    private final AmenidadService service;

    public AmenidadController(AmenidadService service) {
        this.service = service;
    }

    @GetMapping("/amenidades")
    public List<Amenidad> listar() {
        return service.listar();
    }

    @GetMapping("/amenidades/{id}")
    public Amenidad obtener(@PathVariable Integer id) {
        return service.obtener(id);
    }

    @PostMapping("/amenidades")
    public ResponseEntity<Amenidad> crear(
            @Valid @RequestBody AmenidadRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.crear(request));
    }

    @PutMapping("/amenidades/{id}")
    public Amenidad actualizar(
            @PathVariable Integer id,
            @Valid @RequestBody AmenidadRequest request) {

        return service.actualizar(id, request);
    }

    @GetMapping("/sucursales/{sucursalId}/amenidades")
    public List<SucursalAmenidad> listarPorSucursal(
            @PathVariable Integer sucursalId) {

        return service.listarPorSucursal(sucursalId);
    }

    @PostMapping("/sucursales/{sucursalId}/amenidades")
    public ResponseEntity<SucursalAmenidad> asignar(
            @PathVariable Integer sucursalId,
            @Valid @RequestBody SucursalAmenidadRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.asignar(sucursalId, request));
    }

    @PutMapping("/sucursales/{sucursalId}/amenidades/{amenidadId}")
    public SucursalAmenidad actualizarAsignacion(
            @PathVariable Integer sucursalId,
            @PathVariable Integer amenidadId,
            @Valid @RequestBody SucursalAmenidadRequest request) {

        return service.actualizarAsignacion(
                sucursalId, amenidadId, request);
    }
}
