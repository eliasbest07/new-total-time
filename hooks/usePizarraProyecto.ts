import { useState, useEffect, useCallback } from 'react';
import { PizarraOrganizacion } from '@/domain/entities/PizarraOrganizacion';
import { SupabasePizarraOrganizacionRepository } from '@/infrastructure/datasource/SupabasePizarraOrganizacionRepository';
import { retrySupabaseOperation } from '@/utils/retryWithBackoff';

/**
 * Hook para manejar la pizarra de un proyecto específico.
 * Usa la misma tabla `pizarras` filtrando por id_proyecto.
 */
export const usePizarraProyecto = (
  idOrganizacion: string | null,
  idProyecto: number | null
) => {
  const [pizarra, setPizarra] = useState<PizarraOrganizacion | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const repository = new SupabasePizarraOrganizacionRepository();

  const loadPizarra = useCallback(async () => {
    if (!idOrganizacion || !idProyecto) {
      setLoading(false);
      setPizarra(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const pizarraData = await retrySupabaseOperation(
        () => repository.getPizarraByProyecto(idOrganizacion, idProyecto),
        'Cargar pizarra de proyecto'
      );

      if (pizarraData) {
        setPizarra(pizarraData);
      } else {
        setError('No se pudo cargar la pizarra del proyecto');
      }
    } catch (err) {
      setError('Error al cargar la pizarra del proyecto');
    } finally {
      setLoading(false);
    }
  }, [idOrganizacion, idProyecto]);

  const updatePanOffset = useCallback(async (
    panOffsetX: number,
    panOffsetY: number,
    zoomLevel?: number
  ) => {
    if (!pizarra) return;
    try {
      const updated = await repository.updatePanOffset(pizarra.id, panOffsetX, panOffsetY, zoomLevel);
      if (updated) setPizarra(updated);
    } catch (err) {
      console.error('❌ [usePizarraProyecto] Error actualizando pan offset:', err);
    }
  }, [pizarra]);

  useEffect(() => {
    loadPizarra();
  }, [loadPizarra]);

  return { pizarra, loading, error, updatePanOffset, refetch: loadPizarra };
};
