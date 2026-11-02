-- =====================================================================
-- Esquema "reporting" para Power BI
-- =====================================================================
-- Vistas de solo lectura con los datos ya unidos y en hora de Guatemala.
-- Power BI se conecta con el usuario de 03_usuario_powerbi.sql, que solo
-- puede leer este esquema; nunca ve las tablas de public.
--
-- Modelo en estrella:
--   Dimensiones: dim_calendario, dim_sede, dim_plan, dim_cliente, dim_clase
--   Hechos:      fact_membresias, fact_cobros, fact_periodos, fact_accesos, fact_reservas
--
-- No se incluyen nombres, correos, documentos ni teléfonos de clientes.
-- Se puede volver a ejecutar sin problema (DROP + CREATE).
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS reporting;

-- Nadie más que el usuario de Power BI debe leer este esquema
-- (en Supabase, anon y authenticated son los roles de la API pública).
REVOKE ALL ON SCHEMA reporting FROM PUBLIC;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL ON SCHEMA reporting FROM anon';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE ALL ON SCHEMA reporting FROM authenticated';
    END IF;
END $$;

DROP VIEW IF EXISTS
    reporting.fact_reservas,
    reporting.fact_accesos,
    reporting.fact_periodos,
    reporting.fact_cobros,
    reporting.fact_membresias,
    reporting.dim_clase,
    reporting.dim_cliente,
    reporting.dim_plan,
    reporting.dim_sede,
    reporting.dim_calendario;

-- ---------------------------------------------------------------------
-- Dimensiones
-- ---------------------------------------------------------------------

-- Una fila por día. En Power BI se marca como "tabla de fechas".
CREATE VIEW reporting.dim_calendario AS
SELECT
    d::date                                        AS fecha,
    EXTRACT(YEAR FROM d)::int                      AS anio,
    EXTRACT(MONTH FROM d)::int                     AS mes,
    (ARRAY['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
           'Agosto','Septiembre','Octubre','Noviembre','Diciembre'])[EXTRACT(MONTH FROM d)::int]
                                                   AS nombre_mes,
    to_char(d, 'YYYY-MM')                          AS anio_mes,
    date_trunc('month', d)::date                   AS inicio_mes,
    EXTRACT(QUARTER FROM d)::int                   AS trimestre,
    EXTRACT(ISODOW FROM d)::int                    AS dia_semana_num,
    (ARRAY['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'])[EXTRACT(ISODOW FROM d)::int]
                                                   AS dia_semana,
    EXTRACT(ISODOW FROM d) IN (6, 7)               AS es_fin_de_semana
FROM generate_series(DATE '2025-01-01', DATE '2027-12-31', INTERVAL '1 day') AS d;

CREATE VIEW reporting.dim_sede AS
SELECT
    s.id                                   AS sede_id,
    s.nombre                               AS sede,
    s.codigo_sucursal                      AS codigo,
    s.ciudad,
    p.nombre                               AS pais,
    p.codigo_iso                           AS pais_codigo,
    p.moneda,
    s.latitud::float8                      AS latitud,
    s.longitud::float8                     AS longitud,
    s.horario_apertura,
    s.horario_cierre,
    s.capacidad_maxima,
    COALESCE(s.es_sede_vip, false)         AS solo_black,
    COALESCE(s.activa, true)               AS activa
FROM public.sucursales s
JOIN public.paises p ON p.id = s.pais_id;

-- El nivel se deduce igual que en la app: Black > Nacional > Smart.
CREATE VIEW reporting.dim_plan AS
SELECT
    pl.id                                  AS plan_id,
    pl.nombre                              AS plan,
    CASE
        WHEN pl.permite_amenidades_vip THEN 'Black'
        WHEN pl.permite_acceso_nacional THEN 'Nacional'
        ELSE 'Smart'
    END                                    AS nivel,
    CASE
        WHEN pl.permite_amenidades_vip THEN 3
        WHEN pl.permite_acceso_nacional THEN 2
        ELSE 1
    END                                    AS nivel_orden,
    pl.precio_mensual,
    pl.cuota_inscripcion,
    pl.cuota_mantenimiento_anual,
    pl.meses_permanencia_minima,
    pl.porcentaje_penalizacion,
    COALESCE(pl.permite_acceso_nacional, false)      AS acceso_nacional,
    COALESCE(pl.permite_acceso_internacional, false) AS acceso_internacional,
    COALESCE(pl.activo, true)              AS activo
FROM public.planes pl;

-- Sin datos personales: solo sede base, estado, fecha de registro y rango de edad.
CREATE VIEW reporting.dim_cliente AS
SELECT
    c.id                                   AS cliente_id,
    c.sucursal_base_id                     AS sede_base_id,
    c.estado,
    timezone('America/Guatemala', c.created_at)::date AS fecha_registro,
    CASE
        WHEN c.fecha_nacimiento IS NULL THEN 'Sin dato'
        WHEN age(c.fecha_nacimiento) < INTERVAL '18 years' THEN 'Menor de 18'
        WHEN age(c.fecha_nacimiento) < INTERVAL '26 years' THEN '18 a 25'
        WHEN age(c.fecha_nacimiento) < INTERVAL '36 years' THEN '26 a 35'
        WHEN age(c.fecha_nacimiento) < INTERVAL '46 years' THEN '36 a 45'
        WHEN age(c.fecha_nacimiento) < INTERVAL '61 years' THEN '46 a 60'
        ELSE 'Más de 60'
    END                                    AS rango_edad
