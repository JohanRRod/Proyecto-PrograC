package com.fitpass.reservas.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Una reserva dentro de la lista de una clase (vista del admin). */
public record ReservaClaseResponse(
        Integer id,
        UUID clienteId,
        String nombreCliente,
        String documento,
        String estado,
        OffsetDateTime createdAt
) {}
