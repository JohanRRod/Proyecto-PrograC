package com.fitpass.reservas.repository;

import com.fitpass.reservas.dto.InstructorRequest;
import com.fitpass.reservas.dto.InstructorResponse;
import com.fitpass.reservas.dto.MiReservaResponse;
import com.fitpass.reservas.dto.OcupacionResponse;
import com.fitpass.reservas.dto.ReservaClaseResponse;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Consultas de clases, instructores y reservas que necesitan unir varias tablas
 * (nombres de sede, instructor y cliente) o agrupar reservas por fecha.
 */
@Repository
public class ClaseConsultaRepository {

    /** Una clase con el nombre de su instructor. */
    public record ClaseConInstructor(
            Integer id,
            Integer sucursalId,
            String nombreClase,
            String instructor,
            String diaSemana,
            LocalTime horaInicio,
            LocalTime horaFin,
            int cupoMaximo,
            boolean requierePlanVip
    ) {}

    /** Una reserva activa del miembro, para marcar las clases que ya reservó. */
    public record ReservaActiva(Integer id, Integer claseId, LocalDate fecha) {}

    /** Datos de la sede que se usan para validar clases y accesos. */
    public record SedeResumen(
            Integer id,
            String nombre,
            Integer paisId,
            boolean activa,
            boolean esSedeVip,
            LocalTime apertura,
            LocalTime cierre
    ) {}

    private static final String SELECT_INSTRUCTOR = """
        SELECT i.id, i.sucursal_base_id, s.nombre AS sucursal, i.nombre_completo,
               i.especialidad, i.email, i.telefono, COALESCE(i.activo, true) AS activo,
               (SELECT count(*) FROM public.clases_grupales c WHERE c.instructor_id = i.id) AS clases
        FROM public.instructores i
        JOIN public.sucursales s ON s.id = i.sucursal_base_id
        """;

    private final NamedParameterJdbcTemplate db;

    public ClaseConsultaRepository(NamedParameterJdbcTemplate db) {
        this.db = db;
    }

    // ---------- Instructores ----------

    public List<InstructorResponse> instructores() {
        return db.query(SELECT_INSTRUCTOR + " ORDER BY i.nombre_completo",
                Map.of(), (rs, n) -> instructor(rs));
    }

    public Optional<InstructorResponse> instructor(Integer id) {
        return db.query(SELECT_INSTRUCTOR + " WHERE i.id = :id",
                Map.of("id", id), (rs, n) -> instructor(rs)).stream().findFirst();
    }

    public boolean emailInstructorUsado(String email, Integer excluirId) {
        Boolean usado = db.queryForObject("""
            SELECT EXISTS (
                SELECT 1 FROM public.instructores
                WHERE lower(email) = lower(:email)
                  AND (CAST(:id AS integer) IS NULL OR id <> CAST(:id AS integer))
            )
            """,
            new MapSqlParameterSource("email", email).addValue("id", excluirId),
            Boolean.class);
        return Boolean.TRUE.equals(usado);
    }

    public Integer crearInstructor(InstructorRequest r) {
        return db.queryForObject("""
            INSERT INTO public.instructores
                (sucursal_base_id, nombre_completo, especialidad, email, telefono, activo)
            VALUES (:sede, :nombre, :especialidad, :email, :telefono, :activo)
            RETURNING id
            """, parametros(r), Integer.class);
    }

    public void actualizarInstructor(Integer id, InstructorRequest r) {
        db.update("""
            UPDATE public.instructores
            SET sucursal_base_id = :sede, nombre_completo = :nombre, especialidad = :especialidad,
                email = :email, telefono = :telefono, activo = :activo
            WHERE id = :id
            """, parametros(r).addValue("id", id));
    }

    /** null si el instructor no existe. */
    public Boolean instructorActivo(Integer id) {
        return db.query("SELECT COALESCE(activo, true) AS activo FROM public.instructores WHERE id = :id",
                Map.of("id", id), (rs, n) -> rs.getBoolean("activo")).stream().findFirst().orElse(null);
    }

    // ---------- Sedes ----------

