import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseMisionRepository } from '@/infrastructure/datasource/SupabaseMisionRepository';
import { Mision } from '@/domain/entities/Mision';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseMisionesOptions {
  enableRealtime?: boolean;
}

interface UseMisionesReturn {
  misiones: Mision[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createMision: (mision: Omit<Mision, 'id' | 'created_at'>) => Promise<Mision | null>;
  updateMision: (id: number, mision: Partial<Mision>) => Promise<Mision | null>;
  deleteMision: (id: number) => Promise<boolean>;
}

export const useMisiones = (idUsuario: number | null, options: UseMisionesOptions = {}): UseMisionesReturn => {
  const { enableRealtime = true } = options;
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const misionRepository = useRef(new SupabaseMisionRepository());
  const realtimeChannel = useRef<RealtimeChannel | null>(null);

  // Función para cargar misiones
  const loadMisiones = useCallback(async () => {
    // Por ahora cargar todas las misiones si no hay usuario específico
    if (!idUsuario) {
      // console.log('⚠️ Sin ID de usuario, cargando todas las misiones');
    }

    setLoading(true);
    setError(null);

    try {
      let misionesData: Mision[];

      if (idUsuario) {
        // console.log('🎯 Cargando misiones para usuario:', idUsuario);
        misionesData = await misionRepository.current.getMisionesByUsuario(idUsuario);
      } else {
        // console.log('🎯 Cargando todas las misiones');
        misionesData = await (misionRepository.current as any).getAllMisiones();
      }

      setMisiones(misionesData);
      // console.log('✅ Misiones cargadas exitosamente:', misionesData.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar misiones';
      console.error('❌ Error cargando misiones:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [idUsuario]);

  // Función para crear misión
  const createMision = useCallback(async (mision: Omit<Mision, 'id' | 'created_at'>) => {
    try {
      const nuevaMision = await misionRepository.current.createMision(mision);
      if (nuevaMision) {
        // La actualización se manejará via realtime
        // console.log('✅ Misión creada:', nuevaMision);
      }
      return nuevaMision;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creando misión';
      console.error('❌ Error creando misión:', errorMessage);
      setError(errorMessage);
      return null;
    }
  }, []);

  // Función para actualizar misión
  const updateMision = useCallback(async (id: number, mision: Partial<Mision>) => {
    try {
      const misionActualizada = await misionRepository.current.updateMision(id, mision);
      if (misionActualizada) {
        // La actualización se manejará via realtime
        // console.log('✅ Misión actualizada:', misionActualizada);
      }
      return misionActualizada;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando misión';
      console.error('❌ Error actualizando misión:', errorMessage);
      setError(errorMessage);
      return null;
    }
  }, []);

  // Función para eliminar misión
  const deleteMision = useCallback(async (id: number) => {
    try {
      const eliminada = await misionRepository.current.deleteMision(id);
      if (eliminada) {
        // La actualización se manejará via realtime
        // console.log('✅ Misión eliminada:', id);
      }
      return eliminada;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error eliminando misión';
      console.error('❌ Error eliminando misión:', errorMessage);
      setError(errorMessage);
      return false;
    }
  }, []);

  // Configurar suscripción en tiempo real (solo si enableRealtime es true)
  useEffect(() => {
    if (!enableRealtime) {
      return;
    }

    // console.log('📡 Configurando suscripción realtime para misiones');

    // Callbacks para el realtime
    const realtimeCallbacks = {
      onMisionesUpdated: (nuevasMisiones: Mision[]) => {
        console.log('📡 [useMisiones] Actualizado:', nuevasMisiones.length);
        setMisiones(nuevasMisiones);
      },
      onError: (errorMessage: string) => {
        console.error('❌ Error en realtime de misiones:', errorMessage);
        setError(errorMessage);
      }
    };

    // Suscribirse a cambios
    if (idUsuario) {
      realtimeChannel.current = misionRepository.current.subscribeToMisionesChanges(
        idUsuario,
        realtimeCallbacks
      );
    } else {
      // Suscripción general a todas las misiones
      realtimeChannel.current = (misionRepository.current as any).subscribeToAllMisionesChanges(realtimeCallbacks);
    }

    // Cleanup al desmontar o cambiar usuario
    return () => {
      if (realtimeChannel.current) {
        // console.log('🧹 Limpiando suscripción realtime de misiones');
        misionRepository.current.unsubscribeFromChanges(realtimeChannel.current);
        realtimeChannel.current = null;
      }
    };
  }, [idUsuario, enableRealtime]); // Reaccionar cuando cambie el ID del usuario o enableRealtime

  // Cargar misiones inicialmente
  useEffect(() => {
    loadMisiones();
  }, [loadMisiones]);

  return {
    misiones,
    loading,
    error,
    refetch: loadMisiones,
    createMision,
    updateMision,
    deleteMision
  };
};