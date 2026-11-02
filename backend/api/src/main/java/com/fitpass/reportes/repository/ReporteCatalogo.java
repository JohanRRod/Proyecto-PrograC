package com.fitpass.reportes.repository;

import com.fitpass.reportes.dto.ReporteDefinicion;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Catálogo de los 15 reportes del sistema, en el orden en que se muestran.
 * Cada consulta acepta filtros opcionales por rango de fechas y por sede.
 */
@Component
public class ReporteCatalogo {

    private static final String ZONA = "America/Guatemala";

    private static final String CLIENTES = "Clientes y membresías";
    private static final String FINANZAS = "Finanzas";
    private static final String ACCESOS = "Accesos y sedes";
    private static final String CLASES = "Clases";

    private final List<ReporteDefinicion> reportes = List.of(

        new ReporteDefinicion(
            "clientes",
            "Clientes registrados",
            "Todos los clientes con su sede base, estado y fecha de registro.",
            CLIENTES, "Fecha de registro", true,
            List.of(),
            """
            SELECT c.nombres || ' ' || c.apellidos AS cliente,
                   c.documento_identidad AS documento,
                   c.email,
                   c.telefono,
                   s.nombre AS sucursal_base,
                   c.estado,
                   c.created_at AS fecha_registro
            FROM public.clientes c
            JOIN public.sucursales s ON s.id = c.sucursal_base_id
            WHERE %s AND %s
            ORDER BY c.created_at DESC
            """.formatted(rango(local("c.created_at")), sede("c.sucursal_base_id"))),

        new ReporteDefinicion(
            "membresias-activas",
            "Membresías activas",
            "Membresías vigentes con su plan, fin de permanencia y cuota mensual.",
            CLIENTES, "Fecha de inicio", true,
            List.of("monto_mensual"),
            """
            SELECT c.nombres || ' ' || c.apellidos AS cliente,
                   p.nombre AS plan,
                   s.nombre AS sucursal_base,
                   m.fecha_inicio,
                   m.fecha_fin_permanencia_minima AS fin_permanencia,
                   m.dia_corte_mensual AS dia_cobro,
                   p.precio_mensual AS monto_mensual
            FROM public.membresias m
            JOIN public.clientes c ON c.id = m.cliente_id
            JOIN public.planes p ON p.id = m.plan_id
            JOIN public.sucursales s ON s.id = c.sucursal_base_id
            WHERE m.estado = 'ACTIVA' AND %s AND %s
            ORDER BY m.fecha_inicio DESC
            """.formatted(rango("m.fecha_inicio"), sede("c.sucursal_base_id"))),

        new ReporteDefinicion(
            "membresias-canceladas",
            "Membresías canceladas",
            "Cancelaciones con su motivo y si el cliente cumplió la permanencia mínima.",
            CLIENTES, "Fecha de cancelación", true,
            List.of("monto_penalizacion"),
            """
            SELECT c.nombres || ' ' || c.apellidos AS cliente,
                   p.nombre AS plan,
                   m.fecha_inicio,
                   ca.fecha_solicitud AS fecha_cancelacion,
                   ca.cumplio_permanencia_minima AS cumplio_permanencia,
                   ca.monto_penalizacion_calculado AS monto_penalizacion,
                   ca.motivo_cancelacion AS motivo
            FROM public.membresias m
            JOIN public.clientes c ON c.id = m.cliente_id
            JOIN public.planes p ON p.id = m.plan_id
            LEFT JOIN public.cancelaciones_membresia ca ON ca.membresia_id = m.id
            WHERE m.estado = 'CANCELADA' AND %s AND %s
            ORDER BY ca.fecha_solicitud DESC NULLS LAST
            """.formatted(rango(local("ca.fecha_solicitud")), sede("c.sucursal_base_id"))),

        new ReporteDefinicion(
            "planes-mas-contratados",
            "Planes más contratados",
            "Cuántas veces se contrató cada plan y qué parte del total representa.",
            CLIENTES, "Fecha de inicio", true,
            List.of("contrataciones", "activas", "canceladas"),
            """
            SELECT p.nombre AS plan,
                   p.precio_mensual AS monto_mensual,
                   COUNT(m.id) AS contrataciones,
                   COUNT(m.id) FILTER (WHERE m.estado = 'ACTIVA') AS activas,
                   COUNT(m.id) FILTER (WHERE m.estado = 'CANCELADA') AS canceladas,
                   ROUND(100.0 * COUNT(m.id)
                         / NULLIF(SUM(COUNT(m.id)) OVER (), 0), 1) AS porcentaje_del_total
            FROM public.planes p
            LEFT JOIN (public.membresias m
                       JOIN public.clientes c ON c.id = m.cliente_id)
              ON m.plan_id = p.id AND %s AND %s
            GROUP BY p.id, p.nombre, p.precio_mensual
            ORDER BY contrataciones DESC, p.nombre
            """.formatted(rango("m.fecha_inicio"), sede("c.sucursal_base_id"))),

        new ReporteDefinicion(
            "ingresos-mensuales",
            "Ingresos por mes",
            "Cobros exitosos agrupados por mes y por concepto.",
            FINANZAS, "Fecha del cobro", true,
            List.of("cobros_exitosos", "ingresos_mensualidades", "ingresos_inscripciones",
                    "ingresos_mantenimiento", "ingresos_penalizaciones", "ingresos_totales"),
            """
            SELECT DATE_TRUNC('month', %1$s)::date AS mes,
                   COUNT(*) AS cobros_exitosos,
                   COALESCE(SUM(co.monto_total_cobrado) FILTER (WHERE co.concepto = 'MENSUALIDAD'), 0) AS ingresos_mensualidades,
                   COALESCE(SUM(co.monto_total_cobrado) FILTER (WHERE co.concepto = 'INSCRIPCION'), 0) AS ingresos_inscripciones,
                   COALESCE(SUM(co.monto_total_cobrado) FILTER (WHERE co.concepto = 'MANTENIMIENTO_ANUAL'), 0) AS ingresos_mantenimiento,
                   COALESCE(SUM(co.monto_total_cobrado) FILTER (WHERE co.concepto = 'PENALIZACION_CANCELACION'), 0) AS ingresos_penalizaciones,
                   SUM(co.monto_total_cobrado) AS ingresos_totales
            FROM public.cobros_automaticos co
            JOIN public.membresias m ON m.id = co.membresia_id
            JOIN public.clientes c ON c.id = m.cliente_id
            WHERE co.estado_transaccion = 'EXITOSO' AND %2$s AND %3$s
            GROUP BY 1
            ORDER BY 1 DESC
            """.formatted(local("co.fecha_intento"), rango(local("co.fecha_intento")),
                          sede("c.sucursal_base_id"))),

        new ReporteDefinicion(
            "cobros-rechazados",
            "Cobros rechazados",
            "Cobros que no se pudieron completar, con el método de pago usado.",
            FINANZAS, "Fecha del intento", true,
            List.of("monto_intentado"),
            """
            SELECT co.fecha_intento,
                   c.nombres || ' ' || c.apellidos AS cliente,
                   co.concepto,
                   co.monto_total_cobrado AS monto_intentado,
                   mp.banco_emisor || ' •••• ' || mp.ultimos_cuatro_digitos AS metodo_pago,
                   co.estado_transaccion AS estado
            FROM public.cobros_automaticos co
            JOIN public.membresias m ON m.id = co.membresia_id
            JOIN public.clientes c ON c.id = m.cliente_id
            LEFT JOIN public.metodos_pago_cliente mp ON mp.id = co.metodo_pago_id
            WHERE co.estado_transaccion <> 'EXITOSO' AND %s AND %s
            ORDER BY co.fecha_intento DESC
            """.formatted(rango(local("co.fecha_intento")), sede("c.sucursal_base_id"))),

        new ReporteDefinicion(
            "morosidad",
            "Morosidad",
            "Mensualidades vencidas sin pagar y los días de atraso de cada cliente.",
            FINANZAS, "Fecha de vencimiento", true,
            List.of("monto_pendiente"),
            """
            SELECT c.nombres || ' ' || c.apellidos AS cliente,
                   c.email,
                   pl.nombre AS plan,
                   pf.periodo,
                   pf.fecha_vencimiento,
                   (CURRENT_DATE - pf.fecha_vencimiento) AS dias_atraso,
                   pf.intentos AS intentos_cobro,
                   pl.precio_mensual AS monto_pendiente,
                   m.estado AS estado_membresia
            FROM public.periodos_facturacion pf
            JOIN public.membresias m ON m.id = pf.membresia_id
            JOIN public.clientes c ON c.id = m.cliente_id
            JOIN public.planes pl ON pl.id = m.plan_id
            WHERE pf.estado = 'PENDIENTE'
              AND pf.fecha_vencimiento < CURRENT_DATE
              AND %s AND %s
            ORDER BY pf.fecha_vencimiento
            """.formatted(rango("pf.fecha_vencimiento"), sede("c.sucursal_base_id"))),

        new ReporteDefinicion(
            "penalizaciones",
            "Penalizaciones por cancelación",
            "Penalizaciones calculadas al cancelar antes de tiempo y si se cobraron.",
            FINANZAS, "Fecha de cancelación", true,
            List.of("monto_penalizacion", "monto_cobrado"),
            """
            SELECT c.nombres || ' ' || c.apellidos AS cliente,
                   p.nombre AS plan,
                   ca.fecha_solicitud AS fecha_cancelacion,
                   ca.meses_restantes_contrato AS meses_restantes,
                   ca.monto_penalizacion_calculado AS monto_penalizacion,
                   COALESCE(co.estado_transaccion, 'SIN_COBRO') AS estado_cobro,
                   CASE WHEN co.estado_transaccion = 'EXITOSO'
                        THEN co.monto_total_cobrado ELSE 0 END AS monto_cobrado
            FROM public.cancelaciones_membresia ca
            JOIN public.membresias m ON m.id = ca.membresia_id
            JOIN public.clientes c ON c.id = m.cliente_id
            JOIN public.planes p ON p.id = m.plan_id
            LEFT JOIN public.cobros_automaticos co ON co.id = ca.cobro_penalizacion_id
            WHERE ca.monto_penalizacion_calculado > 0 AND %s AND %s
            ORDER BY ca.fecha_solicitud DESC
            """.formatted(rango(local("ca.fecha_solicitud")), sede("c.sucursal_base_id"))),

        new ReporteDefinicion(
            "metodos-pago",
            "Métodos de pago",
            "Métodos de pago registrados, agrupados por tipo de cuenta y banco.",
            FINANZAS, "Fecha de registro", true,
            List.of("registrados", "activos"),
            """
            SELECT CASE mp.tipo_cuenta
                       WHEN 'TARJETA_CREDITO' THEN 'Tarjeta de crédito'
                       WHEN 'TARJETA_DEBITO' THEN 'Tarjeta de débito'
                       WHEN 'CUENTA_BANCARIA' THEN 'Cuenta bancaria'
                       ELSE mp.tipo_cuenta
                   END AS tipo_cuenta,
                   mp.banco_emisor AS banco,
                   COUNT(*) AS registrados,
                   COUNT(*) FILTER (WHERE mp.activo) AS activos,
                   COUNT(DISTINCT mp.cliente_id) AS clientes,
                   ROUND(100.0 * COUNT(*)
                         / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS porcentaje_del_total
            FROM public.metodos_pago_cliente mp
            JOIN public.clientes c ON c.id = mp.cliente_id
            WHERE %s AND %s
            GROUP BY mp.tipo_cuenta, mp.banco_emisor
            ORDER BY registrados DESC, banco
            """.formatted(rango(local("mp.created_at")), sede("c.sucursal_base_id"))),

        new ReporteDefinicion(
            "accesos-por-sucursal",
            "Accesos por sede",
            "Intentos de entrada a cada sede, cuántos se permitieron y cuántos se rechazaron.",
            ACCESOS, "Fecha del acceso", true,
            List.of("intentos", "permitidos", "rechazados"),
            """
            SELECT s.nombre AS sucursal,
                   pa.nombre AS pais,
                   COUNT(r.id) AS intentos,
                   COUNT(r.id) FILTER (WHERE r.acceso_permitido) AS permitidos,
                   COUNT(r.id) FILTER (WHERE NOT r.acceso_permitido) AS rechazados,
                   ROUND(100.0 * COUNT(r.id) FILTER (WHERE NOT r.acceso_permitido)
                         / NULLIF(COUNT(r.id), 0), 1) AS porcentaje_rechazo,
                   COUNT(DISTINCT r.cliente_id) FILTER (WHERE r.acceso_permitido) AS clientes_unicos
            FROM public.sucursales s
            JOIN public.paises pa ON pa.id = s.pais_id
            LEFT JOIN public.registros_acceso r
              ON r.sucursal_id = s.id AND %s
            WHERE %s
            GROUP BY s.id, s.nombre, pa.nombre
            ORDER BY intentos DESC, s.nombre
            """.formatted(rango(local("r.fecha_hora_acceso")), sede("s.id"))),

        new ReporteDefinicion(
            "accesos-internacionales",
            "Accesos internacionales",
            "Visitas de clientes a sedes de otro país distinto al de su sede base.",
            ACCESOS, "Fecha del acceso", true,
            List.of(),
            """
            SELECT r.fecha_hora_acceso,
                   c.nombres || ' ' || c.apellidos AS cliente,
                   origen.nombre AS pais_origen,
                   destino.nombre AS pais_destino,
                   s.nombre AS sucursal_visitada,
                   r.acceso_permitido AS permitido,
                   r.motivo_rechazo
            FROM public.registros_acceso r
            JOIN public.clientes c ON c.id = r.cliente_id
            JOIN public.sucursales base ON base.id = c.sucursal_base_id
            JOIN public.paises origen ON origen.id = base.pais_id
            JOIN public.sucursales s ON s.id = r.sucursal_id
            JOIN public.paises destino ON destino.id = s.pais_id
            WHERE base.pais_id <> s.pais_id AND %s AND %s
            ORDER BY r.fecha_hora_acceso DESC
            """.formatted(rango(local("r.fecha_hora_acceso")), sede("s.id"))),

        new ReporteDefinicion(
            "uso-amenidades",
            "Uso de amenidades",
            "Cuántas veces se usó cada amenidad y por cuántos clientes distintos.",
            ACCESOS, "Fecha del uso", true,
            List.of("usos"),
            """
            SELECT a.nombre AS amenidad,
                   a.requiere_plan_vip AS exclusiva_black,
                   COUNT(r.id) AS usos,
                   COUNT(DISTINCT r.cliente_id) AS clientes_unicos,
                   COUNT(DISTINCT r.sucursal_id) AS sedes
            FROM public.amenidades a
            LEFT JOIN public.registros_acceso r
              ON r.amenidad_id = a.id
             AND r.acceso_permitido = TRUE
             AND %s AND %s
            GROUP BY a.id, a.nombre, a.requiere_plan_vip
            ORDER BY usos DESC, a.nombre
            """.formatted(rango(local("r.fecha_hora_acceso")), sede("r.sucursal_id"))),

        new ReporteDefinicion(
            "capacidad-sucursales",
            "Capacidad y afluencia por sede",
            "Capacidad de cada sede junto con sus entradas: total, promedio por día y día pico.",
            ACCESOS, "Fecha del acceso", true,
            List.of("accesos_permitidos"),
            """
            SELECT s.nombre AS sucursal,
                   s.ciudad,
                   pa.nombre AS pais,
                   s.capacidad_maxima,
                   s.es_sede_vip AS tiene_zona_black,
                   s.activa,
                   COALESCE(a.accesos, 0) AS accesos_permitidos,
                   COALESCE(a.dias, 0) AS dias_con_actividad,
                   COALESCE(ROUND(a.accesos::numeric / NULLIF(a.dias, 0), 1), 0) AS promedio_diario,
                   COALESCE(a.pico, 0) AS pico_diario
            FROM public.sucursales s
            JOIN public.paises pa ON pa.id = s.pais_id
            LEFT JOIN (
                SELECT d.sucursal_id,
                       SUM(d.entradas) AS accesos,
                       COUNT(*) AS dias,
                       MAX(d.entradas) AS pico
                FROM (
                    SELECT r.sucursal_id, %1$s AS dia, COUNT(*) AS entradas
                    FROM public.registros_acceso r
                    WHERE r.acceso_permitido = TRUE AND %2$s
                    GROUP BY r.sucursal_id, %1$s
                ) d
                GROUP BY d.sucursal_id
            ) a ON a.sucursal_id = s.id
            WHERE %3$s
            ORDER BY s.nombre
            """.formatted(local("r.fecha_hora_acceso"), rango(local("r.fecha_hora_acceso")),
                          sede("s.id"))),

        new ReporteDefinicion(
            "reservas-clases",
            "Reservas de clases",
            "Detalle de cada reserva: clase, sede, instructor, cliente y estado.",
            CLASES, "Fecha de la clase", true,
            List.of(),
            """
            SELECT r.fecha_clase,
                   cg.hora_inicio,
                   cg.nombre_clase AS clase,
                   s.nombre AS sucursal,
                   i.nombre_completo AS instructor,
                   c.nombres || ' ' || c.apellidos AS cliente,
                   r.estado
            FROM public.reservas_clases r
            JOIN public.clases_grupales cg ON cg.id = r.clase_id
            JOIN public.sucursales s ON s.id = cg.sucursal_id
            JOIN public.clientes c ON c.id = r.cliente_id
            LEFT JOIN public.instructores i ON i.id = cg.instructor_id
            WHERE %s AND %s
            ORDER BY r.fecha_clase DESC, cg.hora_inicio
            """.formatted(rango("r.fecha_clase"), sede("cg.sucursal_id"))),

        new ReporteDefinicion(
            "clases-populares",
            "Clases más populares",
            "Reservas, asistencias y cancelaciones de cada clase grupal.",
            CLASES, "Fecha de la clase", true,
            List.of("reservas", "asistencias", "canceladas", "inasistencias"),
            """
            SELECT cg.nombre_clase AS clase,
                   s.nombre AS sucursal,
                   cg.dia_semana,
                   cg.hora_inicio,
                   cg.cupo_maximo AS cupo,
                   COUNT(r.id) AS reservas,
                   COUNT(r.id) FILTER (WHERE r.estado = 'ASISTIO') AS asistencias,
                   COUNT(r.id) FILTER (WHERE r.estado = 'CANCELADA') AS canceladas,
                   COUNT(r.id) FILTER (WHERE r.estado = 'INASISTENCIA') AS inasistencias,
                   ROUND(100.0 * COUNT(r.id) FILTER (WHERE r.estado = 'ASISTIO')
                         / NULLIF(COUNT(r.id) FILTER (WHERE r.estado IN ('ASISTIO', 'INASISTENCIA')), 0),
                         1) AS porcentaje_asistencia
            FROM public.clases_grupales cg
            JOIN public.sucursales s ON s.id = cg.sucursal_id
            LEFT JOIN public.reservas_clases r
              ON r.clase_id = cg.id AND %s
            WHERE %s
            GROUP BY cg.id, cg.nombre_clase, s.nombre, cg.dia_semana, cg.hora_inicio, cg.cupo_maximo
            ORDER BY reservas DESC, clase
            """.formatted(rango("r.fecha_clase"), sede("cg.sucursal_id")))
    );

    public List<ReporteDefinicion> todos() {
        return reportes;
    }

    public Optional<ReporteDefinicion> buscar(String codigo) {
        return reportes.stream().filter(r -> r.codigo().equals(codigo)).findFirst();
    }

    /** Fecha local de Guatemala de una columna con zona horaria. */
    private static String local(String columna) {
        return "timezone('" + ZONA + "', " + columna + ")::date";
    }

    /** Condición de rango de fechas; si un extremo viene vacío no se aplica. */
    private static String rango(String fecha) {
        return "(CAST(:desde AS date) IS NULL OR " + fecha + " >= CAST(:desde AS date))"
             + " AND (CAST(:hasta AS date) IS NULL OR " + fecha + " <= CAST(:hasta AS date))";
    }

    /** Condición por sede; si no se elige sede no se aplica. */
    private static String sede(String columna) {
        return "(CAST(:sucursalId AS integer) IS NULL OR " + columna + " = CAST(:sucursalId AS integer))";
    }
}
