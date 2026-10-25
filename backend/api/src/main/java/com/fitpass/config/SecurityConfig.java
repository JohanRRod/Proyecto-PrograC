package com.fitpass.config;


import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestTemplate;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;

import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final NamedParameterJdbcTemplate db;

    @Value("${fitpass.security.supabase-url}")
    private String supabaseUrl;
    private String supabasePublishableKey;

    public SecurityConfig(NamedParameterJdbcTemplate db) {
        this.db = db;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth

                // Catalogo publico
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/catalogo/**"
                ).permitAll()

                // Endpoints de desarrollo:
                // no permitir acceso desde la API normal
                .requestMatchers("/api/dev/**").denyAll()

                // Administracion
                .requestMatchers(
                    "/api/planes/**",
                    "/api/sucursales/**",
                    "/api/clientes/**",
                    "/api/pagos/**"
                ).hasRole("ADMIN")

                // Por ahora, restringimos los accesos
                // y membresias a administradores
                .requestMatchers(
                    "/api/accesos/**",
                    "/api/membresias/**"
                ).hasRole("ADMIN")
                

                .requestMatchers(
    HttpMethod.POST,
    "/api/auth/miembros/invitar"
).hasRole("ADMIN")

.requestMatchers(HttpMethod.GET, "/api/auth/me")
.hasAnyRole("ADMIN", "MIEMBRO")


.requestMatchers("/api/auth/**").denyAll()

                // Cualquier otra ruta requiere autenticacion
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            );

        return http.build();
    }

@Bean
public JwtDecoder jwtDecoder() {

    String issuer = supabaseUrl.replaceAll("/+$", "")
            + "/auth/v1";

    String jwksUri = issuer + "/.well-known/jwks.json";

    // Cliente HTTP que incluye la API Key publica de Supabase
    RestTemplate restTemplate = new RestTemplate();

    restTemplate.getInterceptors().add((request, body, execution) -> {

        request.getHeaders().set(
            "apikey",
            supabasePublishableKey
        );

        return execution.execute(request, body);
    });

    // Decodificador JWT
    NimbusJwtDecoder decoder = NimbusJwtDecoder
            .withJwkSetUri(jwksUri)
            .restOperations(restTemplate)
            .jwsAlgorithm(SignatureAlgorithm.ES256)
            .jwsAlgorithm(SignatureAlgorithm.RS256)
            .build();

    // Verificar emisor, expiracion y otras validaciones predeterminadas
    OAuth2TokenValidator<Jwt> validator =
            JwtValidators.createDefaultWithIssuer(issuer);

    decoder.setJwtValidator(validator);

    return decoder;
}

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {

        JwtAuthenticationConverter converter =
            new JwtAuthenticationConverter();

        converter.setJwtGrantedAuthoritiesConverter(jwt -> {

            // Solo tokens de usuario autenticado
            if (!"authenticated".equals(jwt.getClaimAsString("role"))) {
                return List.of();
            }

            UUID usuarioId;

            try {
                usuarioId = UUID.fromString(jwt.getSubject());
            } catch (Exception e) {
                return List.of();
            }

            String sql = """
                SELECT rol
                FROM public.perfiles_usuario
                WHERE usuario_id = :usuarioId
                  AND activo = true
                """;

            List<String> roles = db.queryForList(
                sql,
                Map.of("usuarioId", usuarioId),
                String.class
            );

            if (roles.isEmpty()) {
                return List.of();
            }

            String rol = roles.get(0);

            if (!"ADMIN".equals(rol) && !"MIEMBRO".equals(rol)) {
                return List.of();
            }

            return List.of(
                new SimpleGrantedAuthority("ROLE_" + rol)
            );
        });

        return converter;
    }
}