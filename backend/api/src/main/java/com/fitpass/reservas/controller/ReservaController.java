
package com.fitpass.reservas.controller;

import com.fitpass.reservas.dto.DisponibilidadResponse;
import com.fitpass.reservas.dto.ReservaRequest;
import com.fitpass.reservas.entity.ClaseGrupal;
import com.fitpass.reservas.entity.ReservaClase;
import com.fitpass.reservas.service.ReservaService;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ReservaController {

    private final ReservaService service;

    public ReservaController(ReservaService service) {
        this.service = service;
    }

    @GetMapping("/clases")
    @PreAuthorize("hasRole('ADMIN')")
    public List<ClaseGrupal> listarClases(
            @RequestParam(required = false) Integer sucursalId) {

        if (sucursalId != null) {
            return service.clasesPorSucursal(sucursalId);
        }

        return service.listarClases();
    }

    @GetMapping("/clases/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ClaseGrupal obtenerClase(@PathVariable Integer id) {
        return service.obtenerClase(id);
    }

    @GetMapping("/clases/{id}/disponibilidad")
    @PreAuthorize("hasRole('ADMIN')")
    public DisponibilidadResponse disponibilidad(
            @PathVariable Integer id,
            @RequestParam LocalDate fecha) {

        long disponibles = service.cuposDisponibles(id, fecha);

        return new DisponibilidadResponse(
                id, fecha, disponibles);
    }

    @PostMapping("/reservas")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ReservaClase reservar(
            @Valid @RequestBody ReservaRequest request) {

        return service.reservar(
                request.claseId(),
                request.clienteId(),
                request.fechaClase());
    }

    @PatchMapping("/reservas/{id}/cancelar")
   @PreAuthorize("hasRole('ADMIN')")
    public ReservaClase cancelar(@PathVariable Integer id) {
        return service.cancelar(id);
    }

    @GetMapping("/reservas/cliente/{clienteId}")
    @PreAuthorize("hasRole('ADMIN')")
    public List<ReservaClase> historial(
            @PathVariable UUID clienteId) {

        return service.historial(clienteId);
    }
}
