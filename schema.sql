-- ==========================================================
-- schema.sql – Supabase (PostgreSQL) para Proyecto Gym
-- ==========================================================
-- 1️⃣  Tablas de usuarios y autenticación
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(200),
    role            VARCHAR(50) DEFAULT 'member',   -- member, trainer, admin
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 2️⃣  Gimnasios (pueden ser varios centros)
CREATE TABLE IF NOT EXISTS gyms (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    address         TEXT,
    phone           VARCHAR(30),
    owner_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 3️⃣  Membresías / suscripciones
CREATE TABLE IF NOT EXISTS memberships (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    gym_id          INTEGER REFERENCES gyms(id) ON DELETE CASCADE,
    start_date      DATE NOT NULL,
    end_date        DATE,
    status          VARCHAR(20) DEFAULT 'active',   -- active, cancelled, expired
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 4️⃣  Clases grupales (y horarios)
CREATE TABLE IF NOT EXISTS class_types (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    duration_min    INTEGER NOT NULL,               -- duración en minutos
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_schedules (
    id              SERIAL PRIMARY KEY,
    gym_id          INTEGER REFERENCES gyms(id) ON DELETE CASCADE,
    class_type_id   INTEGER REFERENCES class_types(id) ON DELETE CASCADE,
    instructor_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    start_time      TIMESTAMPTZ NOT NULL,
    capacity        INTEGER NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- 5️⃣  Inscripciones a clases
CREATE TABLE IF NOT EXISTS class_registrations (
    id              SERIAL PRIMARY KEY,
    schedule_id     INTEGER REFERENCES class_schedules(id) ON DELETE CASCADE,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(20) DEFAULT 'booked',   -- booked, attended, cancelled
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- 6️⃣  Ejercicios (catalogo)
CREATE TABLE IF NOT EXISTS exercises (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    muscle_group    VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- 7️⃣  Rutinas personalizadas (asociadas a usuarios)
CREATE TABLE IF NOT EXISTS routines (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routine_exercises (
    id              SERIAL PRIMARY KEY,
    routine_id      INTEGER REFERENCES routines(id) ON DELETE CASCADE,
    exercise_id     INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    order_no        INTEGER NOT NULL,
    sets            INTEGER NOT NULL,
    reps            INTEGER NOT NULL,
    rest_seconds    INTEGER,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- 8️⃣  Registros de uso de RabbitMQ (para auditoría)
CREATE TABLE IF NOT EXISTS rabbitmq_logs (
    id              SERIAL PRIMARY KEY,
    event_time      TIMESTAMPTZ DEFAULT now(),
    exchange        VARCHAR(100),
    routing_key     VARCHAR(100),
    payload         TEXT
);

-- ==========================================================
-- Índices y triggers comunes
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_gym_owner ON gyms(owner_id);
CREATE INDEX IF NOT EXISTS idx_class_schedule_time ON class_schedules(start_time);
CREATE INDEX IF NOT EXISTS idx_routine_user ON routines(user_id);
-- -----------------------------------------------------------------
-- Fin del script
-- -----------------------------------------------------------------