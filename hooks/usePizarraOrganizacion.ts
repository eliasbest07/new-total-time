import { useState, useEffect, useCallback } from 'react';
import { PizarraOrganizacion } from '@/domain/entities/PizarraOrganizacion';
import { SupabasePizarraOrganizacionRepository } from '@/infrastructure/datasource/SupabasePizarraOrganizacionRepository';
import { retrySupabaseOperation } from '@/utils/retryWithBackoff';

/**
 * Hook para manejar la pizarra de organización.
 * La pizarra de organización persiste indefinidamente (no se renueva diariamente).
 *
 * @param idOrganizacion - ID de la organización
 * @returns Estado de la pizarra y funciones para actualizarla
 */
export const usePizarraOrganizacion = (idOrganizacion: string | null) => {
  const [pizarra, setPizarra] = useState<PizarraOrganizacion | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const repository = new SupabasePizarraOrganizacionRepository();

  /**
   * Carga la pizarra de la organización (o la crea si no existe)
   */
  const loadPizarra = useCallback(async () => {
    if (!idOrganizacion) {
      console.log('🎨 [usePizarraOrg] No hay ID de organización');
      setLoading(false);
      setPizarra(null);
      return;
    }

    try {
      console.log('🎨 [usePizarraOrg] Cargando pizarra para organización:', idOrganizacion);
      setLoading(true);
      setError(null);

      const pizarraData = await retrySupabaseOperation(
        () => repository.getPizarraByOrganizacion(idOrganizacion),
        'Cargar pizarra de organización'
      );

      if (pizarraData) {
        console.log('✅ [usePizarraOrg] Pizarra cargada:', pizarraData.id);
        setPizarra(pizarraData);
      } else {
        console.error('❌ [usePizarraOrg] No se pudo cargar/crear la pizarra');
        setError('No se pudo cargar la pizarra de la organización');
      }
    } catch (err) {
      console.error('❌ [usePizarraOrg] Error cargando pizarra:', err);
      setError('Error al cargar la pizarra de la organización');
    } finally {
      setLoading(false);
    }
  }, [idOrganizacion]);

  /**
   * Actualiza el pan offset y zoom de la pizarra
   */
  const updatePanOffset = useCallback(async (
    panOffsetX: number,
    panOffsetY: number,
    zoomLevel?: number
  ) => {
    if (!pizarra) {
      console.error('❌ [usePizarraOrg] No hay pizarra cargada');
      return;
    }

    try {
      const updatedPizarra = await repository.updatePanOffset(
        pizarra.id,
        panOffsetX,
        panOffsetY,
        zoomLevel
      );

      if (updatedPizarra) {
        setPizarra(updatedPizarra);
      }
    } catch (err) {
      console.error('❌ [usePizarraOrg] Error actualizando pan offset:', err);
    }
  }, [pizarra]);

  /**
   * Refresca la pizarra desde la base de datos
   */
  const refetch = useCallback(async () => {
    await loadPizarra();
  }, [loadPizarra]);

  // Cargar pizarra al montar o cuando cambie el ID de organización
  useEffect(() => {
    loadPizarra();
  }, [loadPizarra]);

  return {
    pizarra,
    loading,
    error,
    updatePanOffset,
    refetch
  };
};
