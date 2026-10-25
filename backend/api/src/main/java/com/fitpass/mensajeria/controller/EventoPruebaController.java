
package com.fitpass.mensajeria.controller;

import com.fitpass.mensajeria.dto.EventoPago;
import com.fitpass.mensajeria.service.EventoPagoService;

import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dev/eventos")
@Validated
public class EventoPruebaController {

    private final EventoPagoService service;

    public EventoPruebaController(EventoPagoService service) {
        this.service = service;
    }

    @PostMapping("/pago/{cobroId}")
    public EventoPago publicar(
            @PathVariable @Positive Integer cobroId) {

        return service.publicarEventoPrueba(cobroId);
    }
}
