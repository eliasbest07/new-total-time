import { useState, useEffect, useCallback } from 'react';
import { Recurso } from '@/domain/entities/Recurso';
import { SupabaseRecursoRepository } from '@/infrastructure/datasource/SupabaseRecursoRepository';

export const useRecursos = (idUsuario: string | null) => {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recursoRepository = new SupabaseRecursoRepository();

  const loadRecursos = useCallback(async () => {
    // console.log('📚 useRecursos - loadRecursos llamado con idUsuario:', idUsuario);

    if (!idUsuario) {
      // console.log('📚 useRecursos - No hay idUsuario, limpiando recursos');
      setRecursos([]);
      setLoading(false);
      return;
    }

    try {
      // console.log('📚 useRecursos - Iniciando carga de recursos para usuario:', idUsuario);
      setLoading(true);
      setError(null);
      const recursosData = await recursoRepository.getRecursosByUsuario(idUsuario);
      // console.log('📚 useRecursos - Recursos obtenidos:', recursosData);
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
        // Recargar la lista después de crear
        await loadRecursos();
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
        // Recargar la lista después de actualizar
        await loadRecursos();
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
        // Recargar la lista después de eliminar
        await loadRecursos();
        return true;
      }
      throw new Error('No se pudo eliminar el recurso');
    } catch (err) {
      console.error('Error eliminando recurso:', err);
      setError('Error al eliminar recurso');
      throw err;
    }
  };

  // Cargar recursos cuando cambia el usuario (sin realtime)
  useEffect(() => {
    // console.log('📚 useRecursos - useEffect ejecutado con idUsuario:', idUsuario);

    if (!idUsuario) {
      // console.log('📚 useRecursos - No hay usuario, limpiando recursos');
      setRecursos([]);
      setLoading(false);
      return;
    }

    // console.log('📚 useRecursos - Cargando recursos para usuario:', idUsuario);
    // Cargar recursos iniciales
    loadRecursos();
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