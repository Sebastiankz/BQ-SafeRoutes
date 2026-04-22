-- ================================================================
-- SafeRoutes BQ - Script de inicialización de base de datos
-- Ejecutado automáticamente al crear el contenedor PostgreSQL
-- ================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ── Tabla: usuarios ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    nombre          VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    reputacion      FLOAT DEFAULT 1.0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: reportes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reportes (
    id              SERIAL PRIMARY KEY,
    usuario_id      INTEGER NOT NULL REFERENCES usuarios(id),
    tipo            VARCHAR(50) NOT NULL,
    descripcion     TEXT,
    foto_url        VARCHAR(500),
    ubicacion       GEOMETRY(POINT, 4326) NOT NULL,
    severidad       INTEGER DEFAULT 1 CHECK (severidad BETWEEN 1 AND 5),
    validaciones    INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: hotspots ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotspots (
    id              SERIAL PRIMARY KEY,
    ubicacion       GEOMETRY(POINT, 4326) NOT NULL,
    radio_metros    FLOAT NOT NULL,
    nivel_riesgo    VARCHAR(20) NOT NULL,
    num_incidentes  INTEGER DEFAULT 0,
    origen          VARCHAR(20) NOT NULL,
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índices espaciales ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reportes_ubicacion ON reportes USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS idx_hotspots_ubicacion ON hotspots USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS idx_reportes_tipo ON reportes (tipo);
CREATE INDEX IF NOT EXISTS idx_reportes_created ON reportes (created_at DESC);

-- ── Usuario de prueba (desarrollo) ──────────────────────────────
INSERT INTO usuarios (email, nombre, hashed_password, reputacion)
VALUES ('test@saferoutes.dev', 'Usuario Test', 'dev_password_not_hashed', 1.0)
ON CONFLICT (email) DO NOTHING;

-- ── Hotspots de ejemplo basados en zonas conocidas de Barranquilla ──
INSERT INTO hotspots (ubicacion, radio_metros, nivel_riesgo, num_incidentes, origen)
VALUES
    (ST_SetSRID(ST_MakePoint(-74.7889, 10.9685), 4326), 500, 'alto',    45, 'ipat'),
    (ST_SetSRID(ST_MakePoint(-74.8100, 10.9900), 4326), 300, 'medio',   22, 'ipat'),
    (ST_SetSRID(ST_MakePoint(-74.7750, 10.9780), 4326), 400, 'alto',    38, 'ipat'),
    (ST_SetSRID(ST_MakePoint(-74.7960, 10.9620), 4326), 250, 'bajo',    12, 'ipat'),
    (ST_SetSRID(ST_MakePoint(-74.8050, 10.9830), 4326), 350, 'medio',   28, 'ipat')
ON CONFLICT DO NOTHING;
