package com.fitpass.auditoria.dto;

import java.time.OffsetDateTime;

/** Una operación en la lista de la bitácora (sin los datos de antes y después). */
public record BitacoraFila(
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
        boolean tieneDatos
) {}
