package com.fitpass.auditoria;

import com.fitpass.auditoria.dto.BitacoraDetalle;
import com.fitpass.auditoria.dto.BitacoraFila;
import com.fitpass.auditoria.dto.BitacoraFiltros;
import com.fitpass.auditoria.dto.LogAgenteFila;
import com.fitpass.auditoria.dto.Pagina;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AuditoriaRepository {

    /** Tablas de las que se puede tomar una "foto" antes del cambio (nombres fijos, nunca del usuario). */
    private static final Set<String> TABLAS_CON_ID = Set.of(
            "clientes", "membresias", "sucursales", "planes", "amenidades",
            "clases_grupales", "instructores", "reservas_clases");

    private final NamedParameterJdbcTemplate db;
    private final ObjectMapper json;

    public AuditoriaRepository(NamedParameterJdbcTemplate db, ObjectMapper json) {
        this.db = db;
        this.json = json;
    }

    // ---------- Escritura ----------

    /** Fila actual como JSON, para guardarla como "antes". null si no existe o la tabla no aplica. */
    public String instantanea(String tabla, String registroId) {
        if ("sucursal_amenidades".equals(tabla)) {
            String[] partes = registroId.split("/amenidades/");
            if (partes.length != 2) return null;
            return db.query("""
                    SELECT to_jsonb(t)::text FROM public.sucursal_amenidades t
                    WHERE t.sucursal_id = CAST(:s AS integer) AND t.amenidad_id = CAST(:a AS integer)
                    """, Map.of("s", partes[0], "a", partes[1]), (rs, n) -> rs.getString(1))
                    .stream().findFirst().orElse(null);
        }
        if (!TABLAS_CON_ID.contains(tabla)) return null;
        return db.query("SELECT to_jsonb(t)::text FROM public." + tabla + " t WHERE t.id::text = :id",
                Map.of("id", registroId), (rs, n) -> rs.getString(1))
                .stream().findFirst().orElse(null);
    }

    public void registrar(String usuario, RutaAuditada ruta, String registroId, String antes, String despues,
                          String ip, boolean exitoso, String error) {
        db.update("""
                INSERT INTO public.logs_sistema
                    (usuario_id, modulo, accion, tabla_afectada, registro_id,
                     datos_anteriores, datos_nuevos, direccion_ip, exitoso, mensaje_error)
                VALUES (:usuario, :modulo, :accion, :tabla, :registro,
                        CAST(:antes AS jsonb), CAST(:despues AS jsonb), :ip, :exitoso, :error)
                """,
                new MapSqlParameterSource("usuario", usuario)
                        .addValue("modulo", ruta.modulo())
                        .addValue("accion", ruta.accion())
                        .addValue("tabla", ruta.tabla())
                        .addValue("registro", registroId)
                        .addValue("antes", antes)
                        .addValue("despues", despues)
                        .addValue("ip", ip)
                        .addValue("exitoso", exitoso)
                        .addValue("error", error));
    }

    // ---------- Consulta ----------

    public Pagina<BitacoraFila> buscar(BitacoraFiltros f, int pagina, int tamano) {
        MapSqlParameterSource p = parametros(f.desde(), f.hasta())
                .addValue("modulo", vacioANull(f.modulo()))
                .addValue("accion", vacioANull(f.accion()))
                .addValue("exitoso", f.exitoso())
                .addValue("q", vacioANull(f.q()) == null ? null : "%" + f.q().trim() + "%")
                .addValue("limite", tamano)
                .addValue("desplazamiento", pagina * tamano);

        String where = """
                WHERE (CAST(:desde AS date) IS NULL
                       OR l.fecha_hora >= CAST(CAST(:desde AS date) AS timestamp) AT TIME ZONE 'America/Guatemala')
                  AND (CAST(:hasta AS date) IS NULL
                       OR l.fecha_hora < CAST(CAST(:hasta AS date) + 1 AS timestamp) AT TIME ZONE 'America/Guatemala')
                  AND (CAST(:modulo AS text) IS NULL OR l.modulo = CAST(:modulo AS text))
                  AND (CAST(:accion AS text) IS NULL OR l.accion = CAST(:accion AS text))
                  AND (CAST(:exitoso AS boolean) IS NULL OR l.exitoso = CAST(:exitoso AS boolean))
                  AND (CAST(:q AS text) IS NULL
                       OR l.usuario_id ILIKE CAST(:q AS text)
                       OR l.registro_id ILIKE CAST(:q AS text)
                       OR l.mensaje_error ILIKE CAST(:q AS text))
                """;

        Long total = db.queryForObject("SELECT count(*) FROM public.logs_sistema l " + where, p, Long.class);

        List<BitacoraFila> filas = db.query("""
                SELECT l.id, l.fecha_hora, l.usuario_id, l.modulo, l.accion, l.tabla_afectada, l.registro_id,
                       l.direccion_ip, COALESCE(l.exitoso, true) AS exitoso, l.mensaje_error,
                       l.datos_anteriores IS NOT NULL OR l.datos_nuevos IS NOT NULL AS tiene_datos
                FROM public.logs_sistema l
                """ + where + """
                ORDER BY l.fecha_hora DESC, l.id DESC
                LIMIT :limite OFFSET :desplazamiento
                """, p, (rs, n) -> new BitacoraFila(
                    rs.getLong("id"),
                    rs.getObject("fecha_hora", OffsetDateTime.class),
                    rs.getString("usuario_id"),
                    rs.getString("modulo"),
                    rs.getString("accion"),
                    rs.getString("tabla_afectada"),
                    rs.getString("registro_id"),
                    rs.getString("direccion_ip"),
                    rs.getBoolean("exitoso"),
                    rs.getString("mensaje_error"),
                    rs.getBoolean("tiene_datos")));

        return new Pagina<>(filas, total == null ? 0 : total, pagina, tamano);
    }

    public Optional<BitacoraDetalle> detalle(long id) {
        return db.query("""
                SELECT id, fecha_hora, usuario_id, modulo, accion, tabla_afectada, registro_id, direccion_ip,
                       COALESCE(exitoso, true) AS exitoso, mensaje_error,
                       datos_anteriores::text AS antes, datos_nuevos::text AS despues
                FROM public.logs_sistema WHERE id = :id
                """, Map.of("id", id), (rs, n) -> new BitacoraDetalle(
                    rs.getLong("id"),
                    rs.getObject("fecha_hora", OffsetDateTime.class),
                    rs.getString("usuario_id"),
                    rs.getString("modulo"),
                    rs.getString("accion"),
                    rs.getString("tabla_afectada"),
                    rs.getString("registro_id"),
                    rs.getString("direccion_ip"),
                    rs.getBoolean("exitoso"),
                    rs.getString("mensaje_error"),
                    aJson(rs.getString("antes")),
                    aJson(rs.getString("despues"))))
                .stream().findFirst();
    }

    /** Valores distintos para llenar los filtros. */
    public Map<String, List<String>> opciones() {
        return Map.of(
                "modulos", db.queryForList("SELECT DISTINCT modulo FROM public.logs_sistema ORDER BY 1", Map.of(), String.class),
                "acciones", db.queryForList("SELECT DISTINCT accion FROM public.logs_sistema ORDER BY 1", Map.of(), String.class));
    }

    public Pagina<LogAgenteFila> conversacionesIa(LocalDate desde, LocalDate hasta, int pagina, int tamano) {
        MapSqlParameterSource p = parametros(desde, hasta)
                .addValue("limite", tamano)
                .addValue("desplazamiento", pagina * tamano);
        String where = """
                WHERE (CAST(:desde AS date) IS NULL
                       OR l.fecha_hora >= CAST(CAST(:desde AS date) AS timestamp) AT TIME ZONE 'America/Guatemala')
                  AND (CAST(:hasta AS date) IS NULL
                       OR l.fecha_hora < CAST(CAST(:hasta AS date) + 1 AS timestamp) AT TIME ZONE 'America/Guatemala')
                """;
        Long total = db.queryForObject("SELECT count(*) FROM public.logs_agente_ia l " + where, p, Long.class);
        List<LogAgenteFila> filas = db.query("""
                SELECT l.id, l.fecha_hora, l.sesion_id, l.cliente_id, l.prompt_usuario, l.respuesta_agente,
                       l.documentos_citados::text AS citados, COALESCE(l.tokens_utilizados, 0) AS tokens,
                       COALESCE(l.tiempo_respuesta_ms, 0) AS ms
                FROM public.logs_agente_ia l
                """ + where + """
                ORDER BY l.fecha_hora DESC, l.id DESC
                LIMIT :limite OFFSET :desplazamiento
                """, p, (rs, n) -> new LogAgenteFila(
                    rs.getLong("id"),
                    rs.getObject("fecha_hora", OffsetDateTime.class),
                    rs.getString("sesion_id"),
                    rs.getObject("cliente_id", UUID.class),
                    rs.getString("prompt_usuario"),
                    rs.getString("respuesta_agente"),
                    aJson(rs.getString("citados")),
                    rs.getInt("tokens"),
                    rs.getInt("ms")));
        return new Pagina<>(filas, total == null ? 0 : total, pagina, tamano);
    }

    // ---------- Auxiliares ----------

    private static MapSqlParameterSource parametros(LocalDate desde, LocalDate hasta) {
        return new MapSqlParameterSource("desde", desde).addValue("hasta", hasta);
    }

    private static String vacioANull(String v) {
        return v == null || v.isBlank() ? null : v;
    }

    private JsonNode aJson(String texto) {
        if (texto == null) return null;
        try {
            return json.readTree(texto);
        } catch (Exception e) {
            return null;
        }
    }

}
