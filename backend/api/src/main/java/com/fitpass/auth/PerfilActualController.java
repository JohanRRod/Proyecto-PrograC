package com.fitpass.auth;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class PerfilActualController {

    private final NamedParameterJdbcTemplate db;

    public PerfilActualController(NamedParameterJdbcTemplate db) {
        this.db = db;
    }

    public record PerfilActualResponse(
        UUID usuarioId,
        UUID clienteId,
        String rol
    ) {}

    @GetMapping("/me")
    public PerfilActualResponse obtenerPerfil(
            @AuthenticationPrincipal Jwt jwt) {

        if (jwt == null) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "No autenticado"
            );
        }

        UUID usuarioId;

        try {
            usuarioId = UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Identificador de usuario inválido"
            );
        }

        List<Map<String, Object>> resultados = db.queryForList("""
            SELECT usuario_id, cliente_id, rol
            FROM public.perfiles_usuario
            WHERE usuario_id = :usuarioId
              AND activo = true
            """,
            Map.of("usuarioId", usuarioId)
        );

        if (resultados.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Usuario sin perfil activo"
            );
        }

        Map<String, Object> perfil = resultados.get(0);

        return new PerfilActualResponse(
            usuarioId,
            (UUID) perfil.get("cliente_id"),
            (String) perfil.get("rol")
        );
    }
}