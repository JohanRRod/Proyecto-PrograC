package com.fitpass.reservas.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Obtiene el cliente que corresponde al miembro que inició sesión. */
@Component
public class ClienteActual {

    private final NamedParameterJdbcTemplate db;

    public ClienteActual(NamedParameterJdbcTemplate db) {
        this.db = db;
    }

    public UUID de(Jwt jwt) {
        if (jwt == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }

        UUID usuarioId;
        try {
            usuarioId = UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identificador de usuario invalido");
        }

        List<UUID> clientes = db.queryForList("""
            SELECT cliente_id
            FROM public.perfiles_usuario
            WHERE usuario_id = :usuarioId
              AND rol = 'MIEMBRO'
              AND activo = true
              AND cliente_id IS NOT NULL
            """, Map.of("usuarioId", usuarioId), UUID.class);

        if (clientes.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Miembro sin cliente asociado");
        }
        return clientes.get(0);
    }
}
