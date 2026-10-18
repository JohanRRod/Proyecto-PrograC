-- Plantilla de esquema. Rellena según tu modelo de dominio.

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE gyms (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    owner_id    INTEGER REFERENCES users(id),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE rabbitmq_logs (
    id          SERIAL PRIMARY KEY,
    event_time  TIMESTAMP WITH TIME ZONE DEFAULT now(),
    exchange    VARCHAR(100),
    routing_key VARCHAR(100),
    payload     TEXT
);

-- TODO: Añade aquí el resto de las tablas que descubras en el código Java.

