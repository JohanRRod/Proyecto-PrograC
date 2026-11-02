
package com.fitpass.config;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.core.env.Environment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.client.RestTemplate;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final NamedParameterJdbcTemplate db;
    private final Environment environment;

    @Value("${fitpass.security.supabase-url}")
    private String supabaseUrl;

    @Value("${fitpass.security.supabase-publishable-key}")
    private String supabasePublishableKey;

    public SecurityConfig(
            NamedParameterJdbcTemplate db,
            Environment environment) {

        this.db = db;
        this.environment = environment;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

                boolean perfilDev = java.util.Arrays.asList(
    environment.getActiveProfiles()
).contains("dev");

        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth

                .requestMatchers("/api/reportes/**").hasRole("ADMIN")
                .requestMatchers("/api/bitacora", "/api/bitacora/**").hasRole("ADMIN")

                .requestMatchers("/api/amenidades", "/api/amenidades/**")
    .hasRole("ADMIN")
.requestMatchers("/api/sucursales/*/amenidades",
                 "/api/sucursales/*/amenidades/**")
    .hasRole("ADMIN")
                .requestMatchers("/api/clases", "/api/clases/**")
    .hasRole("ADMIN")
.requestMatchers("/api/reservas", "/api/reservas/**")
    .hasRole("ADMIN")
                .requestMatchers("/api/instructores", "/api/instructores/**")
    .hasRole("ADMIN")

                // Catalogo publico
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/catalogo/**"
                ).permitAll()

                // Asistente de IA: el chat es publico; ingesta y documentos solo ADMIN
                .requestMatchers(HttpMethod.POST, "/api/ia/chat").permitAll()
                .requestMatchers("/api/ia/**").hasRole("ADMIN")

                // Bloquear endpoints de desarrollo
               .requestMatchers("/api/dev/**")
    .access((authentication, context) -> {

        boolean esAdmin = authentication.get()
            .getAuthorities()
            .stream()
            .anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority())
            );

        boolean permitido = perfilDev && esAdmin;

        return new org.springframework.security.authorization.AuthorizationDecision(
            permitido
        );
    })

                
                // Membresias del usuario autenticado
.requestMatchers(
    HttpMethod.GET,
    "/api/mi/membresias"
).hasRole("MIEMBRO")


// Clases y reservas del usuario autenticado
.requestMatchers(
    "/api/mi/clases",
    "/api/mi/reservas",
    "/api/mi/reservas/**"
).hasRole("MIEMBRO")

// Pagos del usuario autenticado
.requestMatchers(
    HttpMethod.GET,
    "/api/mi/pagos/metodos",
    "/api/mi/pagos/historial",
    "/api/mi/pagos/periodos"
).hasRole("MIEMBRO")

    // Administracion
                .requestMatchers(
                    "/api/planes/**",
                    "/api/sucursales/**",
                    "/api/clientes/**",
                    "/api/pagos/**",
                    "/api/accesos/**",
                    "/api/membresias/**"
                ).hasRole("ADMIN")

                // Mensajeria interna
                .requestMatchers(
                    "/api/mensajeria/**"
                ).hasRole("ADMIN")

                // Invitaciones
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/auth/miembros/invitar"
                ).hasRole("ADMIN")

                // Perfil autenticado
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/auth/me"
                ).hasAnyRole("ADMIN", "MIEMBRO")

                // Bloquear otras rutas de autenticacion
                .requestMatchers("/api/auth/**").denyAll()

                // Permitir que Spring muestre los errores de la API
.dispatcherTypeMatchers(
    jakarta.servlet.DispatcherType.ERROR
).permitAll()

                // Denegar rutas no declaradas
                .anyRequest().denyAll()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(
                        jwtAuthenticationConverter()
                    )
                )
            );

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {

        String issuer = supabaseUrl.replaceAll("/+$", "")
                + "/auth/v1";

        String jwksUri = issuer + "/.well-known/jwks.json";

        RestTemplate restTemplate = new RestTemplate();

        restTemplate.getInterceptors().add(
            (request, body, execution) -> {

                request.getHeaders().set(
                    "apikey",
                    supabasePublishableKey
                );

                return execution.execute(request, body);
            }
        );

        NimbusJwtDecoder decoder = NimbusJwtDecoder
            .withJwkSetUri(jwksUri)
            .restOperations(restTemplate)
            .jwsAlgorithm(SignatureAlgorithm.ES256)
            .jwsAlgorithm(SignatureAlgorithm.RS256)
            .build();

        OAuth2TokenValidator<Jwt> issuerValidator =
            JwtValidators.createDefaultWithIssuer(issuer);

        OAuth2TokenValidator<Jwt> audienceValidator = jwt -> {

            if (jwt.getAudience().contains("authenticated")) {
                return OAuth2TokenValidatorResult.success();
            }

            return OAuth2TokenValidatorResult.failure(
                new OAuth2Error(
                    "invalid_token",
                    "Audiencia JWT no permitida",
                    null
                )
            );
        };

        decoder.setJwtValidator(
            new DelegatingOAuth2TokenValidator<>(
                issuerValidator,
                audienceValidator
            )
        );

        return decoder;
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {

        JwtAuthenticationConverter converter =
            new JwtAuthenticationConverter();

        converter.setJwtGrantedAuthoritiesConverter(jwt -> {

            // Solo tokens de usuarios autenticados
            if (!"authenticated".equals(
                    jwt.getClaimAsString("role"))) {
                return List.of();
            }

            UUID usuarioId;

            try {
                usuarioId = UUID.fromString(jwt.getSubject());
            } catch (Exception e) {
                return List.of();
            }

            List<String> roles = db.queryForList("""
                SELECT rol
                FROM public.perfiles_usuario
                WHERE usuario_id = :usuarioId
                  AND activo = true
                """,
                Map.of("usuarioId", usuarioId),
                String.class
            );

            if (roles.isEmpty()) {
                return List.of();
            }

            String rol = roles.get(0);

            if (!"ADMIN".equals(rol)
                    && !"MIEMBRO".equals(rol)) {
                return List.of();
            }

            return List.of(
                new SimpleGrantedAuthority("ROLE_" + rol)
            );
        });

        return converter;
    }
}
