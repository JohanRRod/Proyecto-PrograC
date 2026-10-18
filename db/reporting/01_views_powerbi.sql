CREATE OR REPLACE VIEW vw_resumen_financiero_sucursales AS
SELECT 
    p.nombre AS pais,
    s.nombre AS sucursal,
    s.ciudad,
    pl.nombre AS plan,
    COUNT(DISTINCT m.id) AS total_membresias,
    SUM(CASE WHEN ca.estado_transaccion = 'EXITOSO' THEN ca.monto_total_cobrado ELSE 0 END) AS ingresos_totales,
    SUM(CASE WHEN ca.concepto = 'PENALIZACION_CANCELACION' AND ca.estado_transaccion = 'EXITOSO' THEN ca.monto_total_cobrado ELSE 0 END) AS ingresos_por_penalizaciones
FROM sucursales s
JOIN paises p ON s.pais_id = p.id
LEFT JOIN clientes c ON c.sucursal_base_id = s.id
LEFT JOIN membresias m ON m.cliente_id = c.id
LEFT JOIN planes pl ON m.plan_id = pl.id
LEFT JOIN cobros_automaticos ca ON ca.membresia_id = m.id
GROUP BY p.nombre, s.nombre, s.ciudad, pl.nombre;
