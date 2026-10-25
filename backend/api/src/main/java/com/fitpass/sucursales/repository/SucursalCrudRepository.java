
package com.fitpass.sucursales.repository;

import com.fitpass.sucursales.dto.SucursalRequest;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Time;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class SucursalCrudRepository {

    private final JdbcTemplate jdbc;

    public SucursalCrudRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> listar() {
        return jdbc.queryForList(
            "SELECT * FROM public.sucursales ORDER BY id"
        );
    }

    public Optional<Map<String, Object>> obtener(Integer id) {
        return jdbc.queryForList(
            "SELECT * FROM public.sucursales WHERE id = ?", id
        ).stream().findFirst();
    }

    private Time apertura(SucursalRequest s) {
        return Time.valueOf(
            s.horarioApertura() == null
                ? java.time.LocalTime.of(5, 0)
                : s.horarioApertura()
        );
    }

    private Time cierre(SucursalRequest s) {
        return Time.valueOf(
            s.horarioCierre() == null
                ? java.time.LocalTime.of(22, 0)
                : s.horarioCierre()
        );
    }

    public Integer crear(SucursalRequest s) {
        return jdbc.queryForObject("""
            INSERT INTO public.sucursales (
                pais_id, nombre, codigo_sucursal,
                direccion, ciudad, latitud, longitud,
                telefono, horario_apertura, horario_cierre,
                capacidad_maxima, es_sede_vip, activa
            )
            VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                COALESCE(?, 200),
                COALESCE(?, false),
                COALESCE(?, true)
            )
            RETURNING id
            """,
            Integer.class,
            s.paisId(),
            s.nombre().trim(),
            s.codigoSucursal().trim(),
            s.direccion().trim(),
            s.ciudad().trim(),
            s.latitud(),
            s.longitud(),
            s.telefono(),
            apertura(s),
            cierre(s),
            s.capacidadMaxima(),
            s.esSedeVip(),
            s.activa()
        );
    }

    public int actualizar(Integer id, SucursalRequest s) {
        return jdbc.update("""
            UPDATE public.sucursales SET
                pais_id = ?,
                nombre = ?,
                codigo_sucursal = ?,
                direccion = ?,
                ciudad = ?,
                latitud = ?,
                longitud = ?,
                telefono = ?,
                horario_apertura = ?,
                horario_cierre = ?,
                capacidad_maxima = COALESCE(?, 200),
                es_sede_vip = COALESCE(?, false),
                activa = COALESCE(?, true)
            WHERE id = ?
            """,
            s.paisId(),
            s.nombre().trim(),
            s.codigoSucursal().trim(),
            s.direccion().trim(),
            s.ciudad().trim(),
            s.latitud(),
            s.longitud(),
            s.telefono(),
            apertura(s),
            cierre(s),
            s.capacidadMaxima(),
            s.esSedeVip(),
            s.activa(),
            id
        );
    }

    public int desactivar(Integer id) {
        return jdbc.update(
            "UPDATE public.sucursales SET activa = false WHERE id = ?",
            id
        );
    }
}
