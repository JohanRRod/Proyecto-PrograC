
package com.fitpass.membresias.dto;

import com.fitpass.membresias.entity.Membresia;

import java.time.LocalDate;
import java.util.UUID;

public class MembresiaResponse {

    private Integer id;
    private UUID clienteId;
    private Integer planId;
    private Integer metodoPagoId;
    private LocalDate fechaInicio;
    private LocalDate fechaFinPermanenciaMinima;
    private Integer diaCorteMensual;
    private Boolean descuentoAutomaticoActivo;
    private String estado;

    public MembresiaResponse(Membresia membresia) {
        this.id = membresia.getId();
        this.clienteId = membresia.getClienteId();
        this.planId = membresia.getPlanId();
        this.metodoPagoId = membresia.getMetodoPagoId();
        this.fechaInicio = membresia.getFechaInicio();
        this.fechaFinPermanenciaMinima =
                membresia.getFechaFinPermanenciaMinima();
        this.diaCorteMensual = membresia.getDiaCorteMensual();
        this.descuentoAutomaticoActivo =
                membresia.getDescuentoAutomaticoActivo();
        this.estado = membresia.getEstado();
    }

    public Integer getId() {
        return id;
    }

    public UUID getClienteId() {
        return clienteId;
    }

    public Integer getPlanId() {
        return planId;
    }

    public Integer getMetodoPagoId() {
        return metodoPagoId;
    }

    public LocalDate getFechaInicio() {
        return fechaInicio;
    }

    public LocalDate getFechaFinPermanenciaMinima() {
        return fechaFinPermanenciaMinima;
    }

    public Integer getDiaCorteMensual() {
        return diaCorteMensual;
    }

    public Boolean getDescuentoAutomaticoActivo() {
        return descuentoAutomaticoActivo;
    }

    public String getEstado() {
        return estado;
    }
}
