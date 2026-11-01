package com.fitpass.ia.repository;

import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Datos públicos y vigentes del catálogo que se le dan al modelo como contexto.
 * Solo información que ya es pública en /api/catalogo; nunca datos de clientes.
 */
@Repository
public class CatalogoContextoRepository {

    private final JdbcTemplate jdbc;

    public CatalogoContextoRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> sedes() {
        return jdbc.queryForList("""
                SELECT s.nombre, s.ciudad, p.nombre AS pais, s.direccion, s.telefono,
                       to_char(s.horario_apertura, 'HH24:MI') AS abre,
                       to_char(s.horario_cierre, 'HH24:MI') AS cierra,
                       s.es_sede_vip,
                       COALESCE((
                           SELECT string_agg(
                                      a.nombre
                                      || CASE WHEN a.requiere_plan_vip THEN ' (solo plan Black)' ELSE '' END
                                      || CASE WHEN sa.disponible THEN '' ELSE ' (no disponible)' END
                                      || CASE WHEN sa.horario_especial IS NOT NULL THEN ' (horario ' || sa.horario_especial || ')' ELSE '' END,
                                      '; ' ORDER BY a.nombre)
                           FROM public.sucursal_amenidades sa
                           JOIN public.amenidades a ON a.id = sa.amenidad_id
                           WHERE sa.sucursal_id = s.id
                       ), 'sin amenidades registradas') AS amenidades
                FROM public.sucursales s
                JOIN public.paises p ON p.id = s.pais_id
                WHERE s.activa = true
                ORDER BY p.nombre, s.nombre
                """);
    }

    /** Un plan por nombre: la tabla puede tener filas repetidas por cargas duplicadas del seed. */
    public List<Map<String, Object>> planes() {
        return jdbc.queryForList("""
                SELECT DISTINCT ON (nombre)
                       nombre, descripcion, precio_mensual, cuota_inscripcion, cuota_mantenimiento_anual,
                       meses_permanencia_minima, porcentaje_penalizacion,
                       permite_acceso_nacional, permite_acceso_internacional, permite_amenidades_vip,
                       invitados_mensuales_gratis
                FROM public.planes
                WHERE activo = true
                ORDER BY nombre, id
                """);
    }
}
