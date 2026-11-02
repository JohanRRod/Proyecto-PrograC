package com.fitpass.auditoria.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Una pregunta al asistente de IA y su respuesta (tabla logs_agente_ia). */
public record LogAgenteFila(
        long id,
        OffsetDateTime fechaHora,
        String sesionId,
        UUID clienteId,
        String pregunta,
        String respuesta,
        JsonNode documentosCitados,
        int tokens,
        int tiempoMs
) {}
