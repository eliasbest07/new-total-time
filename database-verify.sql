-- =========================================
-- VERIFICACIÓN: Después de ejecutar el fix
-- =========================================

-- 1. Verificar que NO hay duplicados
SELECT
  tipo,
  id_referencia,
  COUNT(*) as cantidad
FROM misiones_activas
GROUP BY tipo, id_referencia
HAVING COUNT(*) > 1;
-- ✅ Debe retornar 0 filas (vacío)

-- 2. Verificar que el constraint existe
SELECT
  conname as nombre_constraint,
  contype as tipo,
  CASE
    WHEN contype = 'u' THEN 'UNIQUE'
    WHEN contype = 'p' THEN 'PRIMARY KEY'
    WHEN contype = 'f' THEN 'FOREIGN KEY'
    WHEN contype = 'c' THEN 'CHECK'
  END as descripcion
FROM pg_constraint
WHERE conrelid = 'misiones_activas'::regclass
  AND conname = 'unique_tipo_referencia';
-- ✅ Debe retornar 1 fila mostrando el constraint UNIQUE

-- 3. Ver el estado actual de misiones_activas (todas las filas)
SELECT
  id,
  tipo,
  id_referencia,
  estado,
  is_running,
  id_usuario_asignado,
  created_at,
  updated_at
FROM misiones_activas
ORDER BY updated_at DESC;
-- ℹ️ Muestra todas las misiones activas actuales

-- 4. Ver solo la Misión ID 13 (tu ejemplo)
SELECT
  id,
  tipo,
  id_referencia,
  estado,
  is_running,
  id_usuario_asignado,
  tiempo_total_segundos,
  fecha_inicio,
  created_at,
  updated_at
FROM misiones_activas
WHERE tipo = 'mision' AND id_referencia = 13;
-- ℹ️ Debe mostrar MÁXIMO 1 fila para la misión 13
