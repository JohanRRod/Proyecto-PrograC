package com.fitpass.reservas.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/** Una clase en una fecha concreta, como la ve el miembro. */
public record MiClaseResponse(
        Integer claseId,
        String nombreClase,
        String instructor,
        LocalDate fecha,
        String diaSemana,
        LocalTime horaInicio,
        LocalTime horaFin,
        int cupoMaximo,
        long reservadas,
        boolean requierePlanVip,
        Integer miReservaId
) {}
