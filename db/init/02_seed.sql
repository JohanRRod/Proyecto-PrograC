INSERT INTO paises (nombre, codigo_iso, moneda, simbolo_moneda) VALUES
('Guatemala', 'GTM', 'GTQ', 'Q'),
('México', 'MEX', 'MXN', '$'),
('Colombia', 'COL', 'COP', '$')
ON CONFLICT (codigo_iso) DO NOTHING;

INSERT INTO sucursales (pais_id, nombre, codigo_sucursal, direccion, ciudad, latitud, longitud, telefono, es_sede_vip) VALUES
(1, 'SmartGym Pradera Xela', 'GTM-XEL-01', 'Av. Las Américas, C.C. Pradera Xela, Zona 3', 'Quetzaltenango', 14.83611100, -91.53694400, '+502 7767-0001', TRUE),
(1, 'SmartGym Interplaza Xela', 'GTM-XEL-02', 'Km 205 Carretera a San Marcos', 'Quetzaltenango', 14.85944400, -91.55416700, '+502 7767-0002', FALSE),
(1, 'SmartGym Majadas Once', 'GTM-GUA-01', 'Anillo Periférico Zona 11', 'Ciudad de Guatemala', 14.62388900, -90.55361100, '+502 2200-0001', TRUE),
(2, 'SmartGym Reforma 222', 'MEX-CDMX-01', 'Av. Paseo de la Reforma 222, Juárez', 'Ciudad de México', 19.42888900, -99.16166700, '+52 55 5000-0001', TRUE),
(3, 'SmartGym Parque La Colina', 'COL-BOG-01', 'Cra. 58d #146-51, Suba', 'Bogotá', 4.73250000, -74.06638900, '+57 1 600-0001', TRUE)
ON CONFLICT (codigo_sucursal) DO NOTHING;

INSERT INTO amenidades (nombre, descripcion, requiere_plan_vip) VALUES
('Área de Peso Libre e Integrado', 'Zona completa de mancuernas, barras olímpicas y máquinas poleas', FALSE),
('Zona Cardio Cinema', 'Caminadoras y elípticas con pantalla gigante', FALSE),
('Sillones de Hidromasaje SmartSpa', 'Sillones de masaje relajante post-entreno (Exclusivo Black)', TRUE),
('Cabinas de Bronceado y Colágeno', 'Acceso a cabinas de rayos UV y colágeno (Exclusivo Black)', TRUE),
('Sauna y Vapor VIP', 'Área húmeda de recuperación muscular (Exclusivo Black)', TRUE);

INSERT INTO sucursal_amenidades (sucursal_id, amenidad_id, disponible, capacidad_zona) VALUES
(1, 1, TRUE, 80), (1, 2, TRUE, 40), (1, 3, TRUE, 6), (1, 4, TRUE, 4), (1, 5, TRUE, 10),
(2, 1, TRUE, 60), (2, 2, TRUE, 30),
(3, 1, TRUE, 100), (3, 2, TRUE, 50), (3, 3, TRUE, 8), (3, 5, TRUE, 15),
(4, 1, TRUE, 120), (4, 2, TRUE, 60), (4, 3, TRUE, 10), (4, 4, TRUE, 6),
(5, 1, TRUE, 90), (5, 2, TRUE, 45), (5, 3, TRUE, 8)
ON CONFLICT (sucursal_id, amenidad_id) DO NOTHING;

INSERT INTO planes (nombre, descripcion, precio_mensual, cuota_inscripcion, cuota_mantenimiento_anual, meses_permanencia_minima, porcentaje_penalizacion, permite_acceso_nacional, permite_acceso_internacional, permite_amenidades_vip, invitados_mensuales_gratis) VALUES
('Plan Smart (Sede Única)', 'Entrena únicamente en tu gimnasio base sin acceso a zonas VIP.', 199.00, 150.00, 250.00, 12, 25.00, FALSE, FALSE, FALSE, 0),
('Plan Nacional Pro', 'Entrena en cualquier gimnasio del país. Sin acceso internacional ni zonas VIP.', 249.00, 50.00, 250.00, 12, 20.00, TRUE, FALSE, FALSE, 2),
('Plan Black Internacional VIP', 'Acceso total a todos los gimnasios nacionales e internacionales + Sillones de masaje, Sauna y Bronceado.', 299.00, 0.00, 250.00, 12, 20.00, TRUE, TRUE, TRUE, 5);
