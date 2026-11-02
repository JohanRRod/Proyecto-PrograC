-- =====================================================================
-- Datos de demostración para el tablero de Power BI
-- =====================================================================
-- Crea 60 clientes con su membresía, cobros, períodos, entradas en
-- recepción (últimos 60 días), 4 instructores con 11 clases y sus reservas
-- (últimas 4 semanas y la próxima).
--
-- Todo lo creado se reconoce así, para poder borrarlo con 02_borrar_datos_demo.sql:
--   clientes:     documento_identidad 'DEMO-0001' … 'DEMO-0060'
--   correos:      …@demo.flexpass.gt
--   cobros:       referencia_transaccion 'DEMO-…'
--
-- Solo usa sedes activas y los planes activos (uno por nivel). Si ya se
-- cargaron antes, se detiene sin hacer nada.
-- =====================================================================

DO $$
DECLARE
    hoy        date := timezone('America/Guatemala', now())::date;
    sedes      int[];
    sedes_libres int[];          -- sedes que no son exclusivas Black
    p_smart    int;  p_nacional int;  p_black int;
    nombres    text[] := ARRAY['María','José','Ana','Luis','Sofía','Carlos','Valeria','Jorge','Daniela','Diego',
                               'Gabriela','Fernando','Lucía','Andrés','Paola','Ricardo','Camila','Javier','Andrea','Pablo'];
    apellidos  text[] := ARRAY['García','López','Pérez','Hernández','Morales','Ramírez','Castillo','Méndez','Vásquez','Juárez',
                               'Cifuentes','Ortiz','Reyes','Rodas','Fuentes','Barrios','Aguilar','Monterroso'];
    bancos     text[] := ARRAY['Banco Industrial','Banrural','BAM','G&T Continental','Banco Promerica'];
    motivos    text[] := ARRAY['Cambio de residencia','Motivos económicos','Falta de tiempo','Se mudó a otro gimnasio','Recomendación médica'];

    g int; k int; d date; r float8;
    v_cli uuid; v_metodo int; v_mem int; v_cobro int; v_rech int;
    v_plan int; v_sede int; v_inicio date; v_fin date; v_estado text; v_cancel date;
    v_venc date; v_limite date; v_dia int; v_nombre text;
    pl record; c record; s record;
    v_n int; v_hora int; v_tipo text; v_ok boolean; v_motivo text; v_sede_acc int;
    v_meses_rest int; v_pen numeric;
