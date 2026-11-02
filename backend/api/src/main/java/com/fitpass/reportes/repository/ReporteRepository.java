package com.fitpass.reportes.repository;

import com.fitpass.reportes.dto.ReporteDefinicion;
import com.fitpass.reportes.dto.ReporteFiltros;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.Types;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class ReporteRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public ReporteRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> ejecutar(ReporteDefinicion reporte, ReporteFiltros filtros) {
        MapSqlParameterSource parametros = new MapSqlParameterSource()
            .addValue("desde", filtros.desde() == null ? null : Date.valueOf(filtros.desde()), Types.DATE)
            .addValue("hasta", filtros.hasta() == null ? null : Date.valueOf(filtros.hasta()), Types.DATE)
            .addValue("sucursalId", filtros.sucursalId(), Types.INTEGER);

        return jdbc.queryForList(reporte.sql(), parametros);
    }

    public Optional<String> nombreSucursal(Integer id) {
        return jdbc.queryForList(
                "SELECT nombre FROM public.sucursales WHERE id = :id",
                Map.of("id", id),
                String.class)
            .stream()
            .findFirst();
    }
}
