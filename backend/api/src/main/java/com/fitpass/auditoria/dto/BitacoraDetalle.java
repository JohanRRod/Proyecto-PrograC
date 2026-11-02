package com.fitpass.auditoria.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.OffsetDateTime;

/** Una operación con el registro como estaba antes y como quedó después. */
public record BitacoraDetalle(
        long id,
        OffsetDateTime fechaHora,
        String usuario,
        String modulo,
        String accion,
        String tabla,
        String registroId,
        String ip,
        boolean exitoso,
        String mensajeError,
        JsonNode antes,
        JsonNode despues
) {}
