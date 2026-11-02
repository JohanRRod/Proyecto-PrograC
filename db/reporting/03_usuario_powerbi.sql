-- =====================================================================
-- Usuario de solo lectura para Power BI
-- =====================================================================
-- Ejecutar DESPUÉS de 02_esquema_reporting.sql, en el SQL Editor de Supabase.
--
-- 1. Cambia CAMBIAR_ESTA_CLAVE por una clave larga ANTES de ejecutar.
-- 2. No guardes la clave en este archivo ni la subas a GitHub.
--
-- En Power BI (a través del pooler de Supabase) el usuario se escribe
-- con la referencia del proyecto: powerbi_lector.<referencia-del-proyecto>
-- =====================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'powerbi_lector') THEN
        CREATE ROLE powerbi_lector WITH LOGIN PASSWORD 'CAMBIAR_ESTA_CLAVE' CONNECTION LIMIT 15;
    ELSE
        ALTER ROLE powerbi_lector WITH LOGIN PASSWORD 'CAMBIAR_ESTA_CLAVE' CONNECTION LIMIT 15;
    END IF;
END $$;

-- Power BI carga varias vistas a la vez (una conexión por vista), por eso el límite es 15.

-- Toda sesión de este usuario es de solo lectura y no puede quedarse colgada.
ALTER ROLE powerbi_lector SET default_transaction_read_only = on;
ALTER ROLE powerbi_lector SET statement_timeout = '60s';
ALTER ROLE powerbi_lector SET search_path = reporting;

-- Solo puede leer el esquema reporting.
GRANT USAGE ON SCHEMA reporting TO powerbi_lector;
GRANT SELECT ON ALL TABLES IN SCHEMA reporting TO powerbi_lector;
ALTER DEFAULT PRIVILEGES IN SCHEMA reporting GRANT SELECT ON TABLES TO powerbi_lector;

-- Y nada de public (por si alguna tabla tuviera permisos para PUBLIC).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM powerbi_lector;
REVOKE CREATE ON SCHEMA public FROM powerbi_lector;

-- Comprobación: debe devolver solo filas del esquema reporting con privilegio SELECT.
SELECT table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'powerbi_lector'
ORDER BY table_name;
