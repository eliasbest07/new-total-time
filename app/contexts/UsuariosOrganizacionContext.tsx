'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Usuario } from '@/domain/entities/Usuario';
import { SupabaseUsuarioRepository } from '@/infrastructure/datasource/SupabaseUsuarioRepository';
import { useAuth } from './AuthContext';

interface UsuariosOrganizacionContextType {
  usuarios: Usuario[];
  usuariosFiltrados: Usuario[]; // Usuarios excluyendo al usuario actual
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const UsuariosOrganizacionContext = createContext<UsuariosOrganizacionContextType | undefined>(undefined);

export function UsuariosOrganizacionProvider({ children }: { children: ReactNode }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { usuario } = useAuth();

  const usuarioRepository = new SupabaseUsuarioRepository();

  const loadUsuarios = useCallback(async () => {
    const organizacionId = usuario?.idOrganizacion;

    if (!organizacionId) {
      setUsuarios([]);
      setLoading(false);
      return;
    }

    try {
      console.log('👥 [UsuariosContext] Cargando usuarios para organización:', organizacionId);
      setLoading(true);
      setError(null);
      const usuariosData = await usuarioRepository.getUsuariosByOrganizacion(organizacionId);
      console.log('👥 [UsuariosContext] Usuarios cargados:', usuariosData.length);
      setUsuarios(usuariosData);
    } catch (err) {
      console.error('👥 [UsuariosContext] Error cargando usuarios:', err);
      setError('Error al cargar usuarios de la organización');
    } finally {
      setLoading(false);
    }
  }, [usuario?.idOrganizacion]);

  // Cargar usuarios cuando cambia la organización
  useEffect(() => {
    if (!usuario?.idOrganizacion) {
      setUsuarios([]);
      setLoading(false);
      return;
    }

    loadUsuarios();
  }, [usuario?.idOrganizacion, loadUsuarios]);

  // Filtrar usuarios excluyendo al usuario actual (por email)
  const usuariosFiltrados = usuarios.filter(u => u.email !== usuario?.email);

  const value: UsuariosOrganizacionContextType = {
    usuarios,
    usuariosFiltrados,
    loading,
    error,
    refetch: loadUsuarios
  };

  return (
    <UsuariosOrganizacionContext.Provider value={value}>
      {children}
    </UsuariosOrganizacionContext.Provider>
  );
}

export function useUsuariosOrganizacionContext() {
  const context = useContext(UsuariosOrganizacionContext);
  if (context === undefined) {
    throw new Error('useUsuariosOrganizacionContext debe usarse dentro de un UsuariosOrganizacionProvider');
  }
  return context;
}
