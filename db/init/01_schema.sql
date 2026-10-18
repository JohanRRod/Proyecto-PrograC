CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE IF NOT EXISTS paises (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo_iso VARCHAR(3) NOT NULL UNIQUE,
    moneda VARCHAR(10) NOT NULL,
    simbolo_moneda VARCHAR(5) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sucursales (
    id SERIAL PRIMARY KEY,
    pais_id INT NOT NULL REFERENCES paises(id) ON DELETE RESTRICT,
    nombre VARCHAR(150) NOT NULL,
    codigo_sucursal VARCHAR(20) NOT NULL UNIQUE,
    direccion TEXT NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    telefono VARCHAR(30),
    horario_apertura TIME NOT NULL DEFAULT '05:00:00',
    horario_cierre TIME NOT NULL DEFAULT '22:00:00',
    capacidad_maxima INT NOT NULL DEFAULT 200,
    es_sede_vip BOOLEAN DEFAULT FALSE,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS amenidades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono_url TEXT,
    requiere_plan_vip BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sucursal_amenidades (
    id SERIAL PRIMARY KEY,
    sucursal_id INT NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    amenidad_id INT NOT NULL REFERENCES amenidades(id) ON DELETE CASCADE,
    disponible BOOLEAN DEFAULT TRUE,
    capacidad_zona INT DEFAULT 10,
    horario_especial VARCHAR(100),
    UNIQUE(sucursal_id, amenidad_id)
);

CREATE TABLE IF NOT EXISTS planes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio_mensual DECIMAL(10, 2) NOT NULL,
    cuota_inscripcion DECIMAL(10, 2) DEFAULT 0.00,
    cuota_mantenimiento_anual DECIMAL(10, 2) DEFAULT 0.00,
    meses_permanencia_minima INT NOT NULL DEFAULT 12,
    porcentaje_penalizacion DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    permite_acceso_nacional BOOLEAN DEFAULT FALSE,
    permite_acceso_internacional BOOLEAN DEFAULT FALSE,
    permite_amenidades_vip BOOLEAN DEFAULT FALSE,
    invitados_mensuales_gratis INT DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    documento_identidad VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(30),
    fecha_nacimiento DATE,
    sucursal_base_id INT NOT NULL REFERENCES sucursales(id),
    codigo_qr_acceso VARCHAR(100) UNIQUE NOT NULL,
    estado VARCHAR(20) DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'MOROSO', 'INACTIVO', 'BLOQUEADO')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metodos_pago_cliente (
    id SERIAL PRIMARY KEY,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tipo_cuenta VARCHAR(30) NOT NULL CHECK (tipo_cuenta IN ('TARJETA_CREDITO', 'TARJETA_DEBITO', 'CUENTA_BANCARIA')),
    banco_emisor VARCHAR(100) NOT NULL,
    ultimos_cuatro_digitos VARCHAR(4) NOT NULL,
    titular VARCHAR(150) NOT NULL,
    token_pasarela_simulado VARCHAR(255) NOT NULL,
    saldo_simulado DECIMAL(12, 2) DEFAULT 5000.00,
    es_predeterminado BOOLEAN DEFAULT TRUE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS membresias (
    id SERIAL PRIMARY KEY,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    plan_id INT NOT NULL REFERENCES planes(id) ON DELETE RESTRICT,
    metodo_pago_id INT REFERENCES metodos_pago_cliente(id),
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin_permanencia_minima DATE NOT NULL,
    dia_corte_mensual INT NOT NULL CHECK (dia_corte_mensual BETWEEN 1 AND 28),
    descuento_automatico_activo BOOLEAN DEFAULT TRUE,
    estado VARCHAR(20) DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'SUSPENDIDA_IMPAGO', 'CANCELADA', 'FINALIZADA')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cobros_automaticos (
    id SERIAL PRIMARY KEY,
    membresia_id INT NOT NULL REFERENCES membresias(id) ON DELETE RESTRICT,
    metodo_pago_id INT NOT NULL REFERENCES metodos_pago_cliente(id),
    concepto VARCHAR(100) NOT NULL CHECK (concepto IN ('MENSUALIDAD', 'INSCRIPCION', 'MANTENIMIENTO_ANUAL', 'PENALIZACION_CANCELACION')),
    monto_bruto DECIMAL(10, 2) NOT NULL,
    descuento_aplicado DECIMAL(10, 2) DEFAULT 0.00,
    monto_total_cobrado DECIMAL(10, 2) NOT NULL,
    fecha_intento TIMESTAMPTZ DEFAULT NOW(),
    estado_transaccion VARCHAR(20) NOT NULL CHECK (estado_transaccion IN ('EXITOSO', 'RECHAZADO_FONDOS', 'PENDIENTE')),
    referencia_transaccion VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS cancelaciones_membresia (
    id SERIAL PRIMARY KEY,
    membresia_id INT NOT NULL UNIQUE REFERENCES membresias(id) ON DELETE RESTRICT,
    fecha_solicitud TIMESTAMPTZ DEFAULT NOW(),
    motivo_cancelacion TEXT NOT NULL,
    cumplio_permanencia_minima BOOLEAN NOT NULL,
    meses_restantes_contrato INT NOT NULL DEFAULT 0,
    monto_penalizacion_calculado DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    cobro_penalizacion_id INT REFERENCES cobros_automaticos(id),
    procesado_por VARCHAR(100) DEFAULT 'SISTEMA_WEB'
);

CREATE TABLE IF NOT EXISTS registros_acceso (
    id SERIAL PRIMARY KEY,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    sucursal_id INT NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    amenidad_id INT REFERENCES amenidades(id),
    fecha_hora_acceso TIMESTAMPTZ DEFAULT NOW(),
    tipo_acceso VARCHAR(30) NOT NULL CHECK (tipo_acceso IN ('SEDE_BASE', 'NACIONAL', 'INTERNACIONAL', 'ZONA_EXCLUSIVA_VIP')),
    acceso_permitido BOOLEAN NOT NULL,
    motivo_rechazo VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS instructores (
    id SERIAL PRIMARY KEY,
    sucursal_base_id INT NOT NULL REFERENCES sucursales(id),
    nombre_completo VARCHAR(150) NOT NULL,
    especialidad VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    telefono VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clases_grupales (
    id SERIAL PRIMARY KEY,
    sucursal_id INT NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    instructor_id INT NOT NULL REFERENCES instructores(id),
    nombre_clase VARCHAR(100) NOT NULL,
    dia_semana VARCHAR(20) NOT NULL CHECK (dia_semana IN ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO')),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    cupo_maximo INT NOT NULL DEFAULT 25,
    requiere_plan_vip BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS reservas_clases (
    id SERIAL PRIMARY KEY,
    clase_id INT NOT NULL REFERENCES clases_grupales(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    fecha_clase DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'RESERVADA' CHECK (estado IN ('RESERVADA', 'ASISTIO', 'CANCELADA', 'INASISTENCIA')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipos_gimnasio (
    id SERIAL PRIMARY KEY,
    sucursal_id INT NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    nombre_equipo VARCHAR(150) NOT NULL,
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('CARDIO', 'PESO_INTEGRADO', 'PESO_LIBRE', 'FUNCIONAL')),
    marca VARCHAR(100),
    numero_serie VARCHAR(100) UNIQUE NOT NULL,
    estado VARCHAR(30) DEFAULT 'OPERATIVO' CHECK (estado IN ('OPERATIVO', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO')),
    fecha_adquisicion DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS logs_sistema (
    id BIGSERIAL PRIMARY KEY,
    fecha_hora TIMESTAMPTZ DEFAULT NOW(),
    usuario_id VARCHAR(100),
    modulo VARCHAR(100) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_id VARCHAR(100),
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    direccion_ip VARCHAR(45),
    exitoso BOOLEAN DEFAULT TRUE,
    mensaje_error TEXT
);

CREATE TABLE IF NOT EXISTS logs_agente_ia (
    id BIGSERIAL PRIMARY KEY,
    fecha_hora TIMESTAMPTZ DEFAULT NOW(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    sesion_id VARCHAR(100) NOT NULL,
    prompt_usuario TEXT NOT NULL,
    respuesta_agente TEXT NOT NULL,
    documentos_citados JSONB,
    tokens_utilizados INT DEFAULT 0,
    tiempo_respuesta_ms INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS documentos_rag (
    id BIGSERIAL PRIMARY KEY,
    titulo_documento VARCHAR(200) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    contenido_texto TEXT NOT NULL,
    metadatos JSONB,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
