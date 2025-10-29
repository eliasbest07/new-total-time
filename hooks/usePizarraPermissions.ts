import { useState, useEffect, useCallback } from 'react';
import { SupabasePizarraPermissionRepository } from '@/infrastructure/datasource/SupabasePizarraPermissionRepository';
import { PizarraPermission } from '@/domain/entities/PizarraPermission';

interface UsePizarraPermissionsReturn {
  permission: PizarraPermission | null;
  hasPermission: boolean;
  isPending: boolean;
  loading: boolean;
  requestPermission: () => Promise<void>;
  grantPermission: (editorId: number) => Promise<void>;
  revokePermission: (editorId: number) => Promise<void>;
}

/**
 * Hook para manejar permisos de edición de pizarra
 * @param ownerId ID numérico del dueño de la pizarra
 * @param editorId ID numérico del usuario que solicita/tiene permiso
 */
export const usePizarraPermissions = (
  ownerId: number | null,
  editorId: number | null
): UsePizarraPermissionsReturn => {
  const [permission, setPermission] = useState<PizarraPermission | null>(null);
  const [loading, setLoading] = useState(false);

  const repo = new SupabasePizarraPermissionRepository();

  // Cargar estado del permiso
  const loadPermission = useCallback(async () => {
    if (!ownerId || !editorId) {
      setPermission(null);
      return;
    }

    setLoading(true);
    try {
      const perm = await repo.getPermission(ownerId, editorId);
      setPermission(perm);
    } catch (error) {
      console.error('Error cargando permiso:', error);
    } finally {
      setLoading(false);
    }
  }, [ownerId, editorId]);

  // Solicitar permiso
  const requestPermission = useCallback(async () => {
    if (!ownerId || !editorId) {
      console.error('Falta ownerId o editorId');
      return;
    }

    try {
      const newPermission = await repo.createRequest({
        id_usuario_owner: ownerId,
        id_usuario_editor: editorId,
        granted: false
      });

      if (newPermission) {
        setPermission(newPermission);
        console.log('✅ Solicitud de permiso enviada');
      }
    } catch (error) {
      console.error('Error solicitando permiso:', error);
    }
  }, [ownerId, editorId]);

  // Otorgar permiso (solo el dueño)
  const grantPermission = useCallback(async (requestEditorId: number) => {
    if (!ownerId) {
      console.error('Falta ownerId');
      return;
    }

    try {
      const updated = await repo.updatePermission(ownerId, requestEditorId, {
        granted: true
      });

      if (updated) {
        // Si es el permiso actual, actualizar estado
        if (requestEditorId === editorId) {
          setPermission(updated);
        }
        console.log('✅ Permiso otorgado');
      }
    } catch (error) {
      console.error('Error otorgando permiso:', error);
    }
  }, [ownerId, editorId]);

  // Revocar permiso (solo el dueño)
  const revokePermission = useCallback(async (requestEditorId: number) => {
    if (!ownerId) {
      console.error('Falta ownerId');
      return;
    }

    try {
      const updated = await repo.updatePermission(ownerId, requestEditorId, {
        granted: false,
        granted_at: null
      });

      if (updated) {
        // Si es el permiso actual, actualizar estado
        if (requestEditorId === editorId) {
          setPermission(updated);
        }
        console.log('✅ Permiso revocado');
      }
    } catch (error) {
      console.error('Error revocando permiso:', error);
    }
  }, [ownerId, editorId]);

  // Cargar permiso al montar
  useEffect(() => {
    loadPermission();
  }, [loadPermission]);

  return {
    permission,
    hasPermission: permission?.granted || false,
    isPending: permission !== null && !permission.granted,
    loading,
    requestPermission,
    grantPermission,
    revokePermission
  };
};
