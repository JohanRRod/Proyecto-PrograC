package com.fitpass.reservas.controller;

import com.fitpass.reservas.dto.MiReservaRequest;
import com.fitpass.reservas.dto.MiReservaResponse;
import com.fitpass.reservas.dto.MisClasesResponse;
import com.fitpass.reservas.entity.ReservaClase;
import com.fitpass.reservas.service.ClienteActual;
import com.fitpass.reservas.service.MiReservaService;

import jakarta.validation.Valid;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/** Clases y reservas del miembro que inició sesión. */
@RestController
@RequestMapping("/api/mi")
@PreAuthorize("hasRole('MIEMBRO')")
public class MiReservaController {

    private final MiReservaService service;
    private final ClienteActual clienteActual;

    public MiReservaController(MiReservaService service, ClienteActual clienteActual) {
        this.service = service;
        this.clienteActual = clienteActual;
    }

    /** Clases de los próximos 7 días en una sede; sin sucursalId, en la sede base del miembro. */
    @GetMapping("/clases")
    public MisClasesResponse clases(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) Integer sucursalId) {
        return service.clases(clienteActual.de(jwt), sucursalId);
    }

    @GetMapping("/reservas")
    public List<MiReservaResponse> reservas(@AuthenticationPrincipal Jwt jwt) {
        return service.reservas(clienteActual.de(jwt));
    }

    @PostMapping("/reservas")
    @ResponseStatus(HttpStatus.CREATED)
    public ReservaClase reservar(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody MiReservaRequest request) {
        return service.reservar(clienteActual.de(jwt), request.claseId(), request.fechaClase());
    }

    @PatchMapping("/reservas/{id}/cancelar")
    public ReservaClase cancelar(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Integer id) {
        return service.cancelar(clienteActual.de(jwt), id);
    }
}
