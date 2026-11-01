package com.fitpass.ia.repository;

import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Auditoría del agente: cada pregunta y respuesta queda en logs_agente_ia. */
@Repository
public class LogAgenteRepository {

    private final JdbcTemplate jdbc;

    public LogAgenteRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void registrar(UUID clienteId, String sesionId, String pregunta, String respuesta,
                          String documentosCitadosJson, int tokens, long tiempoMs) {
        jdbc.update("""
                INSERT INTO public.logs_agente_ia
                    (cliente_id, sesion_id, prompt_usuario, respuesta_agente, documentos_citados,
                     tokens_utilizados, tiempo_respuesta_ms)
                VALUES (?, ?, ?, ?, CAST(? AS jsonb), ?, ?)
                """,
                clienteId, sesionId, pregunta, respuesta, documentosCitadosJson, tokens, (int) tiempoMs);
    }
}
