
package com.fitpass.membresias.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

@Repository
public class CancelacionRepository {

    private final JdbcTemplate jdbcTemplate;

    public CancelacionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public record DatosPlan(
            BigDecimal precioMensual,
            BigDecimal porcentajePenalizacion
    ) {}

    public Optional<DatosPlan> obtenerDatosPlan(Integer planId) {

        return jdbcTemplate.query(
                """
                SELECT precio_mensual, porcentaje_penalizacion
                FROM public.planes
                WHERE id = ?
                """,
                (rs, rowNum) -> new DatosPlan(
                        rs.getBigDecimal("precio_mensual"),
                        rs.getBigDecimal("porcentaje_penalizacion")
                ),
                planId
        ).stream().findFirst();
    }

    public boolean existeSolicitud(Integer membresiaId) {

        Boolean existe = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM public.cancelaciones_membresia
                    WHERE membresia_id = ?
                )
                """,
                Boolean.class,
                membresiaId
        );

        return Boolean.TRUE.equals(existe);
    }

    public Integer registrar(
            Integer membresiaId,
            String motivo,
            boolean cumplioPermanencia,
            int mesesRestantes,
            BigDecimal penalizacion) {

        return jdbcTemplate.queryForObject(
                """
                INSERT INTO public.cancelaciones_membresia (
                    membresia_id,
                    fecha_solicitud,
                    motivo_cancelacion,
                    cumplio_permanencia_minima,
                    meses_restantes_contrato,
                    monto_penalizacion_calculado,
                    cobro_penalizacion_id,
                    procesado_por
                )
                VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?, NULL, ?)
                RETURNING id
                """,
                Integer.class,
                membresiaId,
                motivo,
                cumplioPermanencia,
                mesesRestantes,
                penalizacion,
                "API_LOCAL_SIN_AUTENTICACION"
        );
    }
}