FROM public.clientes c;

CREATE VIEW reporting.dim_clase AS
SELECT
    cg.id                                  AS clase_id,
    cg.sucursal_id                         AS sede_id,
    cg.nombre_clase                        AS clase,
    i.nombre_completo                      AS instructor,
    i.especialidad,
    cg.dia_semana,
    cg.hora_inicio,
    cg.hora_fin,
    to_char(cg.hora_inicio, 'HH24:MI') || ' - ' || to_char(cg.hora_fin, 'HH24:MI') AS horario,
    cg.cupo_maximo,
    COALESCE(cg.requiere_plan_vip, false)  AS solo_black
FROM public.clases_grupales cg
JOIN public.instructores i ON i.id = cg.instructor_id;

-- ---------------------------------------------------------------------
-- Hechos
-- ---------------------------------------------------------------------

-- Una fila por membresía, con su cancelación si la hubo.
CREATE VIEW reporting.fact_membresias AS
SELECT
    m.id                                   AS membresia_id,
    m.cliente_id,
    m.plan_id,
    c.sucursal_base_id                     AS sede_id,
    m.fecha_inicio,
    m.fecha_fin_permanencia_minima,
    m.estado,
    m.estado = 'ACTIVA'                    AS esta_activa,
    pl.precio_mensual                      AS mensualidad,
    timezone('America/Guatemala', cm.fecha_solicitud)::date AS fecha_cancelacion,
    cm.motivo_cancelacion,
    cm.cumplio_permanencia_minima,
    cm.meses_restantes_contrato,
    cm.monto_penalizacion_calculado        AS penalizacion
FROM public.membresias m
JOIN public.clientes c ON c.id = m.cliente_id
JOIN public.planes pl ON pl.id = m.plan_id
LEFT JOIN public.cancelaciones_membresia cm ON cm.membresia_id = m.id;

-- Cada intento de cobro. monto_exitoso es lo que realmente entró.
CREATE VIEW reporting.fact_cobros AS
SELECT
    co.id                                  AS cobro_id,
    co.membresia_id,
    m.cliente_id,
    m.plan_id,
    c.sucursal_base_id                     AS sede_id,
    timezone('America/Guatemala', co.fecha_intento)::date AS fecha,
    co.concepto,
    co.estado_transaccion                  AS estado,
    co.monto_bruto,
    co.descuento_aplicado,
    co.monto_total_cobrado,
    CASE WHEN co.estado_transaccion = 'EXITOSO' THEN co.monto_total_cobrado ELSE 0 END AS monto_exitoso
FROM public.cobros_automaticos co
JOIN public.membresias m ON m.id = co.membresia_id
JOIN public.clientes c ON c.id = m.cliente_id;

-- Un período mensual por membresía (PAGADO o PENDIENTE), para ver la morosidad.
CREATE VIEW reporting.fact_periodos AS
SELECT
    pf.id                                  AS periodo_id,
    pf.membresia_id,
    m.cliente_id,
    m.plan_id,
    c.sucursal_base_id                     AS sede_id,
    pf.periodo,
    pf.fecha_vencimiento,
    pf.estado,
    pf.intentos,
    pl.precio_mensual                      AS monto,
    pf.estado <> 'PAGADO'
        AND pf.fecha_vencimiento < timezone('America/Guatemala', now())::date AS vencido
FROM public.periodos_facturacion pf
JOIN public.membresias m ON m.id = pf.membresia_id
JOIN public.clientes c ON c.id = m.cliente_id
JOIN public.planes pl ON pl.id = m.plan_id;

-- Cada intento de entrada en recepción, permitido o rechazado.
CREATE VIEW reporting.fact_accesos AS
SELECT
    ra.id                                  AS acceso_id,
    ra.cliente_id,
    ra.sucursal_id                         AS sede_id,
    timezone('America/Guatemala', ra.fecha_hora_acceso)::date AS fecha,
    EXTRACT(HOUR FROM timezone('America/Guatemala', ra.fecha_hora_acceso))::int AS hora,
    ra.tipo_acceso,
    a.nombre                               AS amenidad,
    ra.acceso_permitido                    AS permitido,
    ra.motivo_rechazo
FROM public.registros_acceso ra
LEFT JOIN public.amenidades a ON a.id = ra.amenidad_id;

-- Cada reserva de clase con su estado final.
CREATE VIEW reporting.fact_reservas AS
SELECT
    r.id                                   AS reserva_id,
    r.clase_id,
    cg.sucursal_id                         AS sede_id,
    r.cliente_id,
    r.fecha_clase                          AS fecha,
    r.estado,
    timezone('America/Guatemala', r.created_at)::date AS fecha_reserva
FROM public.reservas_clases r
JOIN public.clases_grupales cg ON cg.id = r.clase_id;

-- Para que el usuario de Power BI pueda leer las vistas nuevas si ya existía.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'powerbi_lector') THEN
        EXECUTE 'GRANT USAGE ON SCHEMA reporting TO powerbi_lector';
        EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA reporting TO powerbi_lector';
    END IF;
END $$;
