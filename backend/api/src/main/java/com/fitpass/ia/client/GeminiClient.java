package com.fitpass.ia.client;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Cliente HTTP mínimo para la API de Gemini (Google AI Studio).
 * Solo expone lo que usa el agente: generar texto y generar embeddings.
 */
@Component
public class GeminiClient {

    public enum TipoEmbedding { RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY }

    public record Generacion(String texto, int tokens) {}

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    private final RestClient http;
    private final String apiKey;
    private final String modeloChat;
    private final String modeloEmbedding;
    private final int dimensiones;
    private final int presupuestoRazonamiento;

    public GeminiClient(
            @Value("${fitpass.ia.api-key:}") String apiKey,
            @Value("${fitpass.ia.modelo-chat:gemini-3.5-flash-lite}") String modeloChat,
            @Value("${fitpass.ia.modelo-embedding:gemini-embedding-001}") String modeloEmbedding,
            @Value("${fitpass.ia.dimensiones:1536}") int dimensiones,
            @Value("${fitpass.ia.thinking-budget:-1}") int presupuestoRazonamiento,
            @Value("${fitpass.ia.timeout-segundos:45}") int timeoutSegundos) {

        SimpleClientHttpRequestFactory tiempos = new SimpleClientHttpRequestFactory();
        tiempos.setConnectTimeout(10_000);
        tiempos.setReadTimeout(timeoutSegundos * 1000);

        this.http = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta")
                .requestFactory(tiempos)
                .build();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.modeloChat = modeloChat;
        this.modeloEmbedding = modeloEmbedding;
        this.dimensiones = dimensiones;
        this.presupuestoRazonamiento = presupuestoRazonamiento;
    }

    public boolean configurado() {
        return !apiKey.isEmpty();
    }

    public int dimensiones() {
        return dimensiones;
    }

    /** Genera una respuesta con instrucciones de sistema y un único mensaje de usuario. */
    public Generacion generar(String instrucciones, String mensaje) {
        Map<String, Object> configuracion = new java.util.HashMap<>();
        configuracion.put("temperature", 0.3);
        configuracion.put("maxOutputTokens", 1024);
        // Opcional: limita el "razonamiento" en los modelos que lo soportan. Con -1 (por defecto) no se envía.
        if (presupuestoRazonamiento >= 0) {
            configuracion.put("thinkingConfig", Map.of("thinkingBudget", presupuestoRazonamiento));
        }

        Map<String, Object> cuerpo = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", instrucciones))),
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", mensaje)))),
                "generationConfig", configuracion);

        JsonNode r = enviar("/models/" + modeloChat + ":generateContent", cuerpo);

        StringBuilder texto = new StringBuilder();
        for (JsonNode parte : r.path("candidates").path(0).path("content").path("parts")) {
            texto.append(parte.path("text").asText(""));
        }
        if (texto.isEmpty()) {
            String motivo = r.path("candidates").path(0).path("finishReason").asText("SIN_RESPUESTA");
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "El asistente no pudo generar una respuesta (" + motivo + ").");
        }
        return new Generacion(texto.toString().trim(), r.path("usageMetadata").path("totalTokenCount").asInt(0));
    }

    /**
     * Embedding normalizado (norma 1). Con dimensiones menores a 3072, Google recomienda
     * normalizar para que la similitud coseno sea correcta.
     */
    public float[] embedding(String texto, TipoEmbedding tipo, String titulo) {
        Map<String, Object> cuerpo = new java.util.HashMap<>();
        cuerpo.put("model", "models/" + modeloEmbedding);
        cuerpo.put("content", Map.of("parts", List.of(Map.of("text", texto))));
        cuerpo.put("taskType", tipo.name());
        cuerpo.put("outputDimensionality", dimensiones);
        if (titulo != null && tipo == TipoEmbedding.RETRIEVAL_DOCUMENT) {
            cuerpo.put("title", titulo);
        }

        JsonNode valores = enviar("/models/" + modeloEmbedding + ":embedContent", cuerpo)
                .path("embedding").path("values");

        List<Float> lista = new ArrayList<>(valores.size());
        valores.forEach(v -> lista.add((float) v.asDouble()));
        if (lista.size() != dimensiones) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Gemini devolvió un embedding de " + lista.size() + " dimensiones; se esperaban " + dimensiones + ".");
        }

        double norma = 0;
        for (float f : lista) norma += f * f;
        norma = Math.sqrt(norma);

        float[] vector = new float[lista.size()];
        for (int i = 0; i < vector.length; i++) {
            vector[i] = norma > 0 ? (float) (lista.get(i) / norma) : 0f;
        }
        return vector;
    }

    /** Errores temporales de Google (sobrecarga): se reintenta con espera creciente. */
    private static final int REINTENTOS = 2;

    private JsonNode enviar(String ruta, Map<String, Object> cuerpo) {
        if (!configurado()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El asistente no está configurado en este servidor.");
        }
        for (int intento = 0; ; intento++) {
            try {
                return enviarUnaVez(ruta, cuerpo);
            } catch (HttpStatusCodeException ex) {
                int codigo = ex.getStatusCode().value();
                boolean temporal = codigo == 500 || codigo == 503;
                if (!temporal || intento >= REINTENTOS) throw traducir(ex);
                esperar(800L * (intento + 1));
            }
        }
    }

    private static void esperar(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }

    private JsonNode enviarUnaVez(String ruta, Map<String, Object> cuerpo) {
        try {
            return http.post()
                    .uri(ruta)
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(cuerpo)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (HttpStatusCodeException ex) {
            // Se registra el detalle de Google solo en el servidor; al usuario le llega un mensaje genérico.
            String detalle = ex.getResponseBodyAsString();
            log.warn("Gemini respondió {} en {}: {}", ex.getStatusCode().value(), ruta,
                    detalle.length() > 500 ? detalle.substring(0, 500) : detalle);
            throw ex;
        } catch (RestClientException ex) {
            // Incluye tiempos de espera agotados al leer la respuesta y errores de red.
            log.warn("Fallo de comunicación con Gemini en {}: {}", ruta, ex.getMessage());
            throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT,
                    "El asistente tardó demasiado en responder. Intenta de nuevo en unos segundos.");
        }
    }

    private static ResponseStatusException traducir(HttpStatusCodeException ex) {
        int codigo = ex.getStatusCode().value();
        if (codigo == 429) {
            return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El asistente recibió demasiadas consultas. Intenta de nuevo en un minuto.");
        }
        if (codigo == 400 || codigo == 401 || codigo == 403) {
            // No se reenvía el cuerpo de Google al usuario: puede describir la configuración interna.
            return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El asistente no está disponible por un problema de configuración (Gemini " + codigo + ").");
        }
        if (codigo == 503 || codigo == 500) {
            return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El servicio de IA está saturado en este momento. Intenta de nuevo en unos segundos.");
        }
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "El servicio de IA respondió con un error (" + codigo + ").");
    }
}
