package com.fitpass.ia.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitpass.ia.client.GeminiClient;
import com.fitpass.ia.client.GeminiClient.TipoEmbedding;
import com.fitpass.ia.dto.IngestaResponse;
import com.fitpass.ia.repository.DocumentoRagRepository;

/**
 * Ingesta del RAG: lee resources/rag/*.md, fragmenta, genera embeddings y guarda en documentos_rag.
 * Es idempotente: reemplaza los fragmentos previos de cada archivo dentro de una transacción.
 */
@Service
public class IngestaService {

    private static final String PATRON = "classpath:rag/*.md";

    private final GeminiClient gemini;
    private final FragmentadorMarkdown fragmentador;
    private final DocumentoRagRepository documentos;
    private final TransactionTemplate transaccion;
    private final ObjectMapper json;

    public IngestaService(GeminiClient gemini, FragmentadorMarkdown fragmentador,
                          DocumentoRagRepository documentos, TransactionTemplate transaccion,
                          ObjectMapper json) {
        this.gemini = gemini;
        this.fragmentador = fragmentador;
        this.documentos = documentos;
        this.transaccion = transaccion;
        this.json = json;
    }

    public IngestaResponse ingerirTodo() {
        Resource[] recursos;
        try {
            recursos = new PathMatchingResourcePatternResolver().getResources(PATRON);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudieron leer los documentos del RAG");
        }
        if (recursos.length == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No hay documentos en resources/rag");
        }

        List<IngestaResponse.Archivo> resultado = new ArrayList<>();
        int total = 0;

        for (Resource recurso : Arrays.stream(recursos)
                .sorted(Comparator.comparing(Resource::getFilename)).toList()) {
            final String archivo = recurso.getFilename();
            final FragmentadorMarkdown.Documento doc = leer(recurso, archivo);

            // Primero se generan todos los embeddings (llamadas externas), fuera de la transacción.
            List<float[]> vectores = new ArrayList<>();
            for (FragmentadorMarkdown.Fragmento f : doc.fragmentos()) {
                vectores.add(gemini.embedding(textoParaEmbedding(doc, f), TipoEmbedding.RETRIEVAL_DOCUMENT, doc.titulo()));
            }

            transaccion.executeWithoutResult(estado -> {
                documentos.borrarPorArchivo(archivo);
                for (int i = 0; i < doc.fragmentos().size(); i++) {
                    FragmentadorMarkdown.Fragmento f = doc.fragmentos().get(i);
                    documentos.insertar(doc.titulo(), doc.categoria(), f.texto(),
                            metadatos(archivo, f.seccion(), i), vectores.get(i));
                }
            });

            resultado.add(new IngestaResponse.Archivo(archivo, doc.titulo(), doc.fragmentos().size()));
            total += doc.fragmentos().size();
        }

        return new IngestaResponse(resultado.size(), total, resultado);
    }

    private FragmentadorMarkdown.Documento leer(Resource recurso, String archivo) {
        try {
            return fragmentador.procesar(recurso.getContentAsString(StandardCharsets.UTF_8), archivo);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo leer " + archivo);
        }
    }

    public List<Map<String, Object>> listar() {
        return documentos.resumenPorArchivo();
    }

    /** El título y la sección ayudan a que el embedding capture de qué trata el fragmento. */
    private static String textoParaEmbedding(FragmentadorMarkdown.Documento doc, FragmentadorMarkdown.Fragmento f) {
        return doc.titulo() + " — " + f.seccion() + "\n" + f.texto();
    }

    private String metadatos(String archivo, String seccion, int orden) {
        try {
            return json.writeValueAsString(Map.of("archivo", archivo, "seccion", seccion, "orden", orden));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
