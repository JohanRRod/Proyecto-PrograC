
package com.fitpass.accesos.dto;

public record CheckInResponse(
    boolean permitido,
    String tipo,
    String motivo
) {}
