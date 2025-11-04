import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseActividadRepository } from '@/infrastructure/datasource/SupabaseActividadRepository';
import { Actividad } from '@/domain/entities/Actividad';
import { Usuario } from '@/domain/entities/Usuario';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseActividadesOrganizacionReturn {
  actividades: Actividad[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener las actividades de todos los usuarios de una organización
 * @param usuarios - Array de usuarios de la organización
 * @returns Objeto con las actividades, estado de carga, error y función para refrescar
 */
export const useActividadesOrganizacion = (usuarios: Usuario[]): UseActividadesOrganizacionReturn => {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actividadRepository = useRef(new SupabaseActividadRepository());
  const realtimeChannel = useRef<RealtimeChannel | null>(null);

  // Obtener IDs de usuarios (userAuth que es string)
  const idsUsuarios = usuarios
    .map(u => u.userAuth)
    .filter(id => id != null);

  // Función para cargar actividades
  const loadActividades = useCallback(async () => {
    if (idsUsuarios.length === 0) {
      setActividades([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📅 [useActividadesOrganizacion] Cargando actividades para', idsUsuarios.length, 'usuarios');
      const actividadesData = await actividadRepository.current.getActividadesByUsuarios(idsUsuarios);
      setActividades(actividadesData);
      console.log('✅ [useActividadesOrganizacion] Actividades cargadas:', actividadesData.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar actividades';
      console.error('❌ [useActividadesOrganizacion] Error cargando actividades:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [idsUsuarios.join(',')]); // Usar join para comparar arrays

  // Configurar suscripción en tiempo real
  useEffect(() => {
    if (idsUsuarios.length === 0) {
      setActividades([]);
      return;
    }

    console.log('📡 [useActividadesOrganizacion] Configurando suscripción realtime para actividades de organización');

    // Callbacks para el realtime
    const realtimeCallbacks = {
      onActividadesUpdated: (nuevasActividades: Actividad[]) => {
        console.log('📡 [useActividadesOrganizacion] Actividades actualizadas via realtime:', nuevasActividades.length);
        setActividades(nuevasActividades);
      },
      onError: (errorMessage: string) => {
        console.error('❌ [useActividadesOrganizacion] Error en realtime:', errorMessage);
        setError(errorMessage);
      }
    };

    // Suscribirse a cambios de actividades de todos los usuarios
    realtimeChannel.current = actividadRepository.current.subscribeToActividadesChangesByUsuarios(
      idsUsuarios,
      realtimeCallbacks
    );

    // Cleanup al desmontar o cambiar usuarios
    return () => {
      if (realtimeChannel.current) {
        console.log('🧹 [useActividadesOrganizacion] Limpiando suscripción realtime');
        actividadRepository.current.unsubscribeFromChanges(realtimeChannel.current);
        realtimeChannel.current = null;
      }
    };
  }, [idsUsuarios.join(',')]); // Reaccionar cuando cambien los usuarios

  // Cargar actividades inicialmente
  useEffect(() => {
    loadActividades();
  }, [loadActividades]);

  return {
    actividades,
    loading,
    error,
    refetch: loadActividades
  };
};
