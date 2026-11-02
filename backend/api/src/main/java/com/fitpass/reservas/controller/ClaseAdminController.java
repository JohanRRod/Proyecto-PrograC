package com.fitpass.reservas.controller;

import com.fitpass.reservas.dto.AsistenciaRequest;
import com.fitpass.reservas.dto.ClaseRequest;
import com.fitpass.reservas.dto.InstructorRequest;
import com.fitpass.reservas.dto.InstructorResponse;
import com.fitpass.reservas.dto.OcupacionResponse;
import com.fitpass.reservas.dto.ReservaClaseResponse;
import com.fitpass.reservas.entity.ClaseGrupal;
import com.fitpass.reservas.entity.ReservaClase;
import com.fitpass.reservas.service.ClaseAdminService;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Administración de instructores y clases, y la lista de reservas de cada clase.
 * Complementa a ReservaController, que consulta clases y crea o cancela reservas.
 */
@RestController
@RequestMapping("/api")
@PreAuthorize("hasRole('ADMIN')")
public class ClaseAdminController {

    private final ClaseAdminService service;

    public ClaseAdminController(ClaseAdminService service) {
        this.service = service;
    }

    @GetMapping("/instructores")
    public List<InstructorResponse> instructores() {
        return service.instructores();
    }

    @PostMapping("/instructores")
    @ResponseStatus(HttpStatus.CREATED)
    public InstructorResponse crearInstructor(@Valid @RequestBody InstructorRequest request) {
        return service.crearInstructor(request);
    }

    @PutMapping("/instructores/{id}")
    public InstructorResponse actualizarInstructor(
            @PathVariable Integer id,
            @Valid @RequestBody InstructorRequest request) {
        return service.actualizarInstructor(id, request);
    }

    @PostMapping("/clases")
    @ResponseStatus(HttpStatus.CREATED)
    public ClaseGrupal crearClase(@Valid @RequestBody ClaseRequest request) {
        return service.crearClase(request);
    }

    @PutMapping("/clases/{id}")
    public ClaseGrupal actualizarClase(
            @PathVariable Integer id,
            @Valid @RequestBody ClaseRequest request) {
        return service.actualizarClase(id, request);
    }

    /** Reservas por clase y fecha en un rango (máximo dos meses). */
    @GetMapping("/clases/ocupacion")
    public List<OcupacionResponse> ocupacion(
            @RequestParam(required = false) Integer sucursalId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return service.ocupacion(sucursalId, desde, hasta);
    }

    @GetMapping("/clases/{id}/reservas")
    public List<ReservaClaseResponse> reservasDeClase(
            @PathVariable Integer id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return service.reservasDeClase(id, fecha);
    }

    @PatchMapping("/reservas/{id}/asistencia")
    public ReservaClase marcarAsistencia(
            @PathVariable Integer id,
            @Valid @RequestBody AsistenciaRequest request) {
        return service.marcarAsistencia(id, request.estado());
    }
}
