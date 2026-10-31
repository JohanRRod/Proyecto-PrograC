
package com.fitpass.membresias.controller;

import com.fitpass.membresias.dto.MembresiaResponse;
import com.fitpass.membresias.service.MembresiaService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/mi/membresias")
public class MiMembresiaController {

    private final MembresiaService membresiaService;
    private final NamedParameterJdbcTemplate db;

    public MiMembresiaController(
            MembresiaService membresiaService,
            NamedParameterJdbcTemplate db) {

        this.membresiaService = membresiaService;
        this.db = db;
    }

    @GetMapping
    @PreAuthorize("hasRole('MIEMBRO')")
    public List<MembresiaResponse> listarMisMembresias(
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

        List<UUID> clientes = db.queryForList("""
            SELECT cliente_id
            FROM public.perfiles_usuario
            WHERE usuario_id = :usuarioId
              AND rol = 'MIEMBRO'
              AND activo = true
              AND cliente_id IS NOT NULL
            """,
            Map.of("usuarioId", usuarioId),
            UUID.class
        );

        if (clientes.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Miembro sin cliente asociado"
            );
        }

        UUID clienteId = clientes.get(0);

        return membresiaService.listarPorCliente(clienteId)
                .stream()
                .map(MembresiaResponse::new)
                .toList();
    }
}
