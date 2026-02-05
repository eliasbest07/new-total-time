import { useState, useEffect, useCallback, useRef } from 'react';
import { PizarraOrganizacionPermiso } from '@/domain/entities/PizarraOrganizacionPermiso';
import { SupabasePizarraOrganizacionRepository } from '@/infrastructure/datasource/SupabasePizarraOrganizacionRepository';
import { retrySupabaseOperation } from '@/utils/retryWithBackoff';

/**
 * Hook para manejar los permisos de edición de la pizarra de organización.
 *
 * Por defecto:
 * - TODOS los miembros de la organización pueden VER la pizarra
 * - Solo usuarios con permiso explícito pueden EDITAR
 * - El admin de la organización siempre puede editar
 *
 * @param idOrganizacion - ID de la organización
 * @param idUsuario - ID numérico del usuario actual
 * @returns Estado de permisos y funciones para gestionarlos
 */
export const usePizarraOrganizacionPermisos = (
  idOrganizacion: string | null,
  idUsuario: number | null
) => {
  const [permiso, setPermiso] = useState<PizarraOrganizacionPermiso | null>(null);
  const [puedeEditar, setPuedeEditar] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const repository = new SupabasePizarraOrganizacionRepository();

  // Ref para evitar verificaciones duplicadas
  const lastCheckedRef = useRef<{ org: string | null, user: number | null }>({ org: null, user: null });
  const isCheckingRef = useRef<boolean>(false);

  /**
   * Verifica si el usuario puede editar la pizarra
   */
  const checkPermiso = useCallback(async () => {
    if (!idOrganizacion || !idUsuario) {
      // console.log('🔐 [usePermisos] Faltan datos: org o usuario');
      setLoading(false);
      setPuedeEditar(false);
      return;
    }

    // Evitar verificaciones duplicadas si ya se está verificando o si los IDs no han cambiado
    if (isCheckingRef.current) {
      return;
    }

    if (lastCheckedRef.current.org === idOrganizacion && lastCheckedRef.current.user === idUsuario) {
      setLoading(false);
      return; // Ya verificamos estos IDs, no hace falta volver a hacerlo
    }

    try {
      isCheckingRef.current = true;
      // console.log('🔐 [usePermisos] Verificando permisos para usuario:', idUsuario);
      setLoading(true);
      setError(null);

      // Verificar si puede editar (incluye check de admin)
      const canEdit = await retrySupabaseOperation(
        () => repository.puedeEditar(idOrganizacion, idUsuario),
        'Verificar permisos de edición'
      );

      // console.log('🔐 [usePermisos] Resultado:', canEdit ? 'Puede editar' : 'Solo lectura');
      setPuedeEditar(canEdit);

      // Obtener datos completos del permiso si existe
      const permisoData = await repository.getPermiso(idOrganizacion, idUsuario);
      setPermiso(permisoData);

      // Marcar como verificado
      lastCheckedRef.current = { org: idOrganizacion, user: idUsuario };

    } catch (err) {
      console.error('❌ [usePermisos] Error verificando permisos:', err);
      setError('Error al verificar permisos');
      setPuedeEditar(false);
    } finally {
      setLoading(false);
      isCheckingRef.current = false;
    }
  }, [idOrganizacion, idUsuario]);

  /**
   * Otorga permiso de edición a un usuario
   * (Solo puede ser llamado por el admin de la organización)
   */
  const otorgarPermiso = useCallback(async (
    idUsuarioTarget: number,
    otorgadoPor: number
  ) => {
    if (!idOrganizacion) {
      console.error('❌ [usePermisos] No hay ID de organización');
      return false;
    }

    try {
      // console.log('🔐 [usePermisos] Otorgando permiso a usuario:', idUsuarioTarget);

      const permisoCreado = await retrySupabaseOperation(
        () => repository.setPermiso(
          idOrganizacion,
          idUsuarioTarget,
          true, // puede_editar = true
          otorgadoPor
        ),
        'Otorgar permiso de edición'
      );

      if (permisoCreado) {
        console.log('✅ [usePermisos] Permiso otorgado');
        return true;
      }

      return false;
    } catch (err) {
      console.error('❌ [usePermisos] Error otorgando permiso:', err);
      return false;
    }
  }, [idOrganizacion]);

  /**
   * Revoca el permiso de edición de un usuario
   * (Solo puede ser llamado por el admin de la organización)
   */
  const revocarPermiso = useCallback(async (idUsuarioTarget: number) => {
    if (!idOrganizacion) {
      console.error('❌ [usePermisos] No hay ID de organización');
      return false;
    }

    try {
      // console.log('🔐 [usePermisos] Revocando permiso de usuario:', idUsuarioTarget);

      const success = await retrySupabaseOperation(
        () => repository.revocarPermiso(idOrganizacion, idUsuarioTarget),
        'Revocar permiso de edición'
      );

      if (success) {
        console.log('✅ [usePermisos] Permiso revocado');
        return true;
      }

      return false;
    } catch (err) {
      console.error('❌ [usePermisos] Error revocando permiso:', err);
      return false;
    }
  }, [idOrganizacion]);

  /**
   * Obtiene todos los permisos de la organización
   * (Solo para admins)
   */
  const getPermisos = useCallback(async () => {
    if (!idOrganizacion) {
      console.error('❌ [usePermisos] No hay ID de organización');
      return [];
    }

    try {
      const permisos = await retrySupabaseOperation(
        () => repository.getPermisosByOrganizacion(idOrganizacion),
        'Obtener permisos de organización'
      );

      return permisos;
    } catch (err) {
      console.error('❌ [usePermisos] Error obteniendo permisos:', err);
      return [];
    }
  }, [idOrganizacion]);

  /**
   * Obtiene usuarios con permiso de edición
   * (Solo para admins)
   */
  const getEditores = useCallback(async () => {
    if (!idOrganizacion) {
      console.error('❌ [usePermisos] No hay ID de organización');
      return [];
    }

    try {
      const editores = await retrySupabaseOperation(
        () => repository.getUsuariosConPermisoEdicion(idOrganizacion),
        'Obtener editores'
      );

      return editores;
    } catch (err) {
      console.error('❌ [usePermisos] Error obteniendo editores:', err);
      return [];
    }
  }, [idOrganizacion]);

  /**
   * Refresca el estado de permisos
   */
  const refetch = useCallback(async () => {
    // Limpiar el cache para forzar una nueva verificación
    lastCheckedRef.current = { org: null, user: null };
    await checkPermiso();
  }, [checkPermiso]);

  // Verificar permisos al montar o cuando cambien los IDs
  useEffect(() => {
    checkPermiso();
  }, [checkPermiso]);

  return {
    permiso,
    puedeEditar,
    loading,
    error,
    otorgarPermiso,
    revocarPermiso,
    getPermisos,
    getEditores,
    refetch
  };
};
