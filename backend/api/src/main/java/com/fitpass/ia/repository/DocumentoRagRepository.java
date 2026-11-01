package com.fitpass.ia.repository;

import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Acceso a documentos_rag. Los vectores viajan como texto "[0.1,0.2,...]" y se convierten
 * con CAST(? AS vector) (extensión pgvector). La búsqueda usa distancia coseno (<=>).
 */
@Repository
public class DocumentoRagRepository {

    public record Fragmento(long id, String titulo, String categoria, String contenido, String seccion, double similitud) {}

    private final JdbcTemplate jdbc;

    public DocumentoRagRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public int borrarPorArchivo(String archivo) {
        return jdbc.update("DELETE FROM public.documentos_rag WHERE metadatos->>'archivo' = ?", archivo);
    }

    public void insertar(String titulo, String categoria, String contenido, String metadatosJson, float[] embedding) {
        jdbc.update("""
                INSERT INTO public.documentos_rag (titulo_documento, categoria, contenido_texto, metadatos, embedding)
                VALUES (?, ?, ?, CAST(? AS jsonb), CAST(? AS vector))
                """,
                titulo, categoria, contenido, metadatosJson, aTexto(embedding));
    }

    public List<Fragmento> buscarSimilares(float[] consulta, int limite, double similitudMinima) {
        String vector = aTexto(consulta);
        return jdbc.query("""
                SELECT id, titulo_documento, categoria, contenido_texto,
                       metadatos->>'seccion' AS seccion,
                       1 - (embedding <=> CAST(? AS vector)) AS similitud
                FROM public.documentos_rag
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> CAST(? AS vector)
                LIMIT ?
                """,
                (rs, i) -> new Fragmento(
                        rs.getLong("id"),
                        rs.getString("titulo_documento"),
                        rs.getString("categoria"),
                        rs.getString("contenido_texto"),
                        rs.getString("seccion"),
                        rs.getDouble("similitud")),
                vector, vector, limite)
                .stream()
                .filter(f -> f.similitud() >= similitudMinima)
                .toList();
    }

    public List<Map<String, Object>> resumenPorArchivo() {
        return jdbc.queryForList("""
                SELECT metadatos->>'archivo' AS archivo,
                       MIN(titulo_documento) AS titulo,
                       MIN(categoria) AS categoria,
                       COUNT(*) AS fragmentos,
                       MAX(created_at) AS ingerido
                FROM public.documentos_rag
                GROUP BY metadatos->>'archivo'
                ORDER BY archivo
                """);
    }

    private static String aTexto(float[] v) {
        StringBuilder sb = new StringBuilder(v.length * 10).append('[');
        for (int i = 0; i < v.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(v[i]);
        }
        return sb.append(']').toString();
    }
}
