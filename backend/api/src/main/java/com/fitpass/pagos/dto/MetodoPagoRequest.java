
package com.fitpass.pagos.dto;

import jakarta.validation.constraints.*;
import java.util.UUID;

public record MetodoPagoRequest(
    @NotNull UUID clienteId,

    @NotBlank
    @Pattern(regexp = "TARJETA_CREDITO|TARJETA_DEBITO|CUENTA_BANCARIA")
    String tipoCuenta,

    @NotBlank String bancoEmisor,

    @NotBlank
    @Pattern(regexp = "[0-9]{4}")
    String ultimosCuatroDigitos,

    @NotBlank String titular
) {}
