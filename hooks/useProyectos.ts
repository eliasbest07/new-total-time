import { useState, useEffect, useCallback } from 'react';
import { Proyecto } from '@/domain/entities/Proyecto';
import { SupabaseProyectoRepository } from '@/infrastructure/datasource/SupabaseProyectoRepository';

export const useProyectos = (userId: string | null) => {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const proyectoRepository = new SupabaseProyectoRepository();

  const loadProyectos = useCallback(async () => {
    console.log('📁 useProyectos - loadProyectos llamado con userId:', userId);
    
    if (!userId) {
      console.log('📁 useProyectos - No hay userId, limpiando proyectos');
      setProyectos([]);
      setLoading(false);
      return;
    }

    try {
      console.log('📁 useProyectos - Iniciando carga de proyectos para usuario:', userId);
      setLoading(true);
      setError(null);
      const proyectosData = await proyectoRepository.getProyectosByUsuario(userId);
      console.log('📁 useProyectos - Proyectos obtenidos:', proyectosData);
      setProyectos(proyectosData);
    } catch (err) {
      console.error('📁 useProyectos - Error cargando proyectos:', err);
      setError('Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createProyecto = async (proyectoData: Omit<Proyecto, 'id' | 'created_at'>) => {
    try {
      const nuevoProyecto = await proyectoRepository.createProyecto(proyectoData);
      if (nuevoProyecto) {
        // Recargar la lista después de crear
        await loadProyectos();
        return nuevoProyecto;
      }
      throw new Error('No se pudo crear el proyecto');
    } catch (err) {
      console.error('Error creando proyecto:', err);
      setError('Error al crear proyecto');
      throw err;
    }
  };

  const updateProyecto = async (id: number, proyectoData: Partial<Proyecto>) => {
    try {
      const proyectoActualizado = await proyectoRepository.updateProyecto(id, proyectoData);
      if (proyectoActualizado) {
        // Recargar la lista después de actualizar
        await loadProyectos();
        return proyectoActualizado;
      }
      throw new Error('No se pudo actualizar el proyecto');
    } catch (err) {
      console.error('Error actualizando proyecto:', err);
      setError('Error al actualizar proyecto');
      throw err;
    }
  };

  const deleteProyecto = async (id: number) => {
    try {
      const success = await proyectoRepository.deleteProyecto(id);
      if (success) {
        // Recargar la lista después de eliminar
        await loadProyectos();
        return true;
      }
      throw new Error('No se pudo eliminar el proyecto');
    } catch (err) {
      console.error('Error eliminando proyecto:', err);
      setError('Error al eliminar proyecto');
      throw err;
    }
  };

  // Cargar proyectos cuando cambia el usuario (sin realtime)
  useEffect(() => {
    console.log('📁 useProyectos - useEffect ejecutado con userId:', userId);
    
    if (!userId) {
      console.log('📁 useProyectos - No hay usuario, limpiando proyectos');
      setProyectos([]);
      setLoading(false);
      return;
    }

    console.log('📁 useProyectos - Cargando proyectos para usuario:', userId);
    // Cargar proyectos iniciales
    loadProyectos();
  }, [userId, loadProyectos]);

  return {
    proyectos,
    loading,
    error,
    createProyecto,
    updateProyecto,
    deleteProyecto,
    refetch: loadProyectos
  };
};