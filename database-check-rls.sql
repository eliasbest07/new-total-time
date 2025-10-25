-- =========================================
-- VERIFICAR Y AJUSTAR RLS para misiones_activas
-- =========================================

-- 1. Ver las políticas RLS actuales
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'misiones_activas';

-- 2. Verificar si RLS está habilitado
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'misiones_activas';

-- =========================================
-- SOLUCIÓN: Agregar política para SELECT sin restricciones
-- =========================================
-- Esto permite que cualquier usuario autenticado pueda ver TODAS las misiones_activas
-- (necesario para que getByTipoAndReferenciaOnly funcione)

-- OPCIÓN A: Política permisiva para SELECT (RECOMENDADO para desarrollo)
DROP POLICY IF EXISTS "Permitir SELECT a todos los usuarios autenticados" ON misiones_activas;

CREATE POLICY "Permitir SELECT a todos los usuarios autenticados"
ON misiones_activas
FOR SELECT
TO authenticated
USING (true);  -- Permite ver todas las filas

-- OPCIÓN B: Política más restrictiva (solo ver misiones donde eres usuario asignado o creador)
-- Descomenta esto si prefieres más seguridad en producción
/*
DROP POLICY IF EXISTS "Usuarios pueden ver sus misiones" ON misiones_activas;

CREATE POLICY "Usuarios pueden ver sus misiones"
ON misiones_activas
FOR SELECT
TO authenticated
USING (
  auth.uid() = id_usuario_asignado OR
  auth.uid() = id_creador
);
*/

-- =========================================
-- Verificar las nuevas políticas
-- =========================================
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'misiones_activas'
  AND cmd = 'SELECT';
