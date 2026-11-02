package com.fitpass.reservas.dto;

public record InstructorResponse(
        Integer id,
        Integer sucursalBaseId,
        String sucursal,
        String nombreCompleto,
        String especialidad,
        String email,
        String telefono,
        boolean activo,
        long clases
) {}
