
package com.fitpass.planes.repository;

import com.fitpass.planes.dto.PlanRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class PlanCrudRepository {

    private final JdbcTemplate jdbc;

    public PlanCrudRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> listar() {
        return jdbc.queryForList(
            "SELECT * FROM public.planes ORDER BY id"
        );
    }

    public Optional<Map<String, Object>> obtener(Integer id) {
        return jdbc.queryForList(
            "SELECT * FROM public.planes WHERE id = ?", id
        ).stream().findFirst();
    }

    public Integer crear(PlanRequest p) {
        return jdbc.queryForObject("""
            INSERT INTO public.planes (
                nombre, descripcion, precio_mensual,
                cuota_inscripcion, cuota_mantenimiento_anual,
                meses_permanencia_minima, porcentaje_penalizacion,
                permite_acceso_nacional,
                permite_acceso_internacional,
                permite_amenidades_vip,
                invitados_mensuales_gratis, activo
            )
            VALUES (
                ?, ?, ?, COALESCE(?, 0), COALESCE(?, 0),
                ?, ?, COALESCE(?, false), COALESCE(?, false),
                COALESCE(?, false), COALESCE(?, 0),
                COALESCE(?, true)
            )
            RETURNING id
            """,
            Integer.class,
            p.nombre().trim(),
            p.descripcion(),
            p.precioMensual(),
            p.cuotaInscripcion(),
            p.cuotaMantenimientoAnual(),
            p.mesesPermanenciaMinima(),
            p.porcentajePenalizacion(),
            p.permiteAccesoNacional(),
            p.permiteAccesoInternacional(),
            p.permiteAmenidadesVip(),
            p.invitadosMensualesGratis(),
            p.activo()
        );
    }

    public int actualizar(Integer id, PlanRequest p) {
        return jdbc.update("""
            UPDATE public.planes SET
                nombre = ?,
                descripcion = ?,
                precio_mensual = ?,
                cuota_inscripcion = COALESCE(?, 0),
                cuota_mantenimiento_anual = COALESCE(?, 0),
                meses_permanencia_minima = ?,
                porcentaje_penalizacion = ?,
                permite_acceso_nacional = COALESCE(?, false),
                permite_acceso_internacional = COALESCE(?, false),
                permite_amenidades_vip = COALESCE(?, false),
                invitados_mensuales_gratis = COALESCE(?, 0),
                activo = COALESCE(?, true)
            WHERE id = ?
            """,
            p.nombre().trim(),
            p.descripcion(),
            p.precioMensual(),
            p.cuotaInscripcion(),
            p.cuotaMantenimientoAnual(),
            p.mesesPermanenciaMinima(),
            p.porcentajePenalizacion(),
            p.permiteAccesoNacional(),
            p.permiteAccesoInternacional(),
            p.permiteAmenidadesVip(),
            p.invitadosMensualesGratis(),
            p.activo(),
            id
        );
    }

    public int desactivar(Integer id) {
        return jdbc.update(
            "UPDATE public.planes SET activo = false WHERE id = ?",
            id
        );
    }
}
