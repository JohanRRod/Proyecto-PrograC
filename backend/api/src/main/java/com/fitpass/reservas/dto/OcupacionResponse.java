package com.fitpass.reservas.dto;

import java.time.LocalDate;

/** Reservas de una clase en una fecha, agrupadas por estado. */
public record OcupacionResponse(
        Integer claseId,
        LocalDate fecha,
        long reservadas,
        long asistieron,
        long inasistencias
) {}
