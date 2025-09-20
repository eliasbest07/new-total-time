import { useState, useEffect, useCallback, useRef } from 'react';
import { SalaRepository } from '@/infrastructure/repositories/SalaRepository';
import { Sala } from '@/domain/entities/Sala';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseSalasReturn {
  salas: Sala[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setSalaActiva: (salaId: number) => void;
  salaActiva: Sala | null;
}

export const useSalas = (idOrganizacion: string | null): UseSalasReturn => {
  const [salas, setSalas] = useState<Sala[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salaActiva, setSalaActivaState] = useState<Sala | null>(null);
  
  const salaRepository = useRef(new SalaRepository());
  const realtimeChannel = useRef<RealtimeChannel | null>(null);
  const isInitialLoad = useRef(true);

  // Función para cargar salas
  const loadSalas = useCallback(async (showLoading = true) => {
    if (!idOrganizacion) {
      setSalas([]);
      setSalaActivaState(null);
      return;
    }

    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      console.log('🏠 Cargando salas para organización:', idOrganizacion);
      const salasData = await salaRepository.current.getSalasByOrganizacion(idOrganizacion);
      
      setSalas(salasData);
      
      // Establecer la primera sala como activa si no hay ninguna activa
      if (salasData.length > 0 && !salaActiva) {
        const primeraActiva = salasData.find(sala => sala.activa) || salasData[0];
        setSalaActivaState(primeraActiva);
      }
      
      console.log('✅ Salas cargadas exitosamente:', salasData.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar salas';
      console.error('❌ Error cargando salas:', errorMessage);
      setError(errorMessage);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [idOrganizacion, salaActiva]);

  // Función para establecer sala activa
  const setSalaActiva = useCallback((salaId: number) => {
    const sala = salas.find(s => s.id === salaId);
    if (sala) {
      // Actualizar el estado de las salas
      const salasActualizadas = salas.map(s => ({
        ...s,
        activa: s.id === salaId
      }));
      
      setSalas(salasActualizadas);
      setSalaActivaState(sala);
      
      console.log('🎯 Sala activa cambiada a:', sala.nombre);
    }
  }, [salas]);

  // Configurar suscripción en tiempo real
  useEffect(() => {
    if (!idOrganizacion) return;

    console.log('📡 Configurando suscripción realtime para salas');

    // Callbacks para el realtime
    const realtimeCallbacks = {
      onSalasUpdated: (nuevasSalas: Sala[]) => {
        console.log('📡 Salas actualizadas via realtime:', nuevasSalas.length);
        setSalas(nuevasSalas);
        
        // Mantener la sala activa si aún existe
        if (salaActiva) {
          const salaActivaActualizada = nuevasSalas.find(s => s.id === salaActiva.id);
          if (salaActivaActualizada) {
            setSalaActivaState(salaActivaActualizada);
          } else if (nuevasSalas.length > 0) {
            // Si la sala activa ya no existe, seleccionar la primera
            setSalaActivaState(nuevasSalas[0]);
          }
        }
      },
      onError: (errorMessage: string) => {
        console.error('❌ Error en realtime de salas:', errorMessage);
        setError(errorMessage);
      }
    };

    // Suscribirse a cambios
    realtimeChannel.current = salaRepository.current.subscribeToOrganizacionChanges(
      idOrganizacion,
      realtimeCallbacks
    );

    // Cleanup al desmontar o cambiar organización
    return () => {
      if (realtimeChannel.current) {
        console.log('🧹 Limpiando suscripción realtime de salas');
        salaRepository.current.unsubscribeFromChanges(realtimeChannel.current);
        realtimeChannel.current = null;
      }
    };
  }, [idOrganizacion, salaActiva]);

  // Cargar salas inicialmente
  useEffect(() => {
    if (isInitialLoad.current) {
      loadSalas(true); // Mostrar loading solo en carga inicial
      isInitialLoad.current = false;
    } else {
      loadSalas(false); // No mostrar loading en cambios de organización
    }
  }, [loadSalas]);

  return {
    salas,
    loading,
    error,
    refetch: () => loadSalas(true),
    setSalaActiva,
    salaActiva
  };
};