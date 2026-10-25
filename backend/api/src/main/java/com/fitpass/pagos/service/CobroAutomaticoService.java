package com.fitpass.pagos.service;

import com.fitpass.mensajeria.service.OutboxService;
import com.fitpass.pagos.repository.PagoRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
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

    LocalDate hoy = LocalDate.now(
        ZoneId.of(zonaHoraria)
    );

    LocalDate mes = hoy.withDayOfMonth(1);

    // Crear solo el periodo del mes actual.
    // No generar deudas retroactivas automaticamente.
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
            (?::date + (m.dia_corte_mensual - 1)),
            'PENDIENTE'
        FROM public.membresias m
        WHERE m.estado IN (
            'ACTIVA',
            'SUSPENDIDA_IMPAGO'
        )
          AND m.fecha_inicio <=
              (?::date + (m.dia_corte_mensual - 1))
        ON CONFLICT (membresia_id, periodo)
        DO NOTHING
        """,
        mes, mes, mes
    );

    List<Integer> membresias =
        jdbc.queryForList("""
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
                    membresiaId,
                    hoy
                )
            );

        } catch (Exception e) {
            System.err.println(
                "[FitPass] Error en membresia "
                + membresiaId
                + ": "
                + e.getMessage()
            );
        }
    }
}

    private void procesarMembresia(
        Integer membresiaId,
        LocalDate hoy) {

    var membresiaOpt =
        pagos.bloquearMembresia(membresiaId);

    if (membresiaOpt.isEmpty()) {
        return;
    }

    var membresia = membresiaOpt.get();

    if (!"ACTIVA".equals(membresia.estado())
            && !"SUSPENDIDA_IMPAGO".equals(
                membresia.estado())) {
        return;
    }

    List<Integer> pendientes =
        jdbc.queryForList("""
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

        Integer metodoId =
            jdbc.queryForObject("""
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

        var metodoOpt =
            pagos.bloquearMetodo(metodoId);

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

        BigDecimal monto =
            membresia.precioMensual();

        if (monto == null
                || monto.signum() <= 0) {

            throw new IllegalStateException(
                "Monto mensual invalido"
            );
        }

        // Defensa adicional contra duplicados.
        Boolean pagado =
            jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM public.cobros_automaticos
                    WHERE periodo_facturacion_id = ?
                      AND estado_transaccion = 'EXITOSO'
                )
                """,
                Boolean.class,
                periodoId
            );

        if (Boolean.TRUE.equals(pagado)) {

            // Si existe un cobro exitoso vinculado,
            // reparar el estado del periodo.
            Integer cobroExistente =
                jdbc.queryForObject("""
                    SELECT id
                    FROM public.cobros_automaticos
                    WHERE periodo_facturacion_id = ?
                      AND estado_transaccion = 'EXITOSO'
                    LIMIT 1
                    """,
                    Integer.class,
                    periodoId
                );

            jdbc.update("""
                UPDATE public.periodos_facturacion
                SET estado = 'PAGADO',
                    cobro_exitoso_id = ?
                WHERE id = ?
                """,
                cobroExistente,
                periodoId
            );

            continue;
        }

        BigDecimal saldo =
            metodo.saldo() == null
                ? BigDecimal.ZERO
                : metodo.saldo();

        boolean exitoso =
            saldo.compareTo(monto) >= 0;

        String estadoCobro = exitoso
            ? "EXITOSO"
            : "RECHAZADO_FONDOS";

        Integer cobroId =
            pagos.registrarCobro(
                membresiaId,
                metodoId,
                "MENSUALIDAD",
                monto,
                estadoCobro
            );

        // Vincular el cobro al periodo exacto.
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
            hoy,
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
            "[FitPass] Membresia "
            + membresiaId
            + " | Periodo "
            + periodoId
            + " | Cobro "
            + cobroId
            + " | "
            + estadoCobro
        );

        if (!exitoso) {
            break;
        }
    }

    // Evaluar morosidad incluso cuando no
    // corresponde realizar un nuevo intento.
    actualizarMorosidad(membresiaId, hoy);
}

    private void actualizarMorosidad(
        Integer membresiaId,
        LocalDate hoy) {

    // Una deuda se considera fuera del periodo
    // de gracia cuando supera los dias permitidos.
    Boolean deudaFueraDeGracia =
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
            hoy.minusDays(diasGracia)
        );

    if (Boolean.TRUE.equals(deudaFueraDeGracia)) {

        int suspendidas = jdbc.update("""
            UPDATE public.membresias
            SET estado = 'SUSPENDIDA_IMPAGO'
            WHERE id = ?
              AND estado = 'ACTIVA'
            """,
            membresiaId
        );

        if (suspendidas > 0) {
            System.out.println(
                "[FitPass] Membresia " + membresiaId
                + " suspendida por impago"
            );
        }

        return;
    }

    // No reactivar si aun existen mensualidades
    // vencidas pendientes.
    Boolean existenDeudasVencidas =
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
            hoy
        );

    if (!Boolean.TRUE.equals(existenDeudasVencidas)) {

        int reactivadas = jdbc.update("""
            UPDATE public.membresias
            SET estado = 'ACTIVA'
            WHERE id = ?
              AND estado = 'SUSPENDIDA_IMPAGO'
            """,
            membresiaId
        );

        if (reactivadas > 0) {
            System.out.println(
                "[FitPass] Membresia " + membresiaId
                + " reactivada"
            );
        }
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
        JOIN public.planes p ON p.id = m.plan_id
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

            LocalDate vencimiento = fecha
                .withDayOfMonth(
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

    LocalDate hoy = LocalDate.now(
        ZoneId.of(zonaHoraria)
    );

    if (fecha.isBefore(hoy)
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
        LocalDate vencimiento =
            periodo.withDayOfMonth(diaCorte);

        if (fecha.isBefore(vencimiento)
                || inicio == null
                || fecha.isBefore(inicio)) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "La mensualidad aun no ha vencido"
            );
        }

        jdbc.update("""
            INSERT INTO public.periodos_facturacion (
                membresia_id, periodo,
                fecha_vencimiento, estado
            )
            VALUES (?, ?, ?, 'PENDIENTE')
            ON CONFLICT (membresia_id, periodo)
            DO NOTHING
            """,
            membresiaId,
            periodo,
            vencimiento
        );

        var filas = jdbc.queryForList("""
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

        Integer periodoId =
            ((Number) filas.get(0).get("id"))
                .intValue();

        String estadoPeriodo =
            (String) filas.get(0).get("estado");

        // Reconocer pagos manuales existentes.
        var pagosPrevios = jdbc.queryForList("""
            SELECT id
            FROM public.cobros_automaticos
            WHERE membresia_id = ?
              AND concepto = 'MENSUALIDAD'
              AND estado_transaccion = 'EXITOSO'
              AND (fecha_intento AT TIME ZONE ?)
                    ::date >= ?
              AND (fecha_intento AT TIME ZONE ?)
                    ::date < ?
            ORDER BY id DESC
            LIMIT 1
            """,
            membresiaId,
            zonaHoraria,
            periodo,
            zonaHoraria,
            periodo.plusMonths(1)
        );

        if (!pagosPrevios.isEmpty()) {
            Integer cobroPrevio =
                ((Number) pagosPrevios.get(0)
                    .get("id")).intValue();

            jdbc.update("""
                UPDATE public.periodos_facturacion
                SET estado = 'PAGADO',
                    cobro_exitoso_id = ?
                WHERE id = ?
                """,
                cobroPrevio,
                periodoId
            );

            return Map.<String, Object>of(
                "membresiaId", membresiaId,
                "periodo", periodo.toString(),
                "estado", "YA_PAGADO",
                "cobroId", cobroPrevio
            );
        }

        if ("PAGADO".equals(estadoPeriodo)) {
            return Map.<String, Object>of(
                "membresiaId", membresiaId,
                "periodo", periodo.toString(),
                "estado", "YA_PAGADO"
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

        BigDecimal monto =
            membresia.precioMensual();

        if (monto == null || monto.signum() <= 0) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Precio mensual invalido"
            );
        }

        BigDecimal saldo = metodo.saldo() == null
            ? BigDecimal.ZERO
            : metodo.saldo();

        boolean exitoso =
            saldo.compareTo(monto) >= 0;

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
            UPDATE public.periodos_facturacion
            SET intentos = intentos + 1,
                ultimo_intento = NOW()
            WHERE id = ?
            """,
            periodoId
        );

        if (exitoso) {
            pagos.descontarSaldo(
                metodoId, monto
            );

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

        // Garantiza que ninguna modificación de la
        // simulación permanezca en PostgreSQL.
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

        var datos = jdbc.queryForMap("""
            SELECT fecha_inicio, dia_corte_mensual,
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
            datos.get("dia_corte_mensual"))
            .intValue();

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
        LocalDate vencimiento =
            periodo.withDayOfMonth(diaCorte);

        if (fecha.isBefore(inicio)
                || fecha.isBefore(
                    vencimiento.plusDays(diasGracia + 1L))) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Aun no se supera el periodo de gracia"
            );
        }

        // No simular un periodo ya pagado.
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

        // Crear una mensualidad pendiente.
        jdbc.update("""
            INSERT INTO public.periodos_facturacion (
                membresia_id, periodo,
                fecha_vencimiento, estado
            )
            VALUES (?, ?, ?, 'PENDIENTE')
            ON CONFLICT (membresia_id, periodo)
            DO NOTHING
            """,
            membresiaId,
            periodo,
            vencimiento
        );

        // Simulamos fondos insuficientes sin tocar
        // el saldo real del metodo de pago.
        BigDecimal saldoSimulado = BigDecimal.ZERO;

        boolean rechazado =
            saldoSimulado.compareTo(monto) < 0;

        if (!rechazado) {
            throw new IllegalStateException(
                "La prueba esperaba fondos insuficientes"
            );
        }

        // Registrar un intento simulado.
        jdbc.update("""
            UPDATE public.periodos_facturacion
            SET intentos = intentos + 1,
                ultimo_intento = NOW()
            WHERE membresia_id = ?
              AND periodo = ?
              AND estado = 'PENDIENTE'
            """,
            membresiaId,
            periodo
        );

        // Suspender por superar los dias de gracia.
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

        // Simular regularizacion del periodo.
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

        // Reactivar solamente si no quedan
        // periodos vencidos pendientes.
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
        respuesta.put(
            "fechaSimulada", fecha.toString()
        );
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

    LocalDate hoy = LocalDate.now(
        ZoneId.of(zonaHoraria)
    );

    return transacciones.execute(status -> {

        // Solo procesar periodos que ya existen.
        // No crear mensualidades futuras.
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
                SELECT periodo,
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