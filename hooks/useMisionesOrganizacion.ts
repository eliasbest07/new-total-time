import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseMisionRepository } from '@/infrastructure/datasource/SupabaseMisionRepository';
import { Mision } from '@/domain/entities/Mision';
import { Usuario } from '@/domain/entities/Usuario';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseMisionesOrganizacionReturn {
  misiones: Mision[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener las misiones de todos los usuarios de una organización
 * @param usuarios - Array de usuarios de la organización
 * @returns Objeto con las misiones, estado de carga, error y función para refrescar
 */
export const useMisionesOrganizacion = (usuarios: Usuario[]): UseMisionesOrganizacionReturn => {
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const misionRepository = useRef(new SupabaseMisionRepository());
  const realtimeChannel = useRef<RealtimeChannel | null>(null);

  // Obtener IDs de usuarios
  const idsUsuarios = usuarios
    .map(u => parseInt(u.id))
    .filter(id => !isNaN(id));

  // Función para cargar misiones
  const loadMisiones = useCallback(async () => {
    if (idsUsuarios.length === 0) {
      setMisiones([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🎯 [useMisionesOrganizacion] Cargando misiones para', idsUsuarios.length, 'usuarios');
      const misionesData = await misionRepository.current.getMisionesByUsuarios(idsUsuarios);
      setMisiones(misionesData);
      console.log('✅ [useMisionesOrganizacion] Misiones cargadas:', misionesData.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar misiones';
      console.error('❌ [useMisionesOrganizacion] Error cargando misiones:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [idsUsuarios.join(',')]); // Usar join para comparar arrays

  // Configurar suscripción en tiempo real
  useEffect(() => {
    if (idsUsuarios.length === 0) {
      setMisiones([]);
      return;
    }

    console.log('📡 [useMisionesOrganizacion] Configurando suscripción realtime para misiones de organización');

    // Callbacks para el realtime
    const realtimeCallbacks = {
      onMisionesUpdated: (nuevasMisiones: Mision[]) => {
        console.log('📡 [useMisionesOrganizacion] Misiones actualizadas via realtime:', nuevasMisiones.length);
        setMisiones(nuevasMisiones);
      },
      onError: (errorMessage: string) => {
        console.error('❌ [useMisionesOrganizacion] Error en realtime:', errorMessage);
        setError(errorMessage);
      }
    };

    // Suscribirse a cambios de misiones de todos los usuarios
    realtimeChannel.current = misionRepository.current.subscribeToMisionesChangesByUsuarios(
      idsUsuarios,
      realtimeCallbacks
    );

    // Cleanup al desmontar o cambiar usuarios
    return () => {
      if (realtimeChannel.current) {
        console.log('🧹 [useMisionesOrganizacion] Limpiando suscripción realtime');
        misionRepository.current.unsubscribeFromChanges(realtimeChannel.current);
        realtimeChannel.current = null;
      }
    };
  }, [idsUsuarios.join(',')]); // Reaccionar cuando cambien los usuarios

  // Cargar misiones inicialmente
  useEffect(() => {
    loadMisiones();
  }, [loadMisiones]);

  return {
    misiones,
    loading,
    error,
    refetch: loadMisiones
  };
};
