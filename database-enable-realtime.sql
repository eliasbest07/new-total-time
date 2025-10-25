-- =========================================
-- VERIFICAR Y HABILITAR REALTIME para misiones_activas
-- =========================================

-- PASO 1: Verificar si Realtime está habilitado
SELECT
  schemaname,
  tablename,
  CASE
    WHEN oid IN (
      SELECT objid
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
    ) THEN 'HABILITADO'
    ELSE 'DESHABILITADO'
  END as realtime_status
FROM pg_tables pt
JOIN pg_class pc ON pc.relname = pt.tablename
WHERE schemaname = 'public'
  AND tablename = 'misiones_activas';

-- PASO 2: Ver todas las tablas con Realtime habilitado
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- =========================================
-- SOLUCIÓN: Habilitar Realtime (si está deshabilitado)
-- =========================================

-- OPCIÓN A: Habilitar desde el Dashboard de Supabase (RECOMENDADO)
-- 1. Ve a Database > Replication
-- 2. Busca la tabla "misiones_activas"
-- 3. Activa el toggle "Enable Realtime"

-- OPCIÓN B: Habilitar con SQL (ejecuta esto si la opción A no funciona)
ALTER PUBLICATION supabase_realtime ADD TABLE misiones_activas;

-- =========================================
-- VERIFICAR que se habilitó correctamente
-- =========================================
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'misiones_activas';
-- Debe retornar 1 fila si está habilitado

-- =========================================
-- BONUS: Verificar configuración de triggers
-- =========================================
-- Ver los triggers de la tabla (debe incluir realtime triggers)
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'misiones_activas';
