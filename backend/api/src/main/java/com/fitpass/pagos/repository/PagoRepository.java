
package com.fitpass.pagos.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
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
}
