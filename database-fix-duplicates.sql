-- =========================================
-- FIX: Prevenir duplicados en misiones_activas
-- =========================================

-- PASO 1: Ver duplicados actuales (solo para revisar)
SELECT
  tipo,
  id_referencia,
  COUNT(*) as cantidad_duplicados,
  array_agg(id) as ids_duplicados
FROM misiones_activas
GROUP BY tipo, id_referencia
HAVING COUNT(*) > 1
ORDER BY cantidad_duplicados DESC;

-- PASO 2: Limpiar duplicados (mantener solo el más reciente)
-- ADVERTENCIA: Esto eliminará los duplicados. Guarda un backup primero!
WITH ranked_misiones AS (
  SELECT
    id,
    tipo,
    id_referencia,
    ROW_NUMBER() OVER (
      PARTITION BY tipo, id_referencia
      ORDER BY updated_at DESC
    ) as rn
  FROM misiones_activas
)
DELETE FROM misiones_activas
WHERE id IN (
  SELECT id
  FROM ranked_misiones
  WHERE rn > 1
);

-- PASO 3: Agregar constraint UNIQUE para prevenir futuros duplicados
ALTER TABLE misiones_activas
ADD CONSTRAINT unique_tipo_referencia
UNIQUE (tipo, id_referencia);

-- PASO 4: Crear índice para mejorar performance de búsquedas
CREATE INDEX IF NOT EXISTS idx_misiones_activas_tipo_referencia
ON misiones_activas (tipo, id_referencia);

-- =========================================
-- Verificar que el constraint se aplicó
-- =========================================
SELECT
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'misiones_activas'::regclass
  AND conname = 'unique_tipo_referencia';
