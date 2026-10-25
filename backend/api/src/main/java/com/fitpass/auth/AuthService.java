package com.fitpass.auth;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.client.ResourceAccessException;

@Service
public class AuthService {

    private final NamedParameterJdbcTemplate db;
    private final PerfilUsuarioRepository perfiles;
    private final RestTemplate http = new RestTemplate();

    @Value("${fitpass.security.supabase-url}")
    private String supabaseUrl;

    @Value("${fitpass.supabase.admin-key}")
    private String adminKey;

    @Value("${fitpass.supabase.redirect-url}")
    private String redirectUrl;

    public AuthService(
            NamedParameterJdbcTemplate db,
            PerfilUsuarioRepository perfiles) {
        this.db = db;
        this.perfiles = perfiles;
    }

    public record InvitacionResponse(
        UUID usuarioId,
        UUID clienteId,
        String estado
    ) {}

    public InvitacionResponse invitarMiembro(UUID clienteId) {

        List<Map<String, Object>> clientes = db.queryForList("""
            SELECT id, email, estado
            FROM public.clientes
            WHERE id = :id
            """,
            Map.of("id", clienteId)
        );

        if (clientes.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Cliente no encontrado"
            );
        }

        Map<String, Object> cliente = clientes.get(0);

        if (!"ACTIVO".equals(cliente.get("estado"))) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "El cliente no está activo"
            );
        }

        if (perfiles.clienteTieneCuenta(clienteId)) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "El cliente ya tiene una cuenta"
            );
        }

        String email = (String) cliente.get("email");

        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "El cliente no tiene correo electrónico"
            );
        }

        String url = supabaseUrl.replaceAll("/+$", "")
            + "/auth/v1/invite";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(adminKey);
        headers.set("apikey", adminKey);

        Map<String, Object> body = Map.of(
            "email", email,
            "data", Map.of("origen", "FITPASS")
        );

        URI uri = org.springframework.web.util.UriComponentsBuilder
            .fromHttpUrl(url)
            .queryParam("redirect_to", redirectUrl)
            .build()
            .encode()
            .toUri();

        ResponseEntity<Map> respuesta;

        try {
            respuesta = http.exchange(
                uri,
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
            );
        } catch (RestClientResponseException ex) {
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Supabase no pudo procesar la invitación"
            );
        }

        Map<?, ?> datos = respuesta.getBody();

        if (datos == null || datos.get("id") == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Supabase no devolvió el usuario"
            );
        }

        UUID usuarioId = UUID.fromString(
            datos.get("id").toString()
        );

        if (perfiles.usuarioTienePerfil(usuarioId)) {
    throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "El usuario ya tiene un perfil registrado"
    );
}

try {
    perfiles.crearPerfilMiembro(usuarioId, clienteId);
} catch (DataIntegrityViolationException ex) {
    throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "No se pudo vincular el usuario. Verifica si ya existe un perfil."
    );
}

return new InvitacionResponse(
    usuarioId,
    clienteId,
    "INVITACION_SOLICITADA"
);
}

}