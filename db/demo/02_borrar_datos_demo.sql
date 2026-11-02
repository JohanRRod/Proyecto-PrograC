-- =====================================================================
-- Borra todo lo que creó 01_cargar_datos_demo.sql
-- =====================================================================
-- Solo toca registros marcados como demo (documento 'DEMO-…', correos
-- @demo.flexpass.gt, referencias 'DEMO-…'). No borra nada más.
-- =====================================================================

BEGIN;

CREATE TEMP TABLE demo_clientes ON COMMIT DROP AS
SELECT id FROM public.clientes WHERE documento_identidad LIKE 'DEMO-%';

CREATE TEMP TABLE demo_membresias ON COMMIT DROP AS
SELECT id FROM public.membresias WHERE cliente_id IN (SELECT id FROM demo_clientes);

DELETE FROM public.reservas_clases
WHERE cliente_id IN (SELECT id FROM demo_clientes)
   OR clase_id IN (SELECT cg.id FROM public.clases_grupales cg
                   JOIN public.instructores i ON i.id = cg.instructor_id
                   WHERE i.email LIKE '%@demo.flexpass.gt');

DELETE FROM public.clases_grupales
WHERE instructor_id IN (SELECT id FROM public.instructores WHERE email LIKE '%@demo.flexpass.gt');

DELETE FROM public.instructores WHERE email LIKE '%@demo.flexpass.gt';

DELETE FROM public.registros_acceso WHERE cliente_id IN (SELECT id FROM demo_clientes);

DELETE FROM public.cancelaciones_membresia WHERE membresia_id IN (SELECT id FROM demo_membresias);

DELETE FROM public.periodos_facturacion WHERE membresia_id IN (SELECT id FROM demo_membresias);

DELETE FROM public.cobros_automaticos WHERE membresia_id IN (SELECT id FROM demo_membresias);

DELETE FROM public.membresias WHERE id IN (SELECT id FROM demo_membresias);

DELETE FROM public.metodos_pago_cliente WHERE cliente_id IN (SELECT id FROM demo_clientes);

DELETE FROM public.clientes WHERE id IN (SELECT id FROM demo_clientes);

COMMIT;

SELECT count(*) AS clientes_demo_restantes FROM public.clientes WHERE documento_identidad LIKE 'DEMO-%';