BEGIN
    IF EXISTS (SELECT 1 FROM public.clientes WHERE documento_identidad LIKE 'DEMO-%') THEN
        RAISE EXCEPTION 'Ya hay datos de demostración. Corre primero 02_borrar_datos_demo.sql si quieres volver a cargarlos.';
    END IF;

    PERFORM setseed(0.42);

    sedes := ARRAY(SELECT id FROM public.sucursales WHERE COALESCE(activa, true) ORDER BY id);
    sedes_libres := ARRAY(SELECT id FROM public.sucursales WHERE COALESCE(activa, true) AND NOT COALESCE(es_sede_vip, false) ORDER BY id);
    IF COALESCE(array_length(sedes, 1), 0) = 0 THEN
        RAISE EXCEPTION 'No hay sedes activas.';
    END IF;
    IF COALESCE(array_length(sedes_libres, 1), 0) = 0 THEN
        sedes_libres := sedes;
    END IF;

    -- Un plan activo por nivel (el de menor id si hay repetidos).
    SELECT min(id) INTO p_black    FROM public.planes WHERE COALESCE(activo, true) AND permite_amenidades_vip AND nombre NOT ILIKE '%prueba%';
    SELECT min(id) INTO p_nacional FROM public.planes WHERE COALESCE(activo, true) AND permite_acceso_nacional AND NOT COALESCE(permite_amenidades_vip, false) AND nombre NOT ILIKE '%prueba%';
    SELECT min(id) INTO p_smart    FROM public.planes WHERE COALESCE(activo, true) AND NOT COALESCE(permite_acceso_nacional, false) AND NOT COALESCE(permite_amenidades_vip, false) AND nombre NOT ILIKE '%prueba%';
    IF p_black IS NULL OR p_nacional IS NULL OR p_smart IS NULL THEN
        RAISE EXCEPTION 'Se necesita un plan activo de cada nivel (Smart, Nacional y Black).';
    END IF;

    -- ------------------------------------------------------------------
    -- Clientes, membresías, cobros, períodos y cancelaciones
    -- ------------------------------------------------------------------
    FOR g IN 1..60 LOOP
        r := random();
        v_plan := CASE WHEN r < 0.45 THEN p_smart WHEN r < 0.80 THEN p_nacional ELSE p_black END;
        SELECT * INTO pl FROM public.planes WHERE id = v_plan;

        -- Los planes Black pueden tener cualquier sede base; los demás, una que no sea exclusiva Black.
        IF v_plan = p_black THEN
            v_sede := sedes[1 + (g % array_length(sedes, 1))];
        ELSE
            v_sede := sedes_libres[1 + (g % array_length(sedes_libres, 1))];
        END IF;

        v_estado := CASE WHEN g % 12 = 0 THEN 'CANCELADA' WHEN g % 15 = 0 THEN 'SUSPENDIDA_IMPAGO' ELSE 'ACTIVA' END;
        IF v_estado = 'CANCELADA' THEN
            v_inicio := DATE '2026-05-01' + floor(random() * 80)::int;
            v_cancel := v_inicio + 45 + floor(random() * 60)::int;
            IF v_cancel > hoy - 3 THEN v_cancel := hoy - 3; END IF;
        ELSE
            v_inicio := DATE '2026-05-01' + floor(random() * 170)::int;
            v_cancel := NULL;
        END IF;
        v_dia := LEAST(EXTRACT(DAY FROM v_inicio)::int, 28);
        v_nombre := nombres[1 + floor(random() * array_length(nombres, 1))::int];

        INSERT INTO public.clientes (nombres, apellidos, documento_identidad, email, telefono, fecha_nacimiento,
                                     sucursal_base_id, codigo_qr_acceso, estado, created_at)
        VALUES (v_nombre,
                apellidos[1 + floor(random() * array_length(apellidos, 1))::int] || ' ' ||
                apellidos[1 + floor(random() * array_length(apellidos, 1))::int],
                'DEMO-' || lpad(g::text, 4, '0'),
                'cliente' || lpad(g::text, 2, '0') || '@demo.flexpass.gt',
                '5' || lpad(floor(random() * 9999999)::text, 7, '0'),
                DATE '1970-01-01' + floor(random() * 13000)::int,
                v_sede,
                'DEMO-QR-' || lpad(g::text, 4, '0'),
                CASE WHEN v_estado = 'SUSPENDIDA_IMPAGO' THEN 'MOROSO' ELSE 'ACTIVO' END,
                (v_inicio + TIME '10:00') AT TIME ZONE 'America/Guatemala')
        RETURNING id INTO v_cli;

        INSERT INTO public.metodos_pago_cliente (cliente_id, tipo_cuenta, banco_emisor, ultimos_cuatro_digitos,
                                                 titular, token_pasarela_simulado)
        VALUES (v_cli,
                (ARRAY['TARJETA_CREDITO','TARJETA_DEBITO','CUENTA_BANCARIA'])[1 + floor(random() * 3)::int],
                bancos[1 + floor(random() * array_length(bancos, 1))::int],
                lpad(floor(random() * 9999)::text, 4, '0'),
                v_nombre,
                'demo-token-' || g)
        RETURNING id INTO v_metodo;

        INSERT INTO public.membresias (cliente_id, plan_id, metodo_pago_id, fecha_inicio, fecha_fin_permanencia_minima,
                                       dia_corte_mensual, estado, created_at)
        VALUES (v_cli, v_plan, v_metodo, v_inicio,
                (v_inicio + make_interval(months => pl.meses_permanencia_minima))::date,
                v_dia, v_estado,
                (v_inicio + TIME '10:00') AT TIME ZONE 'America/Guatemala')
        RETURNING id INTO v_mem;

        IF COALESCE(pl.cuota_inscripcion, 0) > 0 THEN
            INSERT INTO public.cobros_automaticos (membresia_id, metodo_pago_id, concepto, monto_bruto, monto_total_cobrado,
                                                   fecha_intento, estado_transaccion, referencia_transaccion)
            VALUES (v_mem, v_metodo, 'INSCRIPCION', pl.cuota_inscripcion, pl.cuota_inscripcion,
                    (v_inicio + TIME '10:05') AT TIME ZONE 'America/Guatemala', 'EXITOSO', 'DEMO-INS-' || g);
        END IF;

        -- Mensualidades: una por mes desde el inicio hasta hoy (o hasta la cancelación).
        v_limite := COALESCE(v_cancel, hoy);
        k := 0;
        LOOP
            v_venc := (v_inicio + make_interval(months => k))::date;
            EXIT WHEN v_venc > v_limite;

            IF v_estado = 'SUSPENDIDA_IMPAGO' AND (v_venc + INTERVAL '1 month')::date > hoy THEN
                -- Último mes de una membresía suspendida: dos intentos rechazados y queda pendiente (vencido).
                FOR v_n IN 1..2 LOOP
                    INSERT INTO public.cobros_automaticos (membresia_id, metodo_pago_id, concepto, monto_bruto, monto_total_cobrado,
                                                           fecha_intento, estado_transaccion, referencia_transaccion)
                    VALUES (v_mem, v_metodo, 'MENSUALIDAD', pl.precio_mensual, pl.precio_mensual,
                            (v_venc + (v_n - 1) + TIME '06:00') AT TIME ZONE 'America/Guatemala',
                            'RECHAZADO_FONDOS', 'DEMO-MEN-' || g || '-' || k || '-R' || v_n);
                END LOOP;
                INSERT INTO public.periodos_facturacion (membresia_id, periodo, fecha_vencimiento, estado, intentos)
                VALUES (v_mem, date_trunc('month', v_venc)::date, v_venc, 'PENDIENTE', 2);
            ELSE
                v_rech := 0;
                IF random() < 0.06 THEN
                    -- A veces el primer intento falla y al día siguiente sí pasa.
                    INSERT INTO public.cobros_automaticos (membresia_id, metodo_pago_id, concepto, monto_bruto, monto_total_cobrado,
                                                           fecha_intento, estado_transaccion, referencia_transaccion)
                    VALUES (v_mem, v_metodo, 'MENSUALIDAD', pl.precio_mensual, pl.precio_mensual,
                            (v_venc + TIME '06:00') AT TIME ZONE 'America/Guatemala',
                            'RECHAZADO_FONDOS', 'DEMO-MEN-' || g || '-' || k || '-R1');
                    v_rech := 1;
                END IF;
                INSERT INTO public.cobros_automaticos (membresia_id, metodo_pago_id, concepto, monto_bruto, monto_total_cobrado,
                                                       fecha_intento, estado_transaccion, referencia_transaccion)
                VALUES (v_mem, v_metodo, 'MENSUALIDAD', pl.precio_mensual, pl.precio_mensual,
                        (v_venc + v_rech + TIME '06:00') AT TIME ZONE 'America/Guatemala',
                        'EXITOSO', 'DEMO-MEN-' || g || '-' || k)
                RETURNING id INTO v_cobro;
                INSERT INTO public.periodos_facturacion (membresia_id, periodo, fecha_vencimiento, estado, cobro_exitoso_id, intentos)
                VALUES (v_mem, date_trunc('month', v_venc)::date, v_venc, 'PAGADO', v_cobro, 1 + v_rech);
            END IF;
            k := k + 1;
        END LOOP;

        -- El período del mes en curso que todavía no vence.
        IF v_estado = 'ACTIVA' AND date_trunc('month', v_venc) = date_trunc('month', hoy) THEN
            INSERT INTO public.periodos_facturacion (membresia_id, periodo, fecha_vencimiento, estado, intentos)
            VALUES (v_mem, date_trunc('month', v_venc)::date, v_venc, 'PENDIENTE', 0);
        END IF;

        IF v_estado = 'CANCELADA' THEN
            v_meses_rest := GREATEST(pl.meses_permanencia_minima - k, 0);
            v_pen := round(pl.precio_mensual * v_meses_rest * pl.porcentaje_penalizacion / 100, 2);
            INSERT INTO public.cobros_automaticos (membresia_id, metodo_pago_id, concepto, monto_bruto, monto_total_cobrado,
                                                   fecha_intento, estado_transaccion, referencia_transaccion)
            VALUES (v_mem, v_metodo, 'PENALIZACION_CANCELACION', v_pen, v_pen,
                    (v_cancel + TIME '11:00') AT TIME ZONE 'America/Guatemala', 'EXITOSO', 'DEMO-PEN-' || g)
            RETURNING id INTO v_cobro;
            INSERT INTO public.cancelaciones_membresia (membresia_id, fecha_solicitud, motivo_cancelacion,
                                                        cumplio_permanencia_minima, meses_restantes_contrato,
                                                        monto_penalizacion_calculado, cobro_penalizacion_id, procesado_por)
            VALUES (v_mem, (v_cancel + TIME '11:00') AT TIME ZONE 'America/Guatemala',
                    motivos[1 + floor(random() * array_length(motivos, 1))::int],
                    v_meses_rest = 0, v_meses_rest, v_pen, v_cobro, 'DEMO');
        END IF;

        -- --------------------------------------------------------------
        -- Entradas en recepción de los últimos 60 días
        -- --------------------------------------------------------------
        d := GREATEST(v_inicio, hoy - 60);
        WHILE d <= hoy LOOP
            IF random() < 0.38 THEN
                -- Más gente temprano (6-8) y al salir del trabajo (17-20).
                r := random();
                v_hora := CASE WHEN r < 0.35 THEN 6 + floor(random() * 3)::int
                               WHEN r < 0.80 THEN 17 + floor(random() * 4)::int
                               ELSE 9 + floor(random() * 8)::int END;
                v_sede_acc := v_sede;
                v_tipo := 'SEDE_BASE';
                v_ok := true;
                v_motivo := NULL;

                IF random() < 0.12 THEN
                    -- Visita a otra sede.
                    v_sede_acc := sedes[1 + floor(random() * array_length(sedes, 1))::int];
                    IF v_sede_acc <> v_sede THEN
                        v_tipo := 'NACIONAL';
                        IF v_plan = p_smart THEN
                            v_ok := false; v_motivo := 'PLAN_SIN_ACCESO_NACIONAL';
                        ELSIF v_plan <> p_black AND EXISTS (SELECT 1 FROM public.sucursales WHERE id = v_sede_acc AND es_sede_vip) THEN
                            v_ok := false; v_motivo := 'SEDE_VIP_NO_PERMITIDA';
                        END IF;
                    END IF;
                END IF;

                IF v_cancel IS NOT NULL AND d > v_cancel THEN
                    v_ok := false; v_motivo := 'SIN_MEMBRESIA_ACTIVA';
                ELSIF v_estado = 'SUSPENDIDA_IMPAGO' AND d > hoy - 20 THEN
                    v_ok := false; v_motivo := 'CLIENTE_NO_ACTIVO';
                END IF;

                -- Quien ya canceló casi nunca vuelve a intentar.
                IF v_motivo IS DISTINCT FROM 'SIN_MEMBRESIA_ACTIVA' OR random() < 0.05 THEN
                    INSERT INTO public.registros_acceso (cliente_id, sucursal_id, fecha_hora_acceso, tipo_acceso,
                                                         acceso_permitido, motivo_rechazo)
                    VALUES (v_cli, v_sede_acc,
                            (d + make_time(v_hora, floor(random() * 60)::int, 0)) AT TIME ZONE 'America/Guatemala',
                            v_tipo, v_ok, v_motivo);
                END IF;
            END IF;
            d := d + 1;
        END LOOP;
    END LOOP;

    -- ------------------------------------------------------------------
    -- Instructores y clases
    -- ------------------------------------------------------------------
    INSERT INTO public.instructores (sucursal_base_id, nombre_completo, especialidad, email, telefono)
    SELECT sedes[1 + ((v.n - 1) % array_length(sedes, 1))], v.nombre, v.especialidad, v.email, v.telefono
    FROM (VALUES
        (1, 'Lucía Herrera',  'Spinning y cardio',        'lucia.herrera@demo.flexpass.gt',  '55510001'),
        (2, 'Diego Morales',  'Entrenamiento funcional',  'diego.morales@demo.flexpass.gt',  '55510002'),
        (3, 'Andrea López',   'Yoga y pilates',           'andrea.lopez@demo.flexpass.gt',   '55510003'),
        (4, 'Kevin Ramírez',  'Crossfit',                 'kevin.ramirez@demo.flexpass.gt',  '55510004')
    ) AS v(n, nombre, especialidad, email, telefono);

    INSERT INTO public.clases_grupales (sucursal_id, instructor_id, nombre_clase, dia_semana, hora_inicio, hora_fin,
                                        cupo_maximo, requiere_plan_vip)
    SELECT i.sucursal_base_id, i.id, v.clase, v.dia, v.inicio::time, v.fin::time, v.cupo, v.vip
    FROM (VALUES
        ('lucia.herrera@demo.flexpass.gt',  'Spinning',           'LUNES',     '07:00', '08:00', 20, false),
        ('lucia.herrera@demo.flexpass.gt',  'Spinning',           'MIERCOLES', '18:00', '19:00', 20, false),
        ('lucia.herrera@demo.flexpass.gt',  'Cardio HIIT',        'VIERNES',   '07:00', '07:45', 15, false),
        ('diego.morales@demo.flexpass.gt',  'Funcional',          'MARTES',    '07:00', '08:00', 15, false),
        ('diego.morales@demo.flexpass.gt',  'Funcional',          'JUEVES',    '19:00', '20:00', 15, false),
        ('diego.morales@demo.flexpass.gt',  'Core',               'SABADO',    '09:00', '10:00', 12, false),
        ('andrea.lopez@demo.flexpass.gt',   'Yoga',               'MARTES',    '08:00', '09:00', 18, false),
        ('andrea.lopez@demo.flexpass.gt',   'Pilates',            'JUEVES',    '08:00', '09:00', 12, true),
        ('andrea.lopez@demo.flexpass.gt',   'Yoga restaurativo',  'DOMINGO',   '10:00', '11:00', 18, false),
        ('kevin.ramirez@demo.flexpass.gt',  'Crossfit',           'LUNES',     '19:00', '20:00', 16, false),
        ('kevin.ramirez@demo.flexpass.gt',  'Crossfit',           'MIERCOLES', '07:00', '08:00', 16, true)
    ) AS v(email, clase, dia, inicio, fin, cupo, vip)
    JOIN public.instructores i ON i.email = v.email;

    -- ------------------------------------------------------------------
    -- Reservas: últimas 4 semanas y la próxima
    -- ------------------------------------------------------------------
    FOR c IN
        SELECT cg.*, (ARRAY['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO','DOMINGO']) AS dias
        FROM public.clases_grupales cg
        JOIN public.instructores i ON i.id = cg.instructor_id
        WHERE i.email LIKE '%@demo.flexpass.gt'
    LOOP
        d := hoy - 28;
        WHILE d <= hoy + 7 LOOP
            IF c.dias[EXTRACT(ISODOW FROM d)::int] = c.dia_semana THEN
                v_n := ceil(c.cupo_maximo * (0.35 + random() * 0.65))::int;
                INSERT INTO public.reservas_clases (clase_id, cliente_id, fecha_clase, estado, created_at)
                SELECT c.id, cl.id, d,
                       CASE
                           WHEN d + c.hora_inicio <= timezone('America/Guatemala', now()) THEN
                               CASE WHEN x.r < 0.75 THEN 'ASISTIO' WHEN x.r < 0.90 THEN 'INASISTENCIA' ELSE 'CANCELADA' END
                           ELSE CASE WHEN x.r < 0.90 THEN 'RESERVADA' ELSE 'CANCELADA' END
                       END,
                       (d - (1 + floor(random() * 4)::int) + TIME '20:00') AT TIME ZONE 'America/Guatemala'
                FROM public.clientes cl
                JOIN public.membresias m ON m.cliente_id = cl.id AND m.estado = 'ACTIVA' AND m.fecha_inicio <= d
                JOIN public.planes p ON p.id = m.plan_id
                CROSS JOIN LATERAL (SELECT random() AS r) x
                WHERE cl.documento_identidad LIKE 'DEMO-%'
                  AND (cl.sucursal_base_id = c.sucursal_id OR p.permite_acceso_nacional OR p.permite_amenidades_vip)
                  AND (NOT COALESCE(c.requiere_plan_vip, false) OR p.permite_amenidades_vip)
                ORDER BY random()
                LIMIT v_n;
            END IF;
            d := d + 1;
        END LOOP;
    END LOOP;