    public Optional<SedeResumen> sede(Integer id) {
        return db.query("""
            SELECT id, nombre, pais_id, COALESCE(activa, true) AS activa,
                   COALESCE(es_sede_vip, false) AS es_sede_vip, horario_apertura, horario_cierre
            FROM public.sucursales WHERE id = :id
            """, Map.of("id", id), (rs, n) -> new SedeResumen(
                rs.getInt("id"),
                rs.getString("nombre"),
                rs.getInt("pais_id"),
                rs.getBoolean("activa"),
                rs.getBoolean("es_sede_vip"),
                rs.getObject("horario_apertura", LocalTime.class),
                rs.getObject("horario_cierre", LocalTime.class)))
            .stream().findFirst();
    }

    // ---------- Clases ----------

    /** Nombre de otra clase del mismo instructor que se cruza con ese horario, si la hay. */
    public Optional<String> choqueInstructor(Integer instructorId, String dia,
            LocalTime inicio, LocalTime fin, Integer excluirClaseId) {
        return db.query("""
            SELECT nombre_clase || ' (' || to_char(hora_inicio, 'HH24:MI') || '-'
                   || to_char(hora_fin, 'HH24:MI') || ')' AS clase
            FROM public.clases_grupales
            WHERE instructor_id = :instructor
              AND dia_semana = :dia
              AND hora_inicio < CAST(:fin AS time)
              AND hora_fin > CAST(:inicio AS time)
              AND (CAST(:excluir AS integer) IS NULL OR id <> CAST(:excluir AS integer))
            ORDER BY hora_inicio
            LIMIT 1
            """,
            new MapSqlParameterSource("instructor", instructorId)
                .addValue("dia", dia)
                .addValue("inicio", inicio.toString())
                .addValue("fin", fin.toString())
                .addValue("excluir", excluirClaseId),
            (rs, n) -> rs.getString("clase")).stream().findFirst();
    }

    /** Reservas activas desde hoy en adelante y el máximo que tiene una sola fecha. */
    public long[] reservasFuturas(Integer claseId, LocalDate hoy) {
        return db.queryForObject("""
            SELECT COALESCE(sum(n), 0) AS total, COALESCE(max(n), 0) AS maximo
            FROM (
                SELECT count(*) AS n
                FROM public.reservas_clases
                WHERE clase_id = :clase AND estado = 'RESERVADA' AND fecha_clase >= :hoy
                GROUP BY fecha_clase
            ) t
            """, Map.of("clase", claseId, "hoy", hoy),
            (rs, n) -> new long[] { rs.getLong("total"), rs.getLong("maximo") });
    }

    public List<ClaseConInstructor> clasesDeSede(Integer sucursalId) {
        return db.query("""
            SELECT c.id, c.sucursal_id, c.nombre_clase, i.nombre_completo AS instructor, c.dia_semana,
                   c.hora_inicio, c.hora_fin, c.cupo_maximo, COALESCE(c.requiere_plan_vip, false) AS vip
            FROM public.clases_grupales c
            JOIN public.instructores i ON i.id = c.instructor_id
            WHERE c.sucursal_id = :sede
            ORDER BY c.hora_inicio, c.nombre_clase
            """, Map.of("sede", sucursalId), (rs, n) -> new ClaseConInstructor(
                rs.getInt("id"),
                rs.getInt("sucursal_id"),
                rs.getString("nombre_clase"),
                rs.getString("instructor"),
                rs.getString("dia_semana"),
                rs.getObject("hora_inicio", LocalTime.class),
                rs.getObject("hora_fin", LocalTime.class),
                rs.getInt("cupo_maximo"),
                rs.getBoolean("vip")));
    }

    // ---------- Reservas ----------

    public List<OcupacionResponse> ocupacion(Integer sucursalId, LocalDate desde, LocalDate hasta) {
        return db.query("""
            SELECT r.clase_id, r.fecha_clase,
                   count(*) FILTER (WHERE r.estado = 'RESERVADA') AS reservadas,
                   count(*) FILTER (WHERE r.estado = 'ASISTIO') AS asistieron,
                   count(*) FILTER (WHERE r.estado = 'INASISTENCIA') AS inasistencias
            FROM public.reservas_clases r
            JOIN public.clases_grupales c ON c.id = r.clase_id
            WHERE r.fecha_clase BETWEEN :desde AND :hasta
              AND (CAST(:sede AS integer) IS NULL OR c.sucursal_id = CAST(:sede AS integer))
            GROUP BY r.clase_id, r.fecha_clase
            HAVING count(*) FILTER (WHERE r.estado <> 'CANCELADA') > 0
            ORDER BY r.fecha_clase, r.clase_id
            """,
            new MapSqlParameterSource("desde", desde).addValue("hasta", hasta).addValue("sede", sucursalId),
            (rs, n) -> new OcupacionResponse(
                rs.getInt("clase_id"),
                rs.getObject("fecha_clase", LocalDate.class),
                rs.getLong("reservadas"),
                rs.getLong("asistieron"),
                rs.getLong("inasistencias")));
    }

