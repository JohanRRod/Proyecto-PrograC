package com.fitpass.reservas.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalTime;

public record ClaseRequest(
        @NotNull Integer sucursalId,
        @NotNull Integer instructorId,
        @NotBlank @Size(max = 100) String nombreClase,
        @NotBlank String diaSemana,
        @NotNull LocalTime horaInicio,
        @NotNull LocalTime horaFin,
        @NotNull @Min(1) @Max(200) Integer cupoMaximo,
        Boolean requierePlanVip
) {}
