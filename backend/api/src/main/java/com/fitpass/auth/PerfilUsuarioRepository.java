package com.fitpass.auth;

import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PerfilUsuarioRepository {

    private final NamedParameterJdbcTemplate db;

    public PerfilUsuarioRepository(NamedParameterJdbcTemplate db) {
        this.db = db;
    }

    public boolean clienteTieneCuenta(UUID clienteId) {
        Integer cantidad = db.queryForObject("""
            SELECT COUNT(*)
            FROM public.perfiles_usuario
            WHERE cliente_id = :clienteId
            """,
            Map.of("clienteId", clienteId),
            Integer.class
        );

        return cantidad != null && cantidad > 0;
    }

    public boolean usuarioTienePerfil(UUID usuarioId) {
        Integer cantidad = db.queryForObject("""
            SELECT COUNT(*)
            FROM public.perfiles_usuario
            WHERE usuario_id = :usuarioId
            """,
            Map.of("usuarioId", usuarioId),
            Integer.class
        );

        return cantidad != null && cantidad > 0;
    }

    public void crearPerfilMiembro(UUID usuarioId, UUID clienteId) {
        db.update("""
            INSERT INTO public.perfiles_usuario
                (usuario_id, rol, cliente_id, activo)
            VALUES
                (:usuarioId, 'MIEMBRO', :clienteId, true)
            """,
            Map.of(
                "usuarioId", usuarioId,
                "clienteId", clienteId
            )
        );
    }
}