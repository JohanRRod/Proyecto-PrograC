package com.fitpass.ia.repository;

import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Auditoría del agente: cada pregunta y respuesta queda en logs_agente_ia. */
@Repository
public class LogAgenteRepository {

    /** Números de 13 a 19 dígitos (con espacios o guiones): parecen tarjetas y no se guardan completos. */
    private static final Pattern TARJETA = Pattern.compile("\\b(?:\\d[ -]?){9,15}(\\d{4})\\b");

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
                clienteId, sesionId, ocultarTarjetas(pregunta), ocultarTarjetas(respuesta),
                documentosCitadosJson, tokens, (int) tiempoMs);
    }

    /** "4111 1111 1111 1111" -> "**** 1111". */
    static String ocultarTarjetas(String texto) {
        return texto == null ? null : TARJETA.matcher(texto).replaceAll("**** $1");
    }
}
