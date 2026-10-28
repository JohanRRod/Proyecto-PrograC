
package com.fitpass.amenidades.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AmenidadRequest(
    @NotBlank String nombre,
    String descripcion,
    String iconoUrl,
    @NotNull Boolean requierePlanVip
) {}