    public List<ReservaClaseResponse> reservasDeClase(Integer claseId, LocalDate fecha) {
        return db.query("""
            SELECT r.id, r.cliente_id, cl.nombres || ' ' || cl.apellidos AS nombre,
                   cl.documento_identidad, r.estado, r.created_at
            FROM public.reservas_clases r
            JOIN public.clientes cl ON cl.id = r.cliente_id
            WHERE r.clase_id = :clase AND r.fecha_clase = :fecha
            ORDER BY (r.estado = 'CANCELADA'), nombre
            """, Map.of("clase", claseId, "fecha", fecha), (rs, n) -> new ReservaClaseResponse(
                rs.getInt("id"),
                rs.getObject("cliente_id", UUID.class),
                rs.getString("nombre"),
                rs.getString("documento_identidad"),
                rs.getString("estado"),
                rs.getObject("created_at", OffsetDateTime.class)));
    }

    public List<ReservaActiva> reservasActivasDelCliente(UUID clienteId, LocalDate desde, LocalDate hasta) {
        return db.query("""
            SELECT id, clase_id, fecha_clase
            FROM public.reservas_clases
            WHERE cliente_id = :cliente AND estado = 'RESERVADA'
              AND fecha_clase BETWEEN :desde AND :hasta
            """, Map.of("cliente", clienteId, "desde", desde, "hasta", hasta),
            (rs, n) -> new ReservaActiva(
                rs.getInt("id"),
                rs.getInt("clase_id"),
                rs.getObject("fecha_clase", LocalDate.class)));
    }

    public List<MiReservaResponse> reservasDelCliente(UUID clienteId) {
        return db.query("""
            SELECT r.id, r.clase_id, c.nombre_clase, i.nombre_completo AS instructor,
                   c.sucursal_id, s.nombre AS sucursal, r.fecha_clase, c.hora_inicio, c.hora_fin,
                   r.estado, r.created_at
            FROM public.reservas_clases r
            JOIN public.clases_grupales c ON c.id = r.clase_id
            JOIN public.instructores i ON i.id = c.instructor_id
            JOIN public.sucursales s ON s.id = c.sucursal_id
            WHERE r.cliente_id = :cliente
            ORDER BY r.fecha_clase DESC, c.hora_inicio DESC
            LIMIT 100
            """, Map.of("cliente", clienteId), (rs, n) -> new MiReservaResponse(
                rs.getInt("id"),
                rs.getInt("clase_id"),
                rs.getString("nombre_clase"),
                rs.getString("instructor"),
                rs.getInt("sucursal_id"),
                rs.getString("sucursal"),
                rs.getObject("fecha_clase", LocalDate.class),
                rs.getObject("hora_inicio", LocalTime.class),
                rs.getObject("hora_fin", LocalTime.class),
                rs.getString("estado"),
                rs.getObject("created_at", OffsetDateTime.class)));
    }

    // ---------- Auxiliares ----------

    private static InstructorResponse instructor(ResultSet rs) throws SQLException {
        return new InstructorResponse(
                rs.getInt("id"),
                rs.getInt("sucursal_base_id"),
                rs.getString("sucursal"),
                rs.getString("nombre_completo"),
                rs.getString("especialidad"),
                rs.getString("email"),
                rs.getString("telefono"),
                rs.getBoolean("activo"),
                rs.getLong("clases"));
    }

    private static MapSqlParameterSource parametros(InstructorRequest r) {
        String telefono = r.telefono() == null || r.telefono().isBlank() ? null : r.telefono().trim();
        return new MapSqlParameterSource("sede", r.sucursalBaseId())
                .addValue("nombre", r.nombreCompleto().trim())
                .addValue("especialidad", r.especialidad().trim())
                .addValue("email", r.email().trim().toLowerCase())
                .addValue("telefono", telefono)
                .addValue("activo", r.activo() == null || r.activo());
    }
}
