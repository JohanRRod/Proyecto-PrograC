
package com.fitpass.membresias.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public class MetodoPagoRepository {

    private final JdbcTemplate jdbcTemplate;

    public MetodoPagoRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean perteneceAlCliente(
            Integer metodoPagoId,
            UUID clienteId) {

        if (metodoPagoId == null || clienteId == null) {
            return false;
        }

        String sql = """
                SELECT EXISTS (
                    SELECT 1
                    FROM public.metodos_pago_cliente
                    WHERE id = ?
                      AND cliente_id = ?
                )
                """;

        Boolean existe = jdbcTemplate.queryForObject(
                sql,
                Boolean.class,
                metodoPagoId,
                clienteId
        );

        return Boolean.TRUE.equals(existe);
    }
}