END $$;

-- Resumen de lo cargado
SELECT 'clientes' AS tabla, count(*) AS filas FROM public.clientes WHERE documento_identidad LIKE 'DEMO-%'
UNION ALL SELECT 'membresias', count(*) FROM public.membresias m JOIN public.clientes c ON c.id = m.cliente_id WHERE c.documento_identidad LIKE 'DEMO-%'
UNION ALL SELECT 'cobros', count(*) FROM public.cobros_automaticos WHERE referencia_transaccion LIKE 'DEMO-%'
UNION ALL SELECT 'periodos', count(*) FROM public.periodos_facturacion pf JOIN public.membresias m ON m.id = pf.membresia_id JOIN public.clientes c ON c.id = m.cliente_id WHERE c.documento_identidad LIKE 'DEMO-%'
UNION ALL SELECT 'cancelaciones', count(*) FROM public.cancelaciones_membresia WHERE procesado_por = 'DEMO'
UNION ALL SELECT 'entradas', count(*) FROM public.registros_acceso ra JOIN public.clientes c ON c.id = ra.cliente_id WHERE c.documento_identidad LIKE 'DEMO-%'
UNION ALL SELECT 'clases', count(*) FROM public.clases_grupales cg JOIN public.instructores i ON i.id = cg.instructor_id WHERE i.email LIKE '%@demo.flexpass.gt'
UNION ALL SELECT 'reservas', count(*) FROM public.reservas_clases rc JOIN public.clientes c ON c.id = rc.cliente_id WHERE c.documento_identidad LIKE 'DEMO-%';
