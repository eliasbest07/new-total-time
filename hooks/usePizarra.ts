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
      setPizarra(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 [usePizarra] Cargando pizarra para ID:', idUsuario);

      // Primero intentar cargar como pizarra de usuario (por fecha)
      const hoy = new Date();
      let pizarraData = await pizarraRepository.current.getPizarraDelDia(idUsuario, hoy);

      // Si no encontró por id_usuario, intentar buscar por id_organizacion
      if (!pizarraData) {
        console.log('🏢 [usePizarra] No encontrada como usuario, buscando como organización...');
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');

        const { data, error } = await supabase
          .from('pizarras')
          .select('*')
          .eq('id_organizacion', idUsuario)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('❌ [usePizarra] Error buscando por id_organizacion:', error);
        } else if (data) {
          console.log('✅ [usePizarra] Pizarra de organización encontrada:', data.id);
          pizarraData = data;
        } else {
          // No existe, crear pizarra de organización
          console.log('📝 [usePizarra] Creando pizarra de organización...');
          const { data: newData, error: createError } = await supabase
            .from('pizarras')
            .insert({
              id_usuario: 'f14a1ce3-ee6c-493c-a1df-fb31ba82c3d4', // ID fijo
              id_organizacion: idUsuario,
              pan_offset_x: 0,
              pan_offset_y: 0
            })
            .select()
            .single();

          if (createError) {
            console.error('❌ [usePizarra] Error creando pizarra:', createError);
          } else if (newData) {
            console.log('✅ [usePizarra] Pizarra de organización creada:', newData.id);
            pizarraData = newData;
          }
        }
      }

      if (pizarraData) {
        setPizarra(pizarraData);
        const tipo = pizarraData.id_organizacion ? 'ORGANIZACIÓN' : 'USUARIO';
        console.log(`✅ [usePizarra] Pizarra ${tipo} cargada:`, pizarraData.id);
      } else {
        console.error('❌ [usePizarra] No se pudo cargar o crear la pizarra');
        setError('No se pudo cargar o crear la pizarra');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar pizarra';
      console.error('❌ [usePizarra] Error:', errorMessage);
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
