package com.fitpass.ia.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

/**
 * Convierte un documento Markdown en fragmentos para el RAG.
 *
 * Formato esperado:
 *   ---
 *   titulo: ...
 *   categoria: ...
 *   ---
 *   ## Sección
 *   texto...
 *
 * Cada sección "##" es un fragmento; si una sección supera el máximo se parte por párrafos.
 */
@Component
public class FragmentadorMarkdown {

    static final int MAX_CARACTERES = 1200;

    public record Documento(String titulo, String categoria, List<Fragmento> fragmentos) {}

    public record Fragmento(String seccion, String texto) {}

    public Documento procesar(String markdown, String nombreArchivo) {
        String texto = markdown.replace("\r\n", "\n").strip();
        Map<String, String> meta = new LinkedHashMap<>();

        if (texto.startsWith("---")) {
            int fin = texto.indexOf("\n---", 3);
            if (fin > 0) {
                for (String linea : texto.substring(3, fin).split("\n")) {
                    int i = linea.indexOf(':');
                    if (i > 0) meta.put(linea.substring(0, i).trim().toLowerCase(), linea.substring(i + 1).trim());
                }
                texto = texto.substring(fin + 4).strip();
            }
        }

        String titulo = meta.getOrDefault("titulo", nombreArchivo);
        String categoria = meta.getOrDefault("categoria", "General");

        List<Fragmento> fragmentos = new ArrayList<>();
        String seccion = "Introducción";
        StringBuilder actual = new StringBuilder();

        for (String linea : texto.split("\n")) {
            if (linea.startsWith("## ")) {
                agregar(fragmentos, seccion, actual.toString());
                seccion = linea.substring(3).trim();
                actual.setLength(0);
            } else if (!linea.startsWith("# ")) {
                actual.append(linea).append('\n');
            }
        }
        agregar(fragmentos, seccion, actual.toString());

        return new Documento(titulo, categoria, fragmentos);
    }

    private void agregar(List<Fragmento> destino, String seccion, String contenido) {
        String limpio = contenido.strip();
        if (limpio.isEmpty()) return;

        if (limpio.length() <= MAX_CARACTERES) {
            destino.add(new Fragmento(seccion, limpio));
            return;
        }

        // Sección larga: se agrupan párrafos completos sin pasar el máximo.
        StringBuilder bloque = new StringBuilder();
        for (String parrafo : limpio.split("\n\\s*\n")) {
            if (bloque.length() > 0 && bloque.length() + parrafo.length() + 2 > MAX_CARACTERES) {
                destino.add(new Fragmento(seccion, bloque.toString().strip()));
                bloque.setLength(0);
            }
            bloque.append(parrafo.strip()).append("\n\n");
        }
        if (bloque.length() > 0) destino.add(new Fragmento(seccion, bloque.toString().strip()));
    }
}
