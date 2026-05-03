-- reportes debe referenciar auth.users porque el Bearer es el JWT de Supabase Auth (claim sub).
-- Ejecutá esto una vez en Supabase → SQL Editor.
--
-- Si ya hay filas en reportes cuyos usuario_id no existen en auth.users, DROP CONSTRAINT puede
-- funcionar igual; pero ADD CONSTRAINT fallará hasta borrar/asignar esas filas. Opcional antes:
--   DELETE FROM reportes WHERE usuario_id NOT IN (SELECT id FROM auth.users);

BEGIN;

ALTER TABLE reportes DROP CONSTRAINT IF EXISTS reportes_usuario_id_fkey;

ALTER TABLE reportes
  ADD CONSTRAINT reportes_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES auth.users (id) ON DELETE CASCADE;

COMMIT;
