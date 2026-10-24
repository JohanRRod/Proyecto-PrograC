
package com.fitpass.membresias.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CancelacionRequest {

    @NotBlank(message = "El motivo de cancelacion es obligatorio")
    @Size(max = 1000, message = "El motivo es demasiado largo")
    private String motivoCancelacion;

    public String getMotivoCancelacion() {
        return motivoCancelacion;
    }

    public void setMotivoCancelacion(String motivoCancelacion) {
        this.motivoCancelacion = motivoCancelacion;
    }
}
