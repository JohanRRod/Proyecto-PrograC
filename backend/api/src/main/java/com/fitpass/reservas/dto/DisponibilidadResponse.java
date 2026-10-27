
package com.fitpass.reservas.dto;

import java.time.LocalDate;

public record DisponibilidadResponse(
        Integer claseId,
        LocalDate fechaClase,
        long cuposDisponibles
) {}
