
package com.fitpass.accesos.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CheckInRequest(
    @NotNull UUID clienteId,
    @NotNull Integer sucursalId,
    Integer amenidadId
) {}
