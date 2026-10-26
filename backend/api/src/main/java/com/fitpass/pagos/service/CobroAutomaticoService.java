
package com.fitpass.pagos.service;

import com.fitpass.mensajeria.service.OutboxService;
import com.fitpass.pagos.repository.PagoRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class CobroAutomaticoService {

    private final JdbcTemplate jdbc;
    private final PagoRepository pagos;
    private final OutboxService outbox;
    private final TransactionTemplate transacciones;

    @Value("${fitpass.cobros.automaticos-habilitados:false}")
    private boolean habilitados;

    @Value("${fitpass.cobros.dias-gracia:5}")
    private int diasGracia;

    @Value("${fitpass.cobros.zona-horaria:America/Guatemala}")
    private String zonaHoraria;

    public CobroAutomaticoService(
            JdbcTemplate jdbc,
            PagoRepository pagos,
            OutboxService outbox,
            TransactionTemplate transacciones) {

        this.jdbc = jdbc;
        this.pagos = pagos;
        this.outbox = outbox;
        this.transacciones = transacciones;
    }

    private LocalDate hoyGuatemala() {
        return LocalDate.now(ZoneId.of(zonaHoraria));
    }

    private LocalDate calcularVencimiento(
            LocalDate periodo,
            int diaCorte) {

        return periodo.withDayOfMonth(
            Math.min(diaCorte, periodo.lengthOfMonth())
        );
    }

    @Scheduled(
        cron = "${fitpass.cobros.cron:0 0 6 * * *}",
        zone = "${fitpass.cobros.zona-horaria:America/Guatemala}"
    )
    public void ejecutarProgramado() {

        if (!habilitados) {
            return;
        }

        ejecutarRevision();
    }

    public void ejecutarRevision() {

        LocalDate hoy = hoyGuatemala();
        LocalDate mes = hoy.withDayOfMonth(1);

        // Crear solamente el periodo del mes actual.
        jdbc.update("""
            INSERT INTO public.periodos_facturacion (
                membresia_id,
                periodo,
                fecha_vencimiento,
                estado
            )
            SELECT
                m.id,
                ?,
                LEAST(
                    ?::date + (m.dia_corte_mensual - 1),
                    (?::date + INTERVAL '1 month - 1 day')::date
                ),
                'PENDIENTE'
            FROM public.membresias m
            WHERE m.estado IN (
                'ACTIVA',
                'SUSPENDIDA_IMPAGO'
            )
            AND m.fecha_inicio <= LEAST(
                ?::date + (m.dia_corte_mensual - 1),
                (?::date + INTERVAL '1 month - 1 day')::date
            )
            ON CONFLICT (membresia_id, periodo)
            DO NOTHING
            """,
            mes, mes, mes, mes, mes
        );

        List<Integer> membresias = jdbc.queryForList("""
            SELECT DISTINCT m.id
            FROM public.membresias m
            JOIN public.periodos_facturacion p
              ON p.membresia_id = m.id
            WHERE m.estado IN (
                'ACTIVA',
                'SUSPENDIDA_IMPAGO'
            )
            AND p.fecha_vencimiento <= ?
            ORDER BY m.id
            """,
            Integer.class,
            hoy
        );

        for (Integer membresiaId : membresias) {

            try {
                transacciones.executeWithoutResult(
                    status -> procesarMembresia(
                        membresiaId, hoy
                    )
                );
            } catch (Exception e) {
                System.err.println(
                    "[FitPass] Error en membresia "
                    + membresiaId + ": " + e.getMessage()
                );
            }
        }
    }

    private void procesarMembresia(
            Integer membresiaId,
            LocalDate hoy) {

        var membresiaOpt = pagos.bloquearMembresia(
            membresiaId
        );

        if (membresiaOpt.isEmpty()) {
            return;
        }

        var membresia = membresiaOpt.get();

        if (!"ACTIVA".equals(membresia.estado())
                && !"SUSPENDIDA_IMPAGO".equals(
                    membresia.estado())) {
            return;
        }

        List<Integer> pendientes = jdbc.queryForList("""
            SELECT id
            FROM public.periodos_facturacion
            WHERE membresia_id = ?
              AND estado = 'PENDIENTE'
              AND fecha_vencimiento <= ?
              AND (
                  fecha_operativa_ultimo_intento IS NULL
                  OR fecha_operativa_ultimo_intento < ?
              )
              AND (
                  ultimo_intento IS NULL
                  OR (ultimo_intento AT TIME ZONE ?)::date < ?
              )
            ORDER BY periodo
            FOR UPDATE
            """,
            Integer.class,
            membresiaId,
            hoy,
            hoy,
            zonaHoraria,
            hoy
        );

        for (Integer periodoId : pendientes) {

            Integer metodoId = jdbc.queryForObject("""
                SELECT metodo_pago_id
                FROM public.membresias
                WHERE id = ?
                """,
                Integer.class,
                membresiaId
            );

            if (metodoId == null) {
                break;
            }

            var metodoOpt = pagos.bloquearMetodo(metodoId);

            if (metodoOpt.isEmpty()) {
                break;
            }

            var metodo = metodoOpt.get();

            if (!metodo.clienteId().equals(
                    membresia.clienteId())) {

                throw new IllegalStateException(
                    "Metodo de pago de otro cliente"
                );
            }

            BigDecimal monto = membresia.precioMensual();

            if (monto == null || monto.signum() <= 0) {
                throw new IllegalStateException(
                    "Monto mensual invalido"
                );
            }

            // Comprobar si ya existe un pago exitoso.
            Boolean pagado = jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM public.periodos_facturacion p
                    WHERE p.id = ?
                      AND (
                          p.estado = 'PAGADO'
                          OR p.cobro_exitoso_id IS NOT NULL
                          OR EXISTS (
                              SELECT 1
                              FROM public.cobros_automaticos c
                              WHERE c.periodo_facturacion_id = p.id
                                AND c.estado_transaccion = 'EXITOSO'
                          )
                      )
                )
                """,
                Boolean.class,
                periodoId
            );

            if (Boolean.TRUE.equals(pagado)) {

                jdbc.update("""
                    UPDATE public.periodos_facturacion p
                    SET estado = 'PAGADO',
                        cobro_exitoso_id = COALESCE(
                            p.cobro_exitoso_id,
                            (
                                SELECT c.id
                                FROM public.cobros_automaticos c
                                WHERE c.periodo_facturacion_id = p.id
                                  AND c.estado_transaccion = 'EXITOSO'
                                ORDER BY c.id DESC
                                LIMIT 1
                            )
                        )
                    WHERE p.id = ?
                    """,
                    periodoId
                );

                continue;
            }

            BigDecimal saldo = metodo.saldo() == null
                ? BigDecimal.ZERO
                : metodo.saldo();

            boolean exitoso = saldo.compareTo(monto) >= 0;

            String estadoCobro = exitoso
                ? "EXITOSO"
                : "RECHAZADO_FONDOS";

            // El cobro queda vinculado al periodo.
            Integer cobroId = pagos.registrarCobro(
                membresiaId,
                metodoId,
                "MENSUALIDAD",
                monto,
                estadoCobro,
                periodoId
            );

            jdbc.update("""
                UPDATE public.periodos_facturacion
                SET intentos = intentos + 1,
                    ultimo_intento = NOW(),
                    fecha_operativa_ultimo_intento = ?
                WHERE id = ?
                """,
                hoy,
                periodoId
            );

            if (exitoso) {

                pagos.descontarSaldo(metodoId, monto);

                jdbc.update("""
                    UPDATE public.periodos_facturacion
                    SET estado = 'PAGADO',
                        cobro_exitoso_id = ?
                    WHERE id = ?
                    """,
                    cobroId,
                    periodoId
                );
            }

            outbox.registrarEventoCobro(
                cobroId,
                estadoCobro
            );

            System.out.println(
                "[FitPass] Membresia " + membresiaId
                + " | Periodo " + periodoId
                + " | Cobro " + cobroId
                + " | " + estadoCobro
            );

            if (!exitoso) {
                break;
            }
        }

        actualizarMorosidad(membresiaId, hoy);
    }

    private void actualizarMorosidad(
            Integer membresiaId,
            LocalDate hoy) {

        Boolean deudaFueraDeGracia = jdbc.queryForObject("""
            SELECT EXISTS (
                SELECT 1
                FROM public.periodos_facturacion
                WHERE membresia_id = ?
                  AND estado = 'PENDIENTE'
                  AND fecha_vencimiento < ?
            )
            """,
            Boolean.class,
            membresiaId,
            hoy.minusDays(diasGracia)
        );

        if (Boolean.TRUE.equals(deudaFueraDeGracia)) {

            jdbc.update("""
                UPDATE public.membresias
                SET estado = 'SUSPENDIDA_IMPAGO'
                WHERE id = ?
                  AND estado = 'ACTIVA'
                """,
                membresiaId
            );

            return;
        }

        Boolean existenDeudasVencidas = jdbc.queryForObject("""
            SELECT EXISTS (
                SELECT 1
                FROM public.periodos_facturacion
                WHERE membresia_id = ?
                  AND estado = 'PENDIENTE'
                  AND fecha_vencimiento <= ?
            )
            """,
            Boolean.class,
            membresiaId,
            hoy
        );

        if (!Boolean.TRUE.equals(existenDeudasVencidas)) {

            jdbc.update("""
                UPDATE public.membresias
                SET estado = 'ACTIVA'
                WHERE id = ?
                  AND estado = 'SUSPENDIDA_IMPAGO'
                """,
                membresiaId
            );
        }
    }

    public Map<String, Object> vistaPrevia(
            Integer membresiaId,
            LocalDate fecha) {

        validarFechaPrueba(fecha);

        return jdbc.queryForObject("""
            SELECT
                m.id AS membresia_id,
                m.estado,
                m.metodo_pago_id,
                p.precio_mensual,
                mp.saldo_simulado,
                m.dia_corte_mensual,
                m.fecha_inicio
            FROM public.membresias m
            JOIN public.planes p
              ON p.id = m.plan_id
            LEFT JOIN public.metodos_pago_cliente mp
              ON mp.id = m.metodo_pago_id
             AND mp.cliente_id = m.cliente_id
             AND mp.activo = true
            WHERE m.id = ?
            """,
            (rs, rowNum) -> {

                LocalDate inicio = rs.getDate(
                    "fecha_inicio"
                ).toLocalDate();

                LocalDate periodo = fecha.withDayOfMonth(1);

                LocalDate vencimiento = calcularVencimiento(
                    periodo,
                    rs.getInt("dia_corte_mensual")
                );

                boolean correspondeCobro =
                    !fecha.isBefore(inicio)
                    && !fecha.isBefore(vencimiento);

                return Map.<String, Object>of(
                    "membresiaId", membresiaId,
                    "fechaSimulada", fecha.toString(),
                    "estado", rs.getString("estado"),
                    "precioMensual",
                        rs.getBigDecimal("precio_mensual"),
                    "correspondeCobro", correspondeCobro,
                    "mensaje",
                        "Vista previa sin modificar saldos"
                );
            },
            membresiaId
        );
    }

    private void validarFechaPrueba(LocalDate fecha) {

        LocalDate hoy = hoyGuatemala();

        if (fecha == null
                || fecha.isBefore(hoy)
                || fecha.isAfter(hoy.plusDays(45))) {

            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "La fecha debe estar entre hoy y los proximos 45 dias"
            );
        }
    }

    public Map<String, Object> ejecutarPrueba(
            Integer membresiaId,
            LocalDate fecha) {

        validarFechaPrueba(fecha);

        return transacciones.execute(status -> {

            var membresia = pagos.bloquearMembresia(
                membresiaId
            ).orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Membresia no encontrada"
                )
            );

            if (!"ACTIVA".equals(membresia.estado())) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La membresia no esta activa"
                );
            }

            LocalDate inicio = jdbc.queryForObject("""
                SELECT fecha_inicio
                FROM public.membresias
                WHERE id = ?
                """,
                LocalDate.class,
                membresiaId
            );

            Integer diaCorte = jdbc.queryForObject("""
                SELECT dia_corte_mensual
                FROM public.membresias
                WHERE id = ?
                """,
                Integer.class,
                membresiaId
            );

            LocalDate periodo = fecha.withDayOfMonth(1);

            LocalDate vencimiento = calcularVencimiento(
                periodo,
                diaCorte
            );

            if (inicio == null
                    || fecha.isBefore(inicio)
                    || fecha.isBefore(vencimiento)
                    || vencimiento.isBefore(inicio)) {

                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La mensualidad aun no ha vencido"
                );
            }

            jdbc.update("""
                INSERT INTO public.periodos_facturacion (
                    membresia_id,
                    periodo,
                    fecha_vencimiento,
                    estado
                )
                VALUES (?, ?, ?, 'PENDIENTE')
                ON CONFLICT (membresia_id, periodo)
                DO NOTHING
                """,
                membresiaId,
                periodo,
                vencimiento
            );

            // Obtener y bloquear el periodo.
            List<Map<String, Object>> filas =
                jdbc.queryForList("""
                    SELECT id, estado
                    FROM public.periodos_facturacion
                    WHERE membresia_id = ?
                      AND periodo = ?
                    FOR UPDATE
                    """,
                    membresiaId,
                    periodo
                );

            if (filas.isEmpty()) {
                throw new IllegalStateException(
                    "No se encontro el periodo"
                );
            }

            Integer periodoId = ((Number)
                filas.get(0).get("id")).intValue();

            // No cobrar si ya esta pagado.
            if (pagos.periodoFacturacionPagado(periodoId)) {

                return Map.<String, Object>of(
                    "membresiaId", membresiaId,
                    "periodo", periodo.toString(),
                    "estado", "YA_PAGADO"
                );
            }

            // Evitar repetir la prueba en la misma fecha.
            Boolean intentado = jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM public.periodos_facturacion
                    WHERE id = ?
                      AND fecha_operativa_ultimo_intento = ?
                )
                """,
                Boolean.class,
                periodoId,
                fecha
            );

            if (Boolean.TRUE.equals(intentado)) {

                return Map.<String, Object>of(
                    "membresiaId", membresiaId,
                    "periodo", periodo.toString(),
                    "estado", "YA_INTENTADO"
                );
            }

            Integer metodoId = jdbc.queryForObject("""
                SELECT metodo_pago_id
                FROM public.membresias
                WHERE id = ?
                """,
                Integer.class,
                membresiaId
            );

            if (metodoId == null) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La membresia no tiene metodo de pago"
                );
            }

            var metodo = pagos.bloquearMetodo(
                metodoId
            ).orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Metodo de pago inactivo o inexistente"
                )
            );

            if (!metodo.clienteId().equals(
                    membresia.clienteId())) {

                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Metodo de pago de otro cliente"
                );
            }

            BigDecimal monto = membresia.precioMensual();

            if (monto == null || monto.signum() <= 0) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Precio mensual invalido"
                );
            }

            BigDecimal saldo = metodo.saldo() == null
                ? BigDecimal.ZERO
                : metodo.saldo();

            boolean exitoso = saldo.compareTo(monto) >= 0;

            String estadoCobro = exitoso
                ? "EXITOSO"
                : "RECHAZADO_FONDOS";

            Integer cobroId = pagos.registrarCobro(
                membresiaId,
                metodoId,
                "MENSUALIDAD",
                monto,
                estadoCobro,
                periodoId
            );

            jdbc.update("""
                UPDATE public.periodos_facturacion
                SET intentos = intentos + 1,
                    ultimo_intento = NOW(),
                    fecha_operativa_ultimo_intento = ?
                WHERE id = ?
                """,
                fecha,
                periodoId
            );

            if (exitoso) {

                pagos.descontarSaldo(metodoId, monto);

                jdbc.update("""
                    UPDATE public.periodos_facturacion
                    SET estado = 'PAGADO',
                        cobro_exitoso_id = ?
                    WHERE id = ?
                    """,
                    cobroId,
                    periodoId
                );
            }

            outbox.registrarEventoCobro(
                cobroId,
                estadoCobro
            );

            return Map.<String, Object>of(
                "membresiaId", membresiaId,
                "periodo", periodo.toString(),
                "cobroId", cobroId,
                "estado", estadoCobro,
                "monto", monto
            );
        });
    }

    public Map<String, Object> simularMorosidad(
            Integer membresiaId,
            LocalDate fecha) {

        validarFechaPrueba(fecha);

        return transacciones.execute(status -> {

            // Revertir todos los cambios al terminar.
            status.setRollbackOnly();

            var membresia = pagos.bloquearMembresia(
                membresiaId
            ).orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Membresia no encontrada"
                )
            );

            if (!"ACTIVA".equals(membresia.estado())) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La membresia debe estar ACTIVA"
                );
            }

            Map<String, Object> datos = jdbc.queryForMap("""
                SELECT
                    fecha_inicio,
                    dia_corte_mensual,
                    metodo_pago_id
                FROM public.membresias
                WHERE id = ?
                """,
                membresiaId
            );

            LocalDate inicio = ((java.sql.Date)
                Objects.requireNonNull(
                    datos.get("fecha_inicio")
                )).toLocalDate();

            int diaCorte = ((Number)
                datos.get("dia_corte_mensual")).intValue();

            Integer metodoId = (Integer)
                datos.get("metodo_pago_id");

            if (metodoId == null) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La membresia no tiene metodo de pago"
                );
            }

            var metodo = pagos.bloquearMetodo(
                metodoId
            ).orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Metodo de pago inactivo"
                )
            );

            if (!metodo.clienteId().equals(
                    membresia.clienteId())) {

                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Metodo de pago de otro cliente"
                );
            }

            BigDecimal monto = membresia.precioMensual();

            if (monto == null || monto.signum() <= 0) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Precio mensual invalido"
                );
            }

            LocalDate periodo = fecha.withDayOfMonth(1);

            LocalDate vencimiento = calcularVencimiento(
                periodo,
                diaCorte
            );

            if (fecha.isBefore(inicio)
                    || vencimiento.isBefore(inicio)
                    || fecha.isBefore(
                        vencimiento.plusDays(diasGracia + 1L))) {

                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Aun no se supera el periodo de gracia"
                );
            }

            Boolean pagado = jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM public.periodos_facturacion
                    WHERE membresia_id = ?
                      AND periodo = ?
                      AND estado = 'PAGADO'
                )
                """,
                Boolean.class,
                membresiaId,
                periodo
            );

            if (Boolean.TRUE.equals(pagado)) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El periodo ya esta pagado"
                );
            }

            jdbc.update("""
                INSERT INTO public.periodos_facturacion (
                    membresia_id,
                    periodo,
                    fecha_vencimiento,
                    estado
                )
                VALUES (?, ?, ?, 'PENDIENTE')
                ON CONFLICT (membresia_id, periodo)
                DO NOTHING
                """,
                membresiaId,
                periodo,
                vencimiento
            );

            // Se simulan fondos insuficientes.
            BigDecimal saldoSimulado = BigDecimal.ZERO;

            boolean rechazado =
                saldoSimulado.compareTo(monto) < 0;

            if (!rechazado) {
                throw new IllegalStateException(
                    "La prueba esperaba fondos insuficientes"
                );
            }

            // Actualizar el periodo por membresia y mes.
            jdbc.update("""
                UPDATE public.periodos_facturacion
                SET intentos = intentos + 1,
                    ultimo_intento = NOW(),
                    fecha_operativa_ultimo_intento = ?
                WHERE membresia_id = ?
                  AND periodo = ?
                """,
                fecha,
                membresiaId,
                periodo
            );

            jdbc.update("""
                UPDATE public.membresias
                SET estado = 'SUSPENDIDA_IMPAGO'
                WHERE id = ?
                  AND estado = 'ACTIVA'
                """,
                membresiaId
            );

            String estadoSuspendido =
                jdbc.queryForObject("""
                    SELECT estado
                    FROM public.membresias
                    WHERE id = ?
                    """,
                    String.class,
                    membresiaId
                );

            // Simular el pago del periodo.
            jdbc.update("""
                UPDATE public.periodos_facturacion
                SET estado = 'PAGADO'
                WHERE membresia_id = ?
                  AND periodo = ?
                  AND estado = 'PENDIENTE'
                """,
                membresiaId,
                periodo
            );

            // Reactivar si no quedan deudas vencidas.
            jdbc.update("""
                UPDATE public.membresias
                SET estado = 'ACTIVA'
                WHERE id = ?
                  AND estado = 'SUSPENDIDA_IMPAGO'
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.periodos_facturacion
                      WHERE membresia_id = ?
                        AND estado = 'PENDIENTE'
                        AND fecha_vencimiento <= ?
                  )
                """,
                membresiaId,
                membresiaId,
                fecha
            );

            String estadoReactivado =
                jdbc.queryForObject("""
                    SELECT estado
                    FROM public.membresias
                    WHERE id = ?
                    """,
                    String.class,
                    membresiaId
                );

            Map<String, Object> respuesta =
                new LinkedHashMap<>();

            respuesta.put("membresiaId", membresiaId);
            respuesta.put("periodo", periodo.toString());
            respuesta.put("fechaSimulada", fecha.toString());
            respuesta.put("monto", monto);
            respuesta.put("pagoRechazado", rechazado);
            respuesta.put(
                "estadoTrasImpago", estadoSuspendido
            );
            respuesta.put(
                "estadoTrasRegularizacion", estadoReactivado
            );
            respuesta.put("cambiosPersistidos", false);
            respuesta.put(
                "mensaje",
                "Simulacion revertida; sin cargos ni eventos reales"
            );

            return respuesta;
        });
    }

    public Map<String, Object> procesarPendientesDev(
            Integer membresiaId) {

        LocalDate hoy = hoyGuatemala();

        return transacciones.execute(status -> {

            // Procesar solo periodos existentes.
            procesarMembresia(membresiaId, hoy);

            String estadoMembresia =
                jdbc.queryForObject("""
                    SELECT estado
                    FROM public.membresias
                    WHERE id = ?
                    """,
                    String.class,
                    membresiaId
                );

            List<Map<String, Object>> periodos =
                jdbc.queryForList("""
                    SELECT
                        periodo,
                        fecha_vencimiento,
                        estado,
                        intentos,
                        cobro_exitoso_id
                    FROM public.periodos_facturacion
                    WHERE membresia_id = ?
                    ORDER BY periodo
                    """,
                    membresiaId
                );

            return Map.<String, Object>of(
                "membresiaId", membresiaId,
                "fechaProceso", hoy.toString(),
                "estadoMembresia", estadoMembresia,
                "periodos", periodos
            );
        });
    }
}
