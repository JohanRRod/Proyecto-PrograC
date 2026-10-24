
package com.fitpass.membresias.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class PlanRepository {

    private final JdbcTemplate jdbcTemplate;

    public PlanRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<Integer> obtenerMesesPermanencia(Integer planId) {

        if (planId == null || planId <= 0) {
            return Optional.empty();
        }

        String sql = """
                SELECT meses_permanencia_minima
                FROM public.planes
                WHERE id = ?
                """;

        return jdbcTemplate.query(
                sql,
                rs -> {
                    if (rs.next()) {
                        return Optional.of(
                                rs.getInt("meses_permanencia_minima")
                        );
                    }

                    return Optional.<Integer>empty();
                },
                planId
        );
    }
}
