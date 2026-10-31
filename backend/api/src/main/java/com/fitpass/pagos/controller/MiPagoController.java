
package com.fitpass.pagos.controller;

import com.fitpass.pagos.service.PagoService;

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
@RequestMapping("/api/mi/pagos")
@PreAuthorize("hasRole('MIEMBRO')")
public class MiPagoController {

    private final PagoService pagoService;
    private final NamedParameterJdbcTemplate db;

    public MiPagoController(
            PagoService pagoService,
            NamedParameterJdbcTemplate db) {

        this.pagoService = pagoService;
        this.db = db;
    }

    private UUID obtenerClienteId(Jwt jwt) {

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
                "Identificador de usuario invalido"
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

        return clientes.get(0);
    }

    @GetMapping("/metodos")
    public List<Map<String, Object>> misMetodos(
            @AuthenticationPrincipal Jwt jwt) {

        UUID clienteId = obtenerClienteId(jwt);

        return pagoService.listarMetodos(clienteId);
    }

    @GetMapping("/historial")
    public List<Map<String, Object>> miHistorial(
            @AuthenticationPrincipal Jwt jwt) {

        UUID clienteId = obtenerClienteId(jwt);

        return pagoService.historial(clienteId);
    }
    
@GetMapping("/periodos")
public List<Map<String, Object>> misPeriodos(
        @AuthenticationPrincipal Jwt jwt) {

    UUID clienteId = obtenerClienteId(jwt);

    return pagoService.listarPeriodosPorCliente(clienteId);
}

}
