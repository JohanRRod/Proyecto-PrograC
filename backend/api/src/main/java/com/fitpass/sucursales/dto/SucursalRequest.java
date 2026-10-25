
package com.fitpass.sucursales.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalTime;

public record SucursalRequest(

    @NotNull @Positive
    Integer paisId,

    @NotBlank
    String nombre,

    @NotBlank
    String codigoSucursal,

    @NotBlank
    String direccion,

    @NotBlank
    String ciudad,

    @NotNull
    @DecimalMin("-90.0") @DecimalMax("90.0")
    BigDecimal latitud,

    @NotNull
    @DecimalMin("-180.0") @DecimalMax("180.0")
    BigDecimal longitud,

    String telefono,

    LocalTime horarioApertura,
    LocalTime horarioCierre,

    @Min(1)
    Integer capacidadMaxima,

    Boolean esSedeVip,
    Boolean activa
) {}
