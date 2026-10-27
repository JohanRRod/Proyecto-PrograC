
package com.fitpass.reservas.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record ReservaRequest(
        @NotNull Integer claseId,
        @NotNull UUID clienteId,
        @NotNull LocalDate fechaClase
) {}
