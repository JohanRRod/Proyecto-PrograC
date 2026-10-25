package com.fitpass.pagos.service;

import com.fitpass.mensajeria.service.OutboxService;
import com.fitpass.pagos.repository.PagoRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@Profile("dev")
public class CobroIntegracionDevService {

    private final JdbcTemplate jdbc;
    private final PagoRepository pagos;
    private final OutboxService outbox;
    private final TransactionTemplate transacciones;

    @Value("${fitpass.cobros.dias-gracia:5}")
    private int diasGracia;

    @Value("${fitpass.cobros.zona-horaria:America/Guatemala}")
    private String zonaHoraria;

    public CobroIntegracionDevService(
            JdbcTemplate jdbc,
            PagoRepository pagos,
            OutboxService outbox,
            TransactionTemplate transacciones) {

        this.jdbc = jdbc;
        this.pagos = pagos;
        this.outbox = outbox;
        this.transacciones = transacciones;
    }

    public Map<String, Object> procesar(
            Integer membresiaId,
            LocalDate periodo,
            LocalDate fecha,
            boolean forzarRechazo) {

        LocalDate hoy = LocalDate.now(
            ZoneId.of(zonaHoraria)
        );

        if (periodo == null
                || periodo.getDayOfMonth() != 1
                || fecha == null
                || fecha.isBefore(hoy)
                || fecha.isAfter(hoy.plusDays(45))) {

            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Periodo o fecha de prueba invalidos"
            );
        }

        return transacciones.execute(status -> {

            var membresia = pagos.bloquearMembresia(
                membresiaId
            ).orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Membresia inexistente"
                )
            );

            if (!"ACTIVA".equals(membresia.estado())
                    && !"SUSPENDIDA_IMPAGO".equals(
                        membresia.estado())) {

                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Estado de membresia no permitido"
                );
            }

            Map<String, Object> datos =
                jdbc.queryForMap("""
                    SELECT fecha_inicio,
                           dia_corte_mensual,
                           metodo_pago_id
                    FROM public.membresias
                    WHERE id = ?
                    """,
                    membresiaId
                );

            LocalDate inicio =
                ((java.sql.Date) datos.get(
                    "fecha_inicio"
                )).toLocalDate();

            int diaCorte = ((Number) datos.get(
                "dia_corte_mensual"
            )).intValue();

            LocalDate vencimiento =
                periodo.withDayOfMonth(diaCorte);

            if (fecha.isBefore(vencimiento)
                    || periodo.isBefore(
                        inicio.withDayOfMonth(1))
                    || vencimiento.isBefore(inicio)) {

                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Periodo no exigible para la membresia"
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

            Map<String, Object> fila =
                jdbc.queryForMap("""
                    SELECT id,
                           estado,
                           fecha_operativa_ultimo_intento
                    FROM public.periodos_facturacion
                    WHERE membresia_id = ?
                      AND periodo = ?
                    FOR UPDATE
                    """,
                    membresiaId,
                    periodo
                );

            long periodoId = ((Number) fila.get(
                "id"
            )).longValue();

            String estadoPeriodo =
                (String) fila.get("estado");

            if ("PAGADO".equals(estadoPeriodo)) {
                return Map.<String, Object>of(
                    "membresiaId", membresiaId,
                    "periodo", periodo.toString(),
                    "resultado", "YA_PAGADO"
                );
            }

            java.sql.Date ultimo =
                (java.sql.Date) fila.get(
                    "fecha_operativa_ultimo_intento"
                );

            if (ultimo != null
                    && !fecha.isAfter(
                        ultimo.toLocalDate())) {

                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ya se intento cobrar en esa fecha "
                    + "o en una posterior"
                );
            }

            Integer metodoId = (Integer)
                datos.get("metodo_pago_id");

            if (metodoId == null) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "No hay metodo de pago"
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
                    "Metodo pertenece a otro cliente"
                );
            }

            BigDecimal monto =
                membresia.precioMensual();

            if (monto == null
                    || monto.signum() <= 0) {

                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Monto invalido"
                );
            }

            BigDecimal saldo =
                metodo.saldo() == null
                    ? BigDecimal.ZERO
                    : metodo.saldo();

            boolean exitoso =
                !forzarRechazo
                && saldo.compareTo(monto) >= 0;

            String estadoCobro = exitoso
                ? "EXITOSO"
                : "RECHAZADO_FONDOS";

            Integer cobroId = pagos.registrarCobro(
                membresiaId,
                metodoId,
                "MENSUALIDAD",
                monto,
                estadoCobro
            );

            jdbc.update("""
                UPDATE public.cobros_automaticos
                SET periodo_facturacion_id = ?
                WHERE id = ?
                """,
                periodoId,
                cobroId
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

                pagos.descontarSaldo(
                    metodoId,
                    monto
                );

                jdbc.update("""
                    UPDATE public.periodos_facturacion
                    SET estado = 'PAGADO',
                        cobro_exitoso_id = ?
                    WHERE id = ?
                      AND estado = 'PENDIENTE'
                    """,
                    cobroId,
                    periodoId
                );
            }

            // Suspender si existe una deuda
            // que supero los dias de gracia.
            Boolean deudaGrave =
                jdbc.queryForObject("""
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
                    fecha.minusDays(diasGracia)
                );

            if (Boolean.TRUE.equals(deudaGrave)) {

                jdbc.update("""
                    UPDATE public.membresias
                    SET estado = 'SUSPENDIDA_IMPAGO'
                    WHERE id = ?
                      AND estado = 'ACTIVA'
                    """,
                    membresiaId
                );

            } else {

                Boolean deudaVencida =
                    jdbc.queryForObject("""
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
                        fecha
                    );

                if (!Boolean.TRUE.equals(
                        deudaVencida)) {

                    jdbc.update("""
                        UPDATE public.membresias
                        SET estado = 'ACTIVA'
                        WHERE id = ?
                          AND estado =
                              'SUSPENDIDA_IMPAGO'
                        """,
                        membresiaId
                    );
                }
            }

            outbox.registrarEventoCobro(
                cobroId,
                estadoCobro
            );

            String estadoFinal =
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

            respuesta.put(
                "membresiaId", membresiaId
            );
            respuesta.put(
                "periodo", periodo.toString()
            );
            respuesta.put(
                "fechaOperativa", fecha.toString()
            );
            respuesta.put("cobroId", cobroId);
            respuesta.put(
                "resultado", estadoCobro
            );
            respuesta.put(
                "estadoMembresia", estadoFinal
            );
            respuesta.put("monto", monto);
            respuesta.put(
                "saldoDescontado", exitoso
            );

            return respuesta;
        });
    }
}