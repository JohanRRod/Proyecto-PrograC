package com.fitpass.reservas.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

public record MiReservaResponse(
        Integer id,
        Integer claseId,
        String nombreClase,
        String instructor,
        Integer sucursalId,
        String sucursal,
        LocalDate fechaClase,
        LocalTime horaInicio,
        LocalTime horaFin,
        String estado,
        OffsetDateTime createdAt
) {}
