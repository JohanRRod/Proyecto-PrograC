
package com.fitpass.accesos.repository;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AccesoRepository {

    private final NamedParameterJdbcTemplate db;

    public AccesoRepository(NamedParameterJdbcTemplate db) {
        this.db = db;
    }

    public List<Map<String, Object>> buscarCliente(UUID clienteId) {
        return db.queryForList("""
            SELECT c.estado, c.sucursal_base_id, s.pais_id
            FROM public.clientes c
            JOIN public.sucursales s
              ON s.id = c.sucursal_base_id
            WHERE c.id = :cliente
            """, Map.of("cliente", clienteId));
    }

    public List<Map<String, Object>> buscarSucursal(Integer sucursalId) {
        return db.queryForList("""
            SELECT pais_id, activa, es_sede_vip
            FROM public.sucursales
            WHERE id = :sucursal
            """, Map.of("sucursal", sucursalId));
    }

    public List<Map<String, Object>> buscarMembresia(
            UUID clienteId, LocalDate hoy) {

        return db.queryForList("""
            SELECT m.id, m.estado,
                   p.permite_acceso_nacional,
                   p.permite_acceso_internacional,
                   p.permite_amenidades_vip
            FROM public.membresias m
            JOIN public.planes p ON p.id = m.plan_id
            WHERE m.cliente_id = :cliente
              AND m.estado = 'ACTIVA'
              AND m.fecha_inicio <= :hoy
            ORDER BY m.fecha_inicio DESC
            LIMIT 1
            """, Map.of("cliente", clienteId, "hoy", hoy));
    }

    public List<Map<String, Object>> buscarAmenidad(
            Integer sucursalId, Integer amenidadId) {

        return db.queryForList("""
            SELECT a.requiere_plan_vip
            FROM public.sucursal_amenidades sa
            JOIN public.amenidades a ON a.id = sa.amenidad_id
            WHERE sa.sucursal_id = :sucursal
              AND sa.amenidad_id = :amenidad
              AND sa.disponible = true
            """, Map.of(
                "sucursal", sucursalId,
                "amenidad", amenidadId
            ));
    }

    public void registrar(
            UUID clienteId,
            Integer sucursalId,
            Integer amenidadId,
            String tipo,
            boolean permitido,
            String motivo) {

        Map<String, Object> args = new HashMap<>();
        args.put("cliente", clienteId);
        args.put("sucursal", sucursalId);
        args.put("amenidad", amenidadId);
        args.put("tipo", tipo);
        args.put("permitido", permitido);
        args.put("motivo", motivo);

        db.update("""
            INSERT INTO public.registros_acceso (
                cliente_id, sucursal_id, amenidad_id,
                tipo_acceso, acceso_permitido, motivo_rechazo
            )
            VALUES (
                :cliente, :sucursal, :amenidad,
                :tipo, :permitido, :motivo
            )
            """, args);
    }

    public List<Map<String, Object>> historial(UUID clienteId) {
        return db.queryForList("""
            SELECT id, cliente_id, sucursal_id,
                   amenidad_id, fecha_hora_acceso,
                   tipo_acceso, acceso_permitido, motivo_rechazo
            FROM public.registros_acceso
            WHERE cliente_id = :cliente
            ORDER BY fecha_hora_acceso DESC, id DESC
            """, Map.of("cliente", clienteId));
    }

    public boolean existeCheckInReciente(
            UUID clienteId,
            Integer sucursalId,
            Integer amenidadId,
            int minutos) {

        Map<String, Object> args = new HashMap<>();
        args.put("cliente", clienteId);
        args.put("sucursal", sucursalId);
        args.put("amenidad", amenidadId);
        args.put("minutos", minutos);

        Boolean existe = db.queryForObject("""
            SELECT EXISTS (
                SELECT 1
                FROM public.registros_acceso
                WHERE cliente_id = :cliente
                  AND sucursal_id = :sucursal
                  AND amenidad_id IS NOT DISTINCT FROM :amenidad
                  AND acceso_permitido = true
                  AND fecha_hora_acceso >=
                      NOW() - (:minutos * INTERVAL '1 minute')
            )
            """, args, Boolean.class);

        return Boolean.TRUE.equals(existe);
    }
}
