package com.fitpass.mensajeria.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class OutboxRepository {

    private final JdbcTemplate jdbc;

    public OutboxRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record EventoPendiente(
        UUID id,
        String tipoEvento,
        String payload
    ) {}

    public void guardar(
            UUID eventoId,
            String tipoEvento,
            Integer cobroId,
            String payload) {

        jdbc.update("""
            INSERT INTO public.eventos_outbox (
                id, tipo_evento, agregado_id, payload
            )
            VALUES (?, ?, ?, ?)
            """,
            eventoId,
            tipoEvento,
            cobroId,
            payload
        );
    }

    public List<UUID> listarPendientes() {
        return jdbc.queryForList("""
            SELECT id
            FROM public.eventos_outbox
            WHERE estado = 'PENDIENTE'
            ORDER BY fecha_creacion, id
            LIMIT 20
            """,
            UUID.class
        );
    }

    public Optional<EventoPendiente> bloquearPendiente(UUID id) {
        return jdbc.query("""
            SELECT id, tipo_evento, payload
            FROM public.eventos_outbox
            WHERE id = ?
              AND estado = 'PENDIENTE'
            FOR UPDATE SKIP LOCKED
            """,
            (rs, rowNum) -> new EventoPendiente(
                rs.getObject("id", UUID.class),
                rs.getString("tipo_evento"),
                rs.getString("payload")
            ),
            id
        ).stream().findFirst();
    }

    public void marcarPublicado(UUID id) {
        jdbc.update("""
            UPDATE public.eventos_outbox
            SET estado = 'PUBLICADO',
                fecha_publicacion = NOW(),
                intentos = intentos + 1,
                ultimo_error = NULL
            WHERE id = ?
              AND estado = 'PENDIENTE'
            """,
            id
        );
    }

    public void registrarError(UUID id, String error) {
        jdbc.update("""
            UPDATE public.eventos_outbox
            SET intentos = intentos + 1,
                ultimo_error = ?
            WHERE id = ?
              AND estado = 'PENDIENTE'
            """,
            error == null
                ? "Error desconocido"
                : error.substring(0, Math.min(error.length(), 1000)),
            id
        );
    }

    public boolean registrarProcesamiento(
            UUID eventoId,
            String tipoEvento) {

        int filas = jdbc.update("""
            INSERT INTO public.eventos_procesados (
                evento_id, tipo_evento
            )
            VALUES (?, ?)
            ON CONFLICT (evento_id) DO NOTHING
            """,
            eventoId,
            tipoEvento
        );

        return filas == 1;
    }
}