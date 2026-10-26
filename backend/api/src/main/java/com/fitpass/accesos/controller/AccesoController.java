
package com.fitpass.accesos.controller;

import com.fitpass.accesos.dto.CheckInRequest;
import com.fitpass.accesos.dto.CheckInResponse;
import com.fitpass.accesos.service.AccesoService;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/accesos")
public class AccesoController {

    private final AccesoService service;

    public AccesoController(AccesoService service) {
        this.service = service;
    }

    @PostMapping("/checkin")
    public CheckInResponse checkIn(
            @Valid @RequestBody CheckInRequest request) {
        return service.checkIn(request);
    }

    @GetMapping("/historial/{clienteId}")
    public List<Map<String, Object>> historial(
            @PathVariable UUID clienteId) {
        return service.historial(clienteId);
    }
}
