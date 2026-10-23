
package com.fitpass.sucursales.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SucursalRepository {

    private final JdbcTemplate jdbcTemplate;

    public SucursalRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean existeSucursal(Integer id) {

        if (id == null || id <= 0) {
            return false;
        }

        String sql = """
                SELECT EXISTS (
                    SELECT 1
                    FROM public.sucursales
                    WHERE id = ?
                )
                """;

        Boolean existe = jdbcTemplate.queryForObject(
                sql,
                Boolean.class,
                id
        );

        return Boolean.TRUE.equals(existe);
    }
}
