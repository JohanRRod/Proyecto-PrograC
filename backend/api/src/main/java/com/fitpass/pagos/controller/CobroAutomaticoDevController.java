package com.fitpass.pagos.controller;

import com.fitpass.pagos.service.CobroAutomaticoService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.fitpass.pagos.service.CobroIntegracionDevService;

import java.time.LocalDate;
import java.util.Map;

@RestController
@Profile("dev")
@RequestMapping("/api/dev/cobros")
public class CobroAutomaticoDevController {

    private final CobroAutomaticoService servicio;

    @Value("${fitpass.cobros.pruebas-habilitadas:false}")
    private boolean pruebasHabilitadas;

    @Value("${fitpass.cobros.prueba-membresia-id:3}")
    private Integer membresiaPermitida;

    public CobroAutomaticoDevController(
            CobroAutomaticoService servicio) {
        this.servicio = servicio;
    }

    private void validar(Integer id) {

        if (!pruebasHabilitadas) {
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Pruebas deshabilitadas"
            );
        }

        if (!id.equals(membresiaPermitida)) {
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Solo se permite la membresia de prueba"
            );
        }
    }

    @GetMapping("/{id}/vista-previa")
    public ResponseEntity<Map<String, Object>> vistaPrevia(
            @PathVariable Integer id,
            @RequestParam LocalDate fecha) {

        validar(id);

        return ResponseEntity.ok(
            servicio.vistaPrevia(id, fecha)
        );
    }

    @PostMapping("/{id}/ejecutar")
    public ResponseEntity<Map<String, Object>> ejecutar(
            @PathVariable Integer id,
            @RequestParam LocalDate fecha) {

        validar(id);

        return ResponseEntity.ok(
            servicio.ejecutarPrueba(id, fecha)
        );
    }

    @PostMapping("/{id}/simular-morosidad")
public ResponseEntity<Map<String, Object>> simularMorosidad(
        @PathVariable Integer id,
        @RequestParam LocalDate fecha) {

    validar(id);

    return ResponseEntity.ok(
        servicio.simularMorosidad(id, fecha)
    );
}

@PostMapping("/{id}/procesar-pendientes")
public ResponseEntity<Map<String, Object>> procesarPendientes(
        @PathVariable Integer id) {

    validar(id);

    return ResponseEntity.ok(
        servicio.procesarPendientesDev(id)
    );
}

@org.springframework.beans.factory.annotation.Autowired
private CobroIntegracionDevService integracionDev;

@PostMapping("/{id}/integracion")
public ResponseEntity<Map<String, Object>> integracion(
        @PathVariable Integer id,
        @RequestParam LocalDate periodo,
        @RequestParam LocalDate fecha,
        @RequestParam(defaultValue = "false")
            boolean forzarRechazo) {

    validar(id);

    return ResponseEntity.ok(
        integracionDev.procesar(
            id,
            periodo,
            fecha,
            forzarRechazo
        )
    );
}
}