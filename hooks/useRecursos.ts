import { useState, useEffect, useCallback } from 'react';
import { Recurso } from '@/domain/entities/Recurso';
import { SupabaseRecursoRepository } from '@/infrastructure/datasource/SupabaseRecursoRepository';
import { RealtimeChannel } from '@supabase/supabase-js';

export const useRecursos = (idUsuario: string | null) => {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  const recursoRepository = new SupabaseRecursoRepository();

  const loadRecursos = useCallback(async () => {
    console.log('📚 useRecursos - loadRecursos llamado con idUsuario:', idUsuario);
    
    if (!idUsuario) {
      console.log('📚 useRecursos - No hay idUsuario, limpiando recursos');
      setRecursos([]);
      setLoading(false);
      return;
    }

    try {
      console.log('📚 useRecursos - Iniciando carga de recursos para usuario:', idUsuario);
      setLoading(true);
      setError(null);
      const recursosData = await recursoRepository.getRecursosByUsuario(idUsuario);
      console.log('📚 useRecursos - Recursos obtenidos:', recursosData);
      setRecursos(recursosData);
    } catch (err) {
      console.error('📚 useRecursos - Error cargando recursos:', err);
      setError('Error al cargar recursos');
    } finally {
      setLoading(false);
    }
  }, [idUsuario]);

  const createRecurso = async (recursoData: Omit<Recurso, 'id' | 'created_at'>) => {
    try {
      const nuevoRecurso = await recursoRepository.createRecurso(recursoData);
      if (nuevoRecurso) {
        // El realtime se encargará de actualizar la lista
        return nuevoRecurso;
      }
      throw new Error('No se pudo crear el recurso');
    } catch (err) {
      console.error('Error creando recurso:', err);
      setError('Error al crear recurso');
      throw err;
    }
  };

  const updateRecurso = async (id: number, recursoData: Partial<Recurso>) => {
    try {
      const recursoActualizado = await recursoRepository.updateRecurso(id, recursoData);
      if (recursoActualizado) {
        // El realtime se encargará de actualizar la lista
        return recursoActualizado;
      }
      throw new Error('No se pudo actualizar el recurso');
    } catch (err) {
      console.error('Error actualizando recurso:', err);
      setError('Error al actualizar recurso');
      throw err;
    }
  };

  const deleteRecurso = async (id: number) => {
    try {
      const success = await recursoRepository.deleteRecurso(id);
      if (success) {
        // El realtime se encargará de actualizar la lista
        return true;
      }
      throw new Error('No se pudo eliminar el recurso');
    } catch (err) {
      console.error('Error eliminando recurso:', err);
      setError('Error al eliminar recurso');
      throw err;
    }
  };

  // Configurar realtime cuando cambia el usuario
  useEffect(() => {
    console.log('📚 useRecursos - useEffect ejecutado con idUsuario:', idUsuario);
    
    if (!idUsuario) {
      console.log('📚 useRecursos - No hay usuario, limpiando suscripción');
      // Limpiar suscripción si no hay usuario
      if (realtimeChannel) {
        recursoRepository.unsubscribeFromChanges(realtimeChannel);
        setRealtimeChannel(null);
      }
      return;
    }

    console.log('📚 useRecursos - Configurando para usuario:', idUsuario);

    // Cargar recursos iniciales
    loadRecursos();

    // Configurar suscripción realtime
    const channel = recursoRepository.subscribeToRecursosChanges(idUsuario, {
      onRecursosUpdated: (nuevosRecursos) => {
        console.log('📡 Recursos actualizados via realtime:', nuevosRecursos.length);
        setRecursos(nuevosRecursos);
        setError(null);
      },
      onError: (errorMsg) => {
        console.error('📡 Error en realtime recursos:', errorMsg);
        setError(errorMsg);
      }
    });

    setRealtimeChannel(channel);

    // Cleanup al desmontar o cambiar usuario
    return () => {
      if (channel) {
        recursoRepository.unsubscribeFromChanges(channel);
      }
    };
  }, [idUsuario, loadRecursos]);

  return {
    recursos,
    loading,
    error,
    createRecurso,
    updateRecurso,
    deleteRecurso,
    refetch: loadRecursos
  };
};