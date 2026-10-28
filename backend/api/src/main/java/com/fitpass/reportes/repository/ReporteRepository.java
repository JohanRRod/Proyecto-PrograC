package com.fitpass.reportes.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Set;

@Repository
public class ReporteRepository {

    private final JdbcTemplate jdbc;

    public ReporteRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> clientesRegistrados() {
        return jdbc.queryForList("""
            SELECT
                c.id,
                c.nombres,
                c.apellidos,
                c.email,
                c.telefono,
                s.nombre AS sucursal_base,
                c.estado,
                c.created_at AS fecha_registro
            FROM public.clientes c
            LEFT JOIN public.sucursales s
                ON s.id = c.sucursal_base_id
            ORDER BY c.created_at DESC
            """);
            
    }

        private static final Map<String, String> CONSULTAS = crearConsultas();

private static Map<String, String> crearConsultas() {
    Map<String, String> q = new LinkedHashMap<>();

    q.put("membresias-activas", """
        SELECT m.id, c.nombres, c.apellidos,
               p.nombre AS plan, m.fecha_inicio,
               m.fecha_fin_permanencia_minima,
               m.estado
        FROM public.membresias m
        JOIN public.clientes c ON c.id = m.cliente_id
        JOIN public.planes p ON p.id = m.plan_id
        WHERE m.estado = 'ACTIVA'
        ORDER BY m.fecha_inicio DESC
        """);

    q.put("membresias-canceladas", """
        SELECT m.id, c.nombres, c.apellidos,
               p.nombre AS plan, m.fecha_inicio,
               ca.fecha_solicitud, ca.motivo_cancelacion
        FROM public.membresias m
        JOIN public.clientes c ON c.id = m.cliente_id
        JOIN public.planes p ON p.id = m.plan_id
        LEFT JOIN LATERAL (
            SELECT fecha_solicitud, motivo_cancelacion
            FROM public.cancelaciones_membresia
            WHERE membresia_id = m.id
            ORDER BY fecha_solicitud DESC, id DESC
            LIMIT 1
        ) ca ON TRUE
        WHERE m.estado = 'CANCELADA'
        ORDER BY ca.fecha_solicitud DESC NULLS LAST
        """);

    q.put("penalizaciones", """
        SELECT ca.id, ca.membresia_id,
               c.nombres, c.apellidos,
               ca.fecha_solicitud,
               ca.meses_restantes_contrato,
               ca.monto_penalizacion_calculado,
               ca.cobro_penalizacion_id
        FROM public.cancelaciones_membresia ca
        JOIN public.membresias m ON m.id = ca.membresia_id
        JOIN public.clientes c ON c.id = m.cliente_id
        WHERE ca.monto_penalizacion_calculado > 0
        ORDER BY ca.fecha_solicitud DESC
        """);

    q.put("ingresos-mensuales", """
        SELECT DATE_TRUNC('month', fecha_intento)::date AS mes,
               COUNT(*) AS cantidad_cobros,
               SUM(monto_total_cobrado) AS ingresos
        FROM public.cobros_automaticos
        WHERE estado_transaccion = 'EXITOSO'
        GROUP BY DATE_TRUNC('month', fecha_intento)
        ORDER BY mes DESC
        """);

    q.put("cobros-rechazados", """
        SELECT id, membresia_id, concepto,
               monto_total_cobrado AS monto_intentado,
               fecha_intento, estado_transaccion
        FROM public.cobros_automaticos
        WHERE estado_transaccion <> 'EXITOSO'
        ORDER BY fecha_intento DESC
        """);

    q.put("morosidad", """
        SELECT m.id AS membresia_id,
               c.nombres, c.apellidos,
               p.periodo, p.fecha_vencimiento,
               p.intentos, p.estado AS estado_periodo,
               m.estado AS estado_membresia
        FROM public.membresias m
        JOIN public.clientes c ON c.id = m.cliente_id
        JOIN public.periodos_facturacion p
          ON p.membresia_id = m.id
        WHERE p.estado = 'PENDIENTE'
          AND p.fecha_vencimiento < CURRENT_DATE
        ORDER BY p.fecha_vencimiento
        """);

    q.put("planes-mas-contratados", """
        SELECT p.id, p.nombre,
               COUNT(m.id) AS total_contrataciones,
               COUNT(m.id) FILTER (
                   WHERE m.estado = 'ACTIVA'
               ) AS membresias_activas
        FROM public.planes p
        LEFT JOIN public.membresias m ON m.plan_id = p.id
        GROUP BY p.id, p.nombre
        ORDER BY total_contrataciones DESC
        """);

    q.put("accesos-por-sucursal", """
        SELECT s.id, s.nombre AS sucursal,
               COUNT(r.id) AS total_intentos,
               COUNT(r.id) FILTER (
                   WHERE r.acceso_permitido = TRUE
               ) AS accesos_permitidos,
               COUNT(r.id) FILTER (
                   WHERE r.acceso_permitido = FALSE
               ) AS accesos_rechazados
        FROM public.sucursales s
        LEFT JOIN public.registros_acceso r
          ON r.sucursal_id = s.id
        GROUP BY s.id, s.nombre
        ORDER BY total_intentos DESC
        """);

    q.put("accesos-internacionales", """
        SELECT r.id, c.nombres, c.apellidos,
               origen.nombre AS pais_origen,
               destino.nombre AS pais_destino,
               s.nombre AS sucursal_visitada,
               r.fecha_hora_acceso,
               r.acceso_permitido
        FROM public.registros_acceso r
        JOIN public.clientes c ON c.id = r.cliente_id
        JOIN public.sucursales base
          ON base.id = c.sucursal_base_id
        JOIN public.paises origen
          ON origen.id = base.pais_id
        JOIN public.sucursales s
          ON s.id = r.sucursal_id
        JOIN public.paises destino
          ON destino.id = s.pais_id
        WHERE base.pais_id <> s.pais_id
        ORDER BY r.fecha_hora_acceso DESC
        """);

    q.put("uso-amenidades", """
        SELECT a.id, a.nombre,
               COUNT(r.id) AS total_usos,
               COUNT(DISTINCT r.cliente_id) AS clientes_unicos
        FROM public.amenidades a
        LEFT JOIN public.registros_acceso r
          ON r.amenidad_id = a.id
         AND r.acceso_permitido = TRUE
        GROUP BY a.id, a.nombre
        ORDER BY total_usos DESC
        """);

    q.put("reservas-clases", """
        SELECT r.id, cg.nombre_clase,
               s.nombre AS sucursal,
               r.cliente_id, r.fecha_clase,
               r.estado, r.created_at
        FROM public.reservas_clases r
        JOIN public.clases_grupales cg ON cg.id = r.clase_id
        JOIN public.sucursales s ON s.id = cg.sucursal_id
        ORDER BY r.fecha_clase DESC
        """);

    q.put("clases-populares", """
        SELECT cg.id, cg.nombre_clase,
               s.nombre AS sucursal,
               COUNT(r.id) FILTER (
                   WHERE r.estado = 'RESERVADA'
               ) AS reservas_activas,
               COUNT(r.id) AS reservas_totales
        FROM public.clases_grupales cg
        JOIN public.sucursales s ON s.id = cg.sucursal_id
        LEFT JOIN public.reservas_clases r
          ON r.clase_id = cg.id
        GROUP BY cg.id, cg.nombre_clase, s.nombre
        ORDER BY reservas_activas DESC
        """);

    q.put("capacidad-sucursales", """
        SELECT s.id, s.nombre, s.ciudad,
               p.nombre AS pais,
               s.capacidad_maxima,
               s.es_sede_vip, s.activa
        FROM public.sucursales s
        JOIN public.paises p ON p.id = s.pais_id
        ORDER BY s.nombre
        """);

    q.put("metodos-pago", """
        SELECT tipo_cuenta, banco_emisor,
               COUNT(*) AS total_metodos,
               COUNT(*) FILTER (
                   WHERE activo = TRUE
               ) AS metodos_activos
        FROM public.metodos_pago_cliente
        GROUP BY tipo_cuenta, banco_emisor
        ORDER BY total_metodos DESC
        """);

    return Map.copyOf(q);
}

public Set<String> reportesDisponibles() {
    return CONSULTAS.keySet();
}

public List<Map<String, Object>> consultar(String codigo) {
    String sql = CONSULTAS.get(codigo);

    if (sql == null) {
        throw new IllegalArgumentException(
            "Reporte no disponible: " + codigo
        );
    }

    return jdbc.queryForList(sql);
}

}