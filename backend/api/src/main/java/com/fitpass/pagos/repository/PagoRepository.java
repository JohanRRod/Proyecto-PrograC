
package com.fitpass.pagos.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Repository
public class PagoRepository {

    private final JdbcTemplate jdbc;

    public PagoRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record DatosMembresia(
        Integer id,
        UUID clienteId,
        String estado,
        BigDecimal precioMensual
    ) {}

    public record DatosMetodo(
        Integer id,
        UUID clienteId,
        BigDecimal saldo
    ) {}

    public record DatosPenalizacion(
        Integer id,
        BigDecimal monto
    ) {}

    public boolean clienteExiste(UUID clienteId) {
        Boolean existe = jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM public.clientes WHERE id = ?)",
            Boolean.class,
            clienteId
        );
        return Boolean.TRUE.equals(existe);
    }

    public Integer registrarMetodo(
            UUID clienteId,
            String tipoCuenta,
            String banco,
            String ultimos,
            String titular) {

        return jdbc.queryForObject("""
            INSERT INTO public.metodos_pago_cliente (
                cliente_id, tipo_cuenta, banco_emisor,
                ultimos_cuatro_digitos, titular,
                token_pasarela_simulado,
                saldo_simulado, es_predeterminado, activo
            )
            VALUES (?, ?, ?, ?, ?, ?, 5000.00, false, true)
            RETURNING id
            """,
            Integer.class,
            clienteId,
            tipoCuenta,
            banco,
            ultimos,
            titular,
            "SIM-" + UUID.randomUUID()
        );
    }

    public List<Map<String, Object>> listarMetodos(UUID clienteId) {
        return jdbc.queryForList("""
            SELECT id, cliente_id, tipo_cuenta,
                   banco_emisor, ultimos_cuatro_digitos,
                   es_predeterminado, activo
            FROM public.metodos_pago_cliente
            WHERE cliente_id = ?
            ORDER BY id
            """,
            clienteId
        );
    }

    public Optional<DatosMembresia> bloquearMembresia(Integer id) {
        return jdbc.query("""
            SELECT m.id, m.cliente_id, m.estado,
                   p.precio_mensual
            FROM public.membresias m
            JOIN public.planes p ON p.id = m.plan_id
            WHERE m.id = ?
            FOR UPDATE OF m
            """,
            (rs, row) -> new DatosMembresia(
                rs.getInt("id"),
                rs.getObject("cliente_id", UUID.class),
                rs.getString("estado"),
                rs.getBigDecimal("precio_mensual")
            ),
            id
        ).stream().findFirst();
    }

    public Optional<DatosMetodo> bloquearMetodo(Integer id) {
        return jdbc.query("""
            SELECT id, cliente_id, saldo_simulado
            FROM public.metodos_pago_cliente
            WHERE id = ? AND activo = true
            FOR UPDATE
            """,
            (rs, row) -> new DatosMetodo(
                rs.getInt("id"),
                rs.getObject("cliente_id", UUID.class),
                rs.getBigDecimal("saldo_simulado")
            ),
            id
        ).stream().findFirst();
    }

    public boolean mensualidadPagadaEsteMes(Integer membresiaId) {
        Boolean existe = jdbc.queryForObject("""
            SELECT EXISTS (
                SELECT 1 FROM public.cobros_automaticos
                WHERE membresia_id = ?
                  AND concepto = 'MENSUALIDAD'
                  AND estado_transaccion = 'EXITOSO'
                  AND fecha_intento >= date_trunc(
                      'month', CURRENT_TIMESTAMP
                  )
                  AND fecha_intento < date_trunc(
                      'month', CURRENT_TIMESTAMP
                  ) + INTERVAL '1 month'
            )
            """,
            Boolean.class,
            membresiaId
        );

        return Boolean.TRUE.equals(existe);
    }

    public Optional<DatosPenalizacion> penalizacionPendiente(
            Integer membresiaId) {

        return jdbc.query("""
            SELECT id, monto_penalizacion_calculado
            FROM public.cancelaciones_membresia
            WHERE membresia_id = ?
              AND cobro_penalizacion_id IS NULL
              AND monto_penalizacion_calculado > 0
            ORDER BY id DESC
            LIMIT 1
            FOR UPDATE
            """,
            (rs, row) -> new DatosPenalizacion(
                rs.getInt("id"),
                rs.getBigDecimal("monto_penalizacion_calculado")
            ),
            membresiaId
        ).stream().findFirst();
    }

    public Integer registrarCobro(
            Integer membresiaId,
            Integer metodoId,
            String concepto,
            BigDecimal monto,
            String estado) {

        return jdbc.queryForObject("""
            INSERT INTO public.cobros_automaticos (
                membresia_id, metodo_pago_id,
                concepto, monto_bruto, descuento_aplicado,
                monto_total_cobrado, fecha_intento,
                estado_transaccion, referencia_transaccion
            )
            VALUES (?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, ?, ?)
            RETURNING id
            """,
            Integer.class,
            membresiaId,
            metodoId,
            concepto,
            monto,
            "EXITOSO".equals(estado) ? monto : BigDecimal.ZERO,
            estado,
            "FITPASS-" + UUID.randomUUID()
        );
    }



public Integer registrarCobro(
        Integer membresiaId,
        Integer metodoId,
        String concepto,
        BigDecimal monto,
        String estado,
        Integer periodoFacturacionId) {

    return jdbc.queryForObject("""
        INSERT INTO public.cobros_automaticos (
            membresia_id,
            metodo_pago_id,
            concepto,
            monto_bruto,
            descuento_aplicado,
            monto_total_cobrado,
            fecha_intento,
            estado_transaccion,
            referencia_transaccion,
            periodo_facturacion_id
        )
        VALUES (?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, ?, ?, ?)
        RETURNING id
        """,
        Integer.class,
        membresiaId,
        metodoId,
        concepto,
        monto,
        "EXITOSO".equals(estado)
            ? monto
            : BigDecimal.ZERO,
        estado,
        "FITPASS-" + UUID.randomUUID(),
        periodoFacturacionId
    );
}


public boolean periodoFacturacionPagado(Integer periodoId) {
    Boolean pagado = jdbc.queryForObject("""
        SELECT EXISTS (
            SELECT 1
            FROM public.periodos_facturacion p
            WHERE p.id = ?
              AND (
                  p.estado = 'PAGADO'
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

    return Boolean.TRUE.equals(pagado);
}



    public void descontarSaldo(Integer metodoId, BigDecimal monto) {
        jdbc.update("""
            UPDATE public.metodos_pago_cliente
            SET saldo_simulado = saldo_simulado - ?
            WHERE id = ?
            """,
            monto,
            metodoId
        );
    }

    public void completarCancelacion(
            Integer cancelacionId,
            Integer cobroId,
            Integer membresiaId) {

        jdbc.update("""
            UPDATE public.cancelaciones_membresia
            SET cobro_penalizacion_id = ?
            WHERE id = ?
              AND cobro_penalizacion_id IS NULL
            """,
            cobroId,
            cancelacionId
        );

        jdbc.update("""
            UPDATE public.membresias
            SET estado = 'CANCELADA',
                descuento_automatico_activo = false
            WHERE id = ? AND estado = 'ACTIVA'
            """,
            membresiaId
        );
    }

    public List<Map<String, Object>> historial(UUID clienteId) {
        return jdbc.queryForList("""
            SELECT c.id, c.membresia_id, c.concepto,
                   c.monto_bruto, c.descuento_aplicado,
                   c.monto_total_cobrado, c.fecha_intento,
                   c.estado_transaccion, c.referencia_transaccion
            FROM public.cobros_automaticos c
            JOIN public.membresias m
              ON m.id = c.membresia_id
            WHERE m.cliente_id = ?
            ORDER BY c.fecha_intento DESC, c.id DESC
            """,
            clienteId
        );
    }

    public Optional<Map<String, Object>> obtenerCobro(Integer id) {
        return jdbc.queryForList("""
            SELECT id, membresia_id, concepto,
                   monto_bruto, descuento_aplicado,
                   monto_total_cobrado, fecha_intento,
                   estado_transaccion, referencia_transaccion
            FROM public.cobros_automaticos
            WHERE id = ?
            """,
            id
        ).stream().findFirst();
    }

    
public Integer obtenerOCrearPeriodoFacturacion(
        Integer membresiaId) {

    java.time.LocalDate hoy = java.time.LocalDate.now(
        java.time.ZoneId.of("America/Guatemala")
    );

    java.time.LocalDate periodo = hoy.withDayOfMonth(1);

    Integer diaCorte = jdbc.queryForObject("""
        SELECT dia_corte_mensual
        FROM public.membresias
        WHERE id = ?
        """,
        Integer.class,
        membresiaId
    );

   LocalDate vencimiento = periodo.withDayOfMonth(
    Math.min(diaCorte, periodo.lengthOfMonth())
);

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

    return jdbc.queryForObject("""
        SELECT id
        FROM public.periodos_facturacion
        WHERE membresia_id = ?
          AND periodo = ?
        FOR UPDATE
        """,
        Integer.class,
        membresiaId,
        periodo
    );
}
    
public Integer obtenerDiaCorteMensual(Integer membresiaId) {

    return jdbc.queryForObject("""
        SELECT dia_corte_mensual
        FROM public.membresias
        WHERE id = ?
        """,
        Integer.class,
        membresiaId
    );
}

    
public void marcarPeriodoPagado(
        Integer periodoId,
        Integer cobroId) {

    int filas = jdbc.update("""
        UPDATE public.periodos_facturacion
        SET estado = 'PAGADO',
            cobro_exitoso_id = ?
        WHERE id = ?
          AND estado = 'PENDIENTE'
        """,
        cobroId,
        periodoId
    );

    if (filas != 1) {
        throw new IllegalStateException(
            "No se pudo marcar el periodo como pagado"
        );
    }
}


    
public java.time.LocalDate obtenerFechaInicioMembresia(
        Integer membresiaId) {

    java.sql.Date fecha = jdbc.queryForObject("""
        SELECT fecha_inicio
        FROM public.membresias
        WHERE id = ?
        """,
        java.sql.Date.class,
        membresiaId
    );

    if (fecha == null) {
        throw new IllegalStateException(
            "La membresia no tiene fecha de inicio"
        );
    }

    return fecha.toLocalDate();
}


public boolean existeCobroExitosoSinPeriodoEsteMes(
        Integer membresiaId) {

    java.time.LocalDate hoy = java.time.LocalDate.now(
        java.time.ZoneId.of("America/Guatemala")
    );

    java.time.ZonedDateTime inicio = hoy
        .withDayOfMonth(1)
        .atStartOfDay(
            java.time.ZoneId.of("America/Guatemala")
        );

    java.time.ZonedDateTime fin = inicio.plusMonths(1);

    Boolean existe = jdbc.queryForObject("""
        SELECT EXISTS (
            SELECT 1
            FROM public.cobros_automaticos
            WHERE membresia_id = ?
              AND concepto = 'MENSUALIDAD'
              AND estado_transaccion = 'EXITOSO'
              AND periodo_facturacion_id IS NULL
              AND fecha_intento >= ?
              AND fecha_intento < ?
        )
        """,
        Boolean.class,
        membresiaId,
        java.sql.Timestamp.from(inicio.toInstant()),
        java.sql.Timestamp.from(fin.toInstant())
    );

    return Boolean.TRUE.equals(existe);
}

    public Optional<Integer> obtenerPeriodoPendienteMasAntiguo(
        Integer membresiaId,
        LocalDate hoy) {

    List<Integer> periodos = jdbc.queryForList("""
        SELECT id
        FROM public.periodos_facturacion
        WHERE membresia_id = ?
          AND estado = 'PENDIENTE'
          AND fecha_vencimiento <= ?
        ORDER BY fecha_vencimiento ASC, id ASC
        LIMIT 1
        FOR UPDATE
        """,
        Integer.class,
        membresiaId,
        hoy
    );

    return periodos.stream().findFirst();
}

public boolean existenDeudasVencidas(
        Integer membresiaId,
        LocalDate hoy) {

    Boolean existen = jdbc.queryForObject("""
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

    return Boolean.TRUE.equals(existen);
}

public boolean reactivarSiEstaAlDia(
        Integer membresiaId,
        LocalDate hoy) {

    int actualizadas = jdbc.update("""
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
        hoy
    );

    return actualizadas > 0;
}

public List<Map<String, Object>> listarPeriodosPorCliente(
        UUID clienteId) {

    return jdbc.queryForList("""
        SELECT
            p.id,
            p.membresia_id,
            p.periodo,
            p.fecha_vencimiento,
            p.estado,
            p.cobro_exitoso_id,
            p.intentos,
            p.ultimo_intento
        FROM public.periodos_facturacion p
        INNER JOIN public.membresias m
            ON m.id = p.membresia_id
        WHERE m.cliente_id = ?
        ORDER BY p.periodo DESC, p.id DESC
        """,
        clienteId
    );
}



}
