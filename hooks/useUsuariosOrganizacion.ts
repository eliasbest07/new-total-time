import { useState, useEffect, useCallback } from 'react';
import { Usuario } from '@/domain/entities/Usuario';
import { SupabaseUsuarioRepository } from '@/infrastructure/datasource/SupabaseUsuarioRepository';

export const useUsuariosOrganizacion = (organizacionId: string | null) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const usuarioRepository = new SupabaseUsuarioRepository();

  const loadUsuarios = useCallback(async () => {
    console.log('👥 useUsuariosOrganizacion - loadUsuarios llamado con organizacionId:', organizacionId);
    
    if (!organizacionId) {
      console.log('👥 useUsuariosOrganizacion - No hay organizacionId, limpiando usuarios');
      setUsuarios([]);
      setLoading(false);
      return;
    }

    try {
      console.log('👥 useUsuariosOrganizacion - Iniciando carga de usuarios para organización:', organizacionId);
      setLoading(true);
      setError(null);
      const usuariosData = await usuarioRepository.getUsuariosByOrganizacion(organizacionId);
      console.log('👥 useUsuariosOrganizacion - Usuarios obtenidos:', usuariosData);
      setUsuarios(usuariosData);
    } catch (err) {
      console.error('👥 useUsuariosOrganizacion - Error cargando usuarios:', err);
      setError('Error al cargar usuarios de la organización');
    } finally {
      setLoading(false);
    }
  }, [organizacionId]);

  // Cargar usuarios cuando cambia la organización
  useEffect(() => {
    console.log('👥 useUsuariosOrganizacion - useEffect ejecutado con organizacionId:', organizacionId);
    
    if (!organizacionId) {
      console.log('👥 useUsuariosOrganizacion - No hay organización, limpiando usuarios');
      setUsuarios([]);
      setLoading(false);
      return;
    }

    console.log('👥 useUsuariosOrganizacion - Cargando usuarios para organización:', organizacionId);
    // Cargar usuarios iniciales
    loadUsuarios();
  }, [organizacionId, loadUsuarios]);

  return {
    usuarios,
    loading,
    error,
    refetch: loadUsuarios
  };
};