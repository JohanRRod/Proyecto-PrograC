
package com.fitpass.planes.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record PlanRequest(
    @NotBlank String nombre,
    String descripcion,

    @NotNull @DecimalMin("0.0")
    BigDecimal precioMensual,

    @DecimalMin("0.0")
    BigDecimal cuotaInscripcion,

    @DecimalMin("0.0")
    BigDecimal cuotaMantenimientoAnual,

    @NotNull @Min(0)
    Integer mesesPermanenciaMinima,

    @NotNull @DecimalMin("0.0") @DecimalMax("100.0")
    BigDecimal porcentajePenalizacion,

    Boolean permiteAccesoNacional,
    Boolean permiteAccesoInternacional,
    Boolean permiteAmenidadesVip,

    @Min(0)
    Integer invitadosMensualesGratis,

    Boolean activo
) {}
