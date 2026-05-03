-- Datos de prueba SafeRoutes BQ — ejecutar en Supabase SQL Editor
-- Requiere extensión PostGIS habilitada en el proyecto.
-- Coordenadas alineadas con etl/data/geocache.json (Barranquilla, SRID 4326).
-- ST_MakePoint(longitud, latitud) — orden PostGIS correcto.

BEGIN;

-- Opcional: vaciar tablas en orden (descomenta solo si quieres empezar limpio)
-- TRUNCATE TABLE reportes, hotspots, usuarios RESTART IDENTITY CASCADE;

INSERT INTO usuarios (email, nombre, hashed_password, reputacion)
VALUES
  ('demo1@saferoutes.test', 'María López', '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', 4.2),
  ('demo2@saferoutes.test', 'Carlos Ruiz', '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', 3.8),
  ('demo3@saferoutes.test', 'Ana Mejía', '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', 5.0)
ON CONFLICT (email) DO NOTHING;

-- reportes.usuario_id referencia auth.users (login Supabase); no usar public.usuarios aquí.
-- Para demo de reportes, insertá con un usuario_id copiado de auth.users después de crear la cuenta.

INSERT INTO reportes (usuario_id, tipo, descripcion, foto_url, ubicacion, severidad, validaciones)
SELECT id, 'accidente', 'Choque leve en intersección — datos seed', NULL,
       ST_SetSRID(ST_MakePoint(-74.80347379999999, 10.9431292), 4326)::geometry,
       3, 2
FROM auth.users WHERE email = 'demo1@saferoutes.test';

INSERT INTO reportes (usuario_id, tipo, descripcion, foto_url, ubicacion, severidad, validaciones)
SELECT id, 'hueco', 'Hueco profundo en calzada', NULL,
       ST_SetSRID(ST_MakePoint(-74.8031836, 10.9866373), 4326)::geometry,
       4, 0
FROM auth.users WHERE email = 'demo2@saferoutes.test';

INSERT INTO reportes (usuario_id, tipo, descripcion, foto_url, ubicacion, severidad, validaciones)
SELECT id, 'arroyo', 'Acumulación de agua tras lluvia', NULL,
       ST_SetSRID(ST_MakePoint(-74.7790397, 10.9550326), 4326)::geometry,
       5, 5
FROM auth.users WHERE email = 'demo1@saferoutes.test';

INSERT INTO reportes (usuario_id, tipo, descripcion, foto_url, ubicacion, severidad, validaciones)
SELECT id, 'semaforo_danado', 'Semáforo intermitente', NULL,
       ST_SetSRID(ST_MakePoint(-74.79508899999999, 10.9775768), 4326)::geometry,
       2, 1
FROM auth.users WHERE email = 'demo3@saferoutes.test';

INSERT INTO reportes (usuario_id, tipo, descripcion, foto_url, ubicacion, severidad, validaciones)
SELECT id, 'otro', 'Reporte categoría otro — seed', NULL,
       ST_SetSRID(ST_MakePoint(-74.7861704, 10.9631486), 4326)::geometry,
       1, 0
FROM auth.users WHERE email = 'demo2@saferoutes.test';

INSERT INTO hotspots (ubicacion, radio_metros, nivel_riesgo, num_incidentes, origen, activo)
VALUES
  (ST_SetSRID(ST_MakePoint(-74.80347379999999, 10.9431292), 4326)::geometry, 400, 'alto', 45, 'ipat', true),
  (ST_SetSRID(ST_MakePoint(-74.7790397, 10.9550326), 4326)::geometry, 250, 'medio', 18, 'ciudadano', true),
  (ST_SetSRID(ST_MakePoint(-74.79508899999999, 10.9775768), 4326)::geometry, 600, 'bajo', 7, 'mixto', false);

COMMIT;

-- Verificación rápida (opcional):
-- SELECT id, email, nombre FROM usuarios;
-- SELECT id, usuario_id, tipo, ST_AsText(ubicacion) AS punto FROM reportes;
-- SELECT id, nivel_riesgo, activo, ST_AsText(ubicacion) FROM hotspots;
