package com.fitpass.ia.client;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Cliente HTTP para generación de texto, streaming y embeddings de Gemini. */
@Component
public class GeminiClient {

    public enum TipoEmbedding { RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY }

    public record Generacion(String texto, int tokens, int tokensEntrada, int tokensSalida) {
        // Compatibilidad con llamadas anteriores que construyan Generacion con dos argumentos.
        public Generacion(String texto, int tokens) {
            this(texto, tokens, 0, 0);
        }
    }

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final int REINTENTOS = 2;

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

    private Map<String, Object> crearCuerpo(String instrucciones, String mensaje) {
        Map<String, Object> configuracion = new HashMap<>();
        configuracion.put("temperature", 0.3);
        configuracion.put("maxOutputTokens", 1024);
        if (presupuestoRazonamiento >= 0) {
            configuracion.put("thinkingConfig", Map.of("thinkingBudget", presupuestoRazonamiento));
        }
        return Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", instrucciones))),
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", mensaje)))),
                "generationConfig", configuracion);
    }

    public Generacion generar(String instrucciones, String mensaje) {
        JsonNode respuesta = enviar("/models/" + modeloChat + ":generateContent",
                crearCuerpo(instrucciones, mensaje));

        StringBuilder texto = new StringBuilder();
        for (JsonNode parte : respuesta.path("candidates").path(0).path("content").path("parts")) {
            texto.append(parte.path("text").asText(""));
        }
        if (texto.isEmpty()) {
            String motivo = respuesta.path("candidates").path(0).path("finishReason")
                    .asText("SIN_RESPUESTA");
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "El asistente no pudo generar una respuesta (" + motivo + ").");
        }

        JsonNode uso = respuesta.path("usageMetadata");
        int tokensEntrada = uso.path("promptTokenCount").asInt(0);
        int tokensSalida = uso.path("candidatesTokenCount").asInt(0);
        int tokensTotales = uso.path("totalTokenCount").asInt(0);

        log.info("========== CONSUMO GEMINI ==========");
        log.info("Tokens de entrada: {}", tokensEntrada);
        log.info("Tokens de salida: {}", tokensSalida);
        log.info("Tokens totales: {}", tokensTotales);
        log.info("====================================");

        // Tarifas de ejemplo en USD por millón de tokens.
// Sustituir por las tarifas oficiales del modelo configurado.
double precioEntradaPorMillon = 0.10;
double precioSalidaPorMillon = 0.40;

double costoEntrada =
        (tokensEntrada / 1_000_000.0) * precioEntradaPorMillon;

double costoSalida =
        (tokensSalida / 1_000_000.0) * precioSalidaPorMillon;

double costoTotal = costoEntrada + costoSalida;

log.info("Costo estimado de entrada: USD {}", 
        String.format(java.util.Locale.US, "%.8f", costoEntrada));

log.info("Costo estimado de salida: USD {}", 
        String.format(java.util.Locale.US, "%.8f", costoSalida));

log.info("Costo total estimado: USD {}", 
        String.format(java.util.Locale.US, "%.8f", costoTotal));

        return new Generacion(texto.toString().trim(), tokensTotales, tokensEntrada, tokensSalida);
    }

    /** Conserva la interfaz de streaming que ya utiliza el proyecto. */
    public int generarPorPartes(String instrucciones, String mensaje, Consumer<String> alRecibir) {
        if (!configurado()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El asistente no está configurado en este servidor.");
        }

        return http.post()
                .uri("/models/" + modeloChat + ":streamGenerateContent?alt=sse")
                .header("x-goog-api-key", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .body(crearCuerpo(instrucciones, mensaje))
                .exchange((peticion, respuesta) -> {
                    if (respuesta.getStatusCode().isError()) {
                        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                                "El servicio de IA respondió con un error ("
                                        + respuesta.getStatusCode().value() + ").");
                    }

                    int tokens = 0;
                    int fragmentos = 0;
                    try (BufferedReader lector = new BufferedReader(
                            new InputStreamReader(respuesta.getBody(), StandardCharsets.UTF_8))) {
                        String linea;
                        while ((linea = lector.readLine()) != null) {
                            if (!linea.startsWith("data:")) continue;
                            String datos = linea.substring(5).trim();
                            if (datos.isEmpty() || "[DONE]".equals(datos)) continue;

                            JsonNode trozo = JSON.readTree(datos);
                            for (JsonNode parte : trozo.path("candidates").path(0)
                                    .path("content").path("parts")) {
                                String fragmento = parte.path("text").asText("");
                                if (!fragmento.isEmpty()) {
                                    fragmentos++;
                                    log.info("Fragmento recibido de Gemini: {} caracteres", fragmento.length());
                                    alRecibir.accept(fragmento);
                                }
                            }
                            tokens = trozo.path("usageMetadata").path("totalTokenCount").asInt(tokens);
                        }
                    }
                    log.info("Streaming Gemini finalizado: {} fragmentos, {} tokens", fragmentos, tokens);
                    return tokens;
                });
    }

    /** Compatibilidad con el nombre usado en versiones anteriores del controlador. */
    public void generarStreaming(String instrucciones, String mensaje, Consumer<String> alRecibir) {
        generarPorPartes(instrucciones, mensaje, alRecibir);
    }

    /** Embedding normalizado para similitud coseno. */
    public float[] embedding(String texto, TipoEmbedding tipo, String titulo) {
        Map<String, Object> cuerpo = new HashMap<>();
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
                    "Gemini devolvió un embedding de " + lista.size()
                            + " dimensiones; se esperaban " + dimensiones + ".");
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
            String detalle = ex.getResponseBodyAsString();
            log.warn("Gemini respondió {} en {}: {}", ex.getStatusCode().value(), ruta,
                    detalle.length() > 500 ? detalle.substring(0, 500) : detalle);
            throw ex;
        } catch (RestClientException ex) {
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
