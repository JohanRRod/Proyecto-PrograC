
package com.fitpass.membresias.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

import java.util.UUID;

public class MembresiaRequest {

    @NotNull(message = "El cliente es obligatorio")
    private UUID clienteId;

    @NotNull(message = "El plan es obligatorio")
    @Positive(message = "El ID del plan debe ser positivo")
    private Integer planId;

    @Positive(message = "El ID del metodo de pago debe ser positivo")
    private Integer metodoPagoId;

    @NotNull(message = "El dia de corte es obligatorio")
    @Min(value = 1, message = "El dia de corte debe ser mayor o igual a 1")
    @Max(value = 28, message = "El dia de corte debe ser menor o igual a 28")
    private Integer diaCorteMensual;

    public UUID getClienteId() {
        return clienteId;
    }

    public void setClienteId(UUID clienteId) {
        this.clienteId = clienteId;
    }

    public Integer getPlanId() {
        return planId;
    }

    public void setPlanId(Integer planId) {
        this.planId = planId;
    }

    public Integer getMetodoPagoId() {
        return metodoPagoId;
    }

    public void setMetodoPagoId(Integer metodoPagoId) {
        this.metodoPagoId = metodoPagoId;
    }

    public Integer getDiaCorteMensual() {
        return diaCorteMensual;
    }

    public void setDiaCorteMensual(Integer diaCorteMensual) {
        this.diaCorteMensual = diaCorteMensual;
    }
}
