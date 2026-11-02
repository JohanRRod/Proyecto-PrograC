package com.fitpass.reservas.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record MiReservaRequest(
        @NotNull Integer claseId,
        @NotNull LocalDate fechaClase
) {}
