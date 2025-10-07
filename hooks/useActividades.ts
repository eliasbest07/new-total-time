import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseActividadRepository } from '@/infrastructure/datasource/SupabaseActividadRepository';
import { Actividad } from '@/domain/entities/Actividad';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseActividadesReturn {
  actividades: Actividad[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createActividad: (actividad: Omit<Actividad, 'id' | 'created_at'>) => Promise<Actividad | null>;
  updateActividad: (id: number, actividad: Partial<Actividad>) => Promise<Actividad | null>;
  deleteActividad: (id: number) => Promise<boolean>;
}

export const useActividades = (idUsuario: string | null): UseActividadesReturn => {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actividadRepository = useRef(new SupabaseActividadRepository());
  const realtimeChannel = useRef<RealtimeChannel | null>(null);

  // Función para cargar actividades
  const loadActividades = useCallback(async () => {
    if (!idUsuario) {
      setActividades([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📅 Cargando actividades para usuario:', idUsuario);
      const actividadesData = await actividadRepository.current.getActividadesByUsuario(idUsuario);

      setActividades(actividadesData);
      console.log('✅ Actividades cargadas exitosamente:', actividadesData.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar actividades';
      console.error('❌ Error cargando actividades:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [idUsuario]);

  // Función para crear actividad
  const createActividad = useCallback(async (actividad: Omit<Actividad, 'id' | 'created_at'>) => {
    try {
      const nuevaActividad = await actividadRepository.current.createActividad(actividad);
      if (nuevaActividad) {
        // La actualización se manejará via realtime
        console.log('✅ Actividad creada:', nuevaActividad);
      }
      return nuevaActividad;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creando actividad';
      console.error('❌ Error creando actividad:', errorMessage);
      setError(errorMessage);
      return null;
    }
  }, []);

  // Función para actualizar actividad
  const updateActividad = useCallback(async (id: number, actividad: Partial<Actividad>) => {
    try {
      const actividadActualizada = await actividadRepository.current.updateActividad(id, actividad);
      if (actividadActualizada) {
        // La actualización se manejará via realtime
        console.log('✅ Actividad actualizada:', actividadActualizada);
      }
      return actividadActualizada;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando actividad';
      console.error('❌ Error actualizando actividad:', errorMessage);
      setError(errorMessage);
      return null;
    }
  }, []);

  // Función para eliminar actividad
  const deleteActividad = useCallback(async (id: number) => {
    try {
      const eliminada = await actividadRepository.current.deleteActividad(id);
      if (eliminada) {
        // La actualización se manejará via realtime
        console.log('✅ Actividad eliminada:', id);
      }
      return eliminada;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error eliminando actividad';
      console.error('❌ Error eliminando actividad:', errorMessage);
      setError(errorMessage);
      return false;
    }
  }, []);

  // Configurar suscripción en tiempo real
  useEffect(() => {
    if (!idUsuario) return;

    console.log('📡 Configurando suscripción realtime para actividades');

    // Callbacks para el realtime
    const realtimeCallbacks = {
      onActividadesUpdated: (nuevasActividades: Actividad[]) => {
        console.log('📡 Actividades actualizadas via realtime:', nuevasActividades.length);
        setActividades(nuevasActividades);
      },
      onError: (errorMessage: string) => {
        console.error('❌ Error en realtime de actividades:', errorMessage);
        setError(errorMessage);
      }
    };

    // Suscribirse a cambios
    realtimeChannel.current = actividadRepository.current.subscribeToActividadesChanges(
      idUsuario,
      realtimeCallbacks
    );

    // Cleanup al desmontar o cambiar usuario
    return () => {
      if (realtimeChannel.current) {
        console.log('🧹 Limpiando suscripción realtime de actividades');
        actividadRepository.current.unsubscribeFromChanges(realtimeChannel.current);
        realtimeChannel.current = null;
      }
    };
  }, [idUsuario]);

  // Cargar actividades inicialmente
  useEffect(() => {
    loadActividades();
  }, [loadActividades]);

  return {
    actividades,
    loading,
    error,
    refetch: loadActividades,
    createActividad,
    updateActividad,
    deleteActividad
  };
};