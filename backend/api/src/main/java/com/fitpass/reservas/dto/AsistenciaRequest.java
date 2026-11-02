package com.fitpass.reservas.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AsistenciaRequest(
        @NotBlank @Pattern(regexp = "ASISTIO|INASISTENCIA") String estado
) {}
