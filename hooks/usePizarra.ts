import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabasePizarraRepository } from '@/infrastructure/datasource/SupabasePizarraRepository';
import { Pizarra } from '@/domain/entities/Pizarra';

interface UsePizarraReturn {
  pizarra: Pizarra | null;
  loading: boolean;
  error: string | null;
  updatePanOffset: (panOffsetX: number, panOffsetY: number) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook para cargar y gestionar la pizarra del dia de un usuario.
 * Si no existe pizarra para el dia actual, la crea automaticamente.
 */
export const usePizarra = (idUsuario: string | null): UsePizarraReturn => {
  const [pizarra, setPizarra] = useState<Pizarra | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pizarraRepository = useRef(new SupabasePizarraRepository());

  // Funcion para cargar la pizarra del dia
  const loadPizarra = useCallback(async () => {
    if (!idUsuario) {
      console.log('Sin ID de usuario, no se puede cargar pizarra');
      setPizarra(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Cargando pizarra del dia para usuario:', idUsuario);
      const hoy = new Date();
      const pizarraData = await pizarraRepository.current.getPizarraDelDia(idUsuario, hoy);

      if (pizarraData) {
        setPizarra(pizarraData);
        console.log('Pizarra cargada exitosamente:', pizarraData.id);
      } else {
        setError('No se pudo cargar o crear la pizarra del dia');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar pizarra';
      console.error('Error cargando pizarra:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [idUsuario]);

  // Funcion para actualizar el pan offset
  const updatePanOffset = useCallback(async (panOffsetX: number, panOffsetY: number) => {
    if (!pizarra) {
      console.error('No hay pizarra para actualizar');
      return;
    }

    try {
      const pizarraActualizada = await pizarraRepository.current.updatePanOffset(
        pizarra.id,
        panOffsetX,
        panOffsetY
      );

      if (pizarraActualizada) {
        setPizarra(pizarraActualizada);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando pan offset';
      console.error('Error actualizando pan offset:', errorMessage);
      setError(errorMessage);
    }
  }, [pizarra]);

  // Cargar pizarra inicialmente y cada vez que cambia el usuario
  useEffect(() => {
    loadPizarra();
  }, [loadPizarra]);

  return {
    pizarra,
    loading,
    error,
    updatePanOffset,
    refetch: loadPizarra
  };
};
