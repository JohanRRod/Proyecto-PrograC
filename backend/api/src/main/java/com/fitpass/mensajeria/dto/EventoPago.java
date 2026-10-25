
package com.fitpass.mensajeria.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EventoPago(
    @NotNull UUID eventoId,
    @NotNull @Positive Integer cobroId,
    @NotBlank String tipo,
    @NotNull OffsetDateTime fechaEvento
) {}
