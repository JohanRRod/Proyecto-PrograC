
package com.fitpass.pagos.dto;

import jakarta.validation.constraints.*;

public record CobroRequest(
    @NotNull @Positive Integer membresiaId,
    @NotNull @Positive Integer metodoPagoId,

    @NotBlank
    @Pattern(regexp = "MENSUALIDAD|PENALIZACION_CANCELACION")
    String concepto
) {}
