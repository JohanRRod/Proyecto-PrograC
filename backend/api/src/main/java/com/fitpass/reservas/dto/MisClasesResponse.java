package com.fitpass.reservas.dto;

import java.util.List;

/**
 * Clases de una sede para los próximos días.
 * motivoSede trae el código por el que el miembro no puede reservar en esta sede
 * (por ejemplo SEDE_VIP_NO_PERMITIDA), o null si sí puede.
 */
public record MisClasesResponse(
        Integer sucursalId,
        String sucursal,
        boolean esSedeBase,
        boolean permiteVip,
        String motivoSede,
        List<MiClaseResponse> clases
) {}
