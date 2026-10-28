
package com.fitpass.amenidades.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record SucursalAmenidadRequest(
    @NotNull Integer amenidadId,
    @NotNull Boolean disponible,
    @NotNull @Min(1) Integer capacidadZona,
    String horarioEspecial
) {}
