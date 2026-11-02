package com.fitpass.auditoria;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Map;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

/**
 * Registra en logs_sistema cada operación que cambia datos (y las exportaciones de reportes):
 * quién la hizo, desde qué IP, qué registro tocó, cómo estaba antes, cómo quedó y si falló.
 * Corre después de Spring Security, así que ya conoce al usuario del token.
 * Si guardar la bitácora falla, la operación del usuario no se ve afectada.
 */
@Component
public class AuditoriaFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(AuditoriaFilter.class);

    /** Más allá de esto no se guarda el cuerpo (evita llenar la tabla con archivos o textos enormes). */
    private static final int MAX_BYTES = 20_000;

    /** Campos que nunca se guardan tal cual. */
    private static final Pattern SENSIBLE = Pattern.compile("(?i).*(password|contrasena|token|secret|clave|api_?key|embedding).*");

    private final AuditoriaRepository repositorio;
    private final ObjectMapper json;

    public AuditoriaFilter(AuditoriaRepository repositorio, ObjectMapper json) {
        this.repositorio = repositorio;
        this.json = json;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return RutaAuditada.resolver(request.getMethod(), request.getRequestURI()) == null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        RutaAuditada ruta = RutaAuditada.resolver(request.getMethod(), request.getRequestURI());
        String antes = null;
        if (ruta.consultarAntes()) {
            try {
                antes = repositorio.instantanea(ruta.tabla(), ruta.registroId());
            } catch (Exception e) {
                log.warn("Bitácora: no se pudo leer el estado anterior de {} {}", ruta.tabla(), ruta.registroId(), e);
            }
        }

        ContentCachingRequestWrapper peticion = new ContentCachingRequestWrapper(request, MAX_BYTES);
        ContentCachingResponseWrapper respuesta = new ContentCachingResponseWrapper(response);
        RuntimeException fallo = null;

        try {
            chain.doFilter(peticion, respuesta);
        } catch (RuntimeException e) {
            fallo = e;
            throw e;
        } finally {
            try {
                registrar(ruta, peticion, respuesta, antes, fallo);
            } catch (Exception e) {
                log.warn("Bitácora: no se pudo registrar {} {}", request.getMethod(), request.getRequestURI(), e);
            }
            respuesta.copyBodyToResponse();
        }
    }

    private void registrar(RutaAuditada ruta, ContentCachingRequestWrapper peticion,
                           ContentCachingResponseWrapper respuesta, String antes, RuntimeException fallo) {

        int estado = fallo != null ? 500 : respuesta.getStatus();
        boolean exitoso = estado < 400;
        boolean esArchivo = "EXPORTAR".equals(ruta.accion());

        JsonNode cuerpoPeticion = leer(peticion.getContentAsByteArray(), peticion.getContentType());
        JsonNode cuerpoRespuesta = esArchivo ? null : leer(respuesta.getContentAsByteArray(), respuesta.getContentType());

        String registroId = ruta.registroId();
        if (registroId == null && cuerpoRespuesta != null && cuerpoRespuesta.hasNonNull("id")) {
            registroId = cuerpoRespuesta.get("id").asText();
        }
        if (registroId == null && cuerpoRespuesta != null && cuerpoRespuesta.hasNonNull("clienteId")) {
            registroId = cuerpoRespuesta.get("clienteId").asText();
        }

        // Después del cambio: la fila como quedó en la base; si no aplica, lo que devolvió
        // el servidor; y si no devolvió nada, lo que se envió.
        JsonNode despues = null;
        if (exitoso && ruta.consultarAntes()) {
            try {
                String fila = repositorio.instantanea(ruta.tabla(), ruta.registroId());
                despues = fila == null ? null : leerTexto(fila);
            } catch (Exception e) {
                log.warn("Bitácora: no se pudo leer el estado nuevo de {} {}", ruta.tabla(), ruta.registroId(), e);
            }
        }
        if (despues == null) {
            despues = exitoso && cuerpoRespuesta != null && cuerpoRespuesta.isObject() ? cuerpoRespuesta : cuerpoPeticion;
        }

        String error = null;
        if (!exitoso) {
            if (cuerpoRespuesta != null && cuerpoRespuesta.hasNonNull("mensaje")) {
                error = cuerpoRespuesta.get("mensaje").asText();
            } else if (fallo != null) {
                error = fallo.getClass().getSimpleName();
            } else {
                error = "HTTP " + estado;
            }
            error = recortar(error, 500);
        }

        repositorio.registrar(
                usuarioActual(),
                ruta,
                recortar(registroId, 100),
                aTexto(ocultar(antes == null ? null : leerTexto(antes))),
                aTexto(ocultar(despues)),
                ip(peticion),
                exitoso,
                error);
    }

    // ---------- Auxiliares ----------

    private static String usuarioActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwt) {
            String email = jwt.getToken().getClaimAsString("email");
            return recortar(email != null ? email : jwt.getToken().getSubject(), 100);
        }
        return "anónimo";
    }

    /** La IP real del visitante: Cloudflare la manda en CF-Connecting-IP y nginx en X-Forwarded-For. */
    private static String ip(HttpServletRequest request) {
        String cf = request.getHeader("CF-Connecting-IP");
        if (cf != null && !cf.isBlank()) return recortar(cf.trim(), 45);
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return recortar(xff.split(",")[0].trim(), 45);
        return recortar(request.getRemoteAddr(), 45);
    }

    private JsonNode leer(byte[] bytes, String tipo) {
        if (bytes == null || bytes.length == 0 || bytes.length > MAX_BYTES) return null;
        if (tipo != null && !tipo.toLowerCase().contains("json")) return null;
        return leerTexto(new String(bytes, StandardCharsets.UTF_8));
    }

    private JsonNode leerTexto(String texto) {
        try {
            JsonNode nodo = json.readTree(texto);
            return nodo != null && (nodo.isObject() || nodo.isArray()) ? nodo : null;
        } catch (Exception e) {
            return null;
        }
    }

    /** Reemplaza por "***" los campos sensibles, en cualquier nivel. */
    private static JsonNode ocultar(JsonNode nodo) {
        if (nodo == null) return null;
        if (nodo.isObject()) {
            ObjectNode obj = (ObjectNode) nodo;
            Iterator<Map.Entry<String, JsonNode>> campos = obj.fields();
            while (campos.hasNext()) {
                Map.Entry<String, JsonNode> campo = campos.next();
                if (SENSIBLE.matcher(campo.getKey()).matches()) {
                    campo.setValue(obj.textNode("***"));
                } else {
                    ocultar(campo.getValue());
                }
            }
        } else if (nodo.isArray()) {
            nodo.forEach(AuditoriaFilter::ocultar);
        }
        return nodo;
    }

    private String aTexto(JsonNode nodo) {
        if (nodo == null) return null;
        try {
            return json.writeValueAsString(nodo);
        } catch (Exception e) {
            return null;
        }
    }

    private static String recortar(String texto, int max) {
        if (texto == null) return null;
        return texto.length() <= max ? texto : texto.substring(0, max);
    }
}
