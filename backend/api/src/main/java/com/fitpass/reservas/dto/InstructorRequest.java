package com.fitpass.reservas.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InstructorRequest(
        @NotNull Integer sucursalBaseId,
        @NotBlank @Size(max = 150) String nombreCompleto,
        @NotBlank @Size(max = 100) String especialidad,
        @NotBlank @Email @Size(max = 150) String email,
        @Size(max = 30) String telefono,
        Boolean activo
) {}
