'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Usuario } from '@/domain/entities/Usuario';
import { SupabaseUsuarioRepository } from '@/infrastructure/datasource/SupabaseUsuarioRepository';
import { useAuth } from './AuthContext';
import { retrySupabaseOperation } from '@/utils/retryWithBackoff';
import { userCacheService, BasicUserData } from '@/infrastructure/services/UserCacheService';

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
  const [authChecked, setAuthChecked] = useState(false);
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
      const usuariosData = await retrySupabaseOperation(
        () => usuarioRepository.getUsuariosByOrganizacion(organizacionId),
        'Cargar usuarios de organización'
      );
      console.log('👥 [UsuariosContext] Usuarios cargados:', usuariosData.length);
      setUsuarios(usuariosData);

      // ✅ Pre-cargar usuarios en el caché para optimizar consultas futuras
      const basicUserData: BasicUserData[] = usuariosData
        .filter(u => u.id) // Asegurar que tenga ID
        .map(u => ({
          id: parseInt(u.id), // ID numérico para post_sala.id_usuario
          id_usuario: u.userAuth, // UUID para otras consultas
          user_auth: u.userAuth, // UUID alternativo
          nombre: u.profile.nombre || u.profile.username || u.email || 'Usuario',
          avatar: u.profile.avatar,
          username: u.profile.username,
          correo: u.email
        }));

      // console.log('📦 [UsuariosContext] Pre-cargando', basicUserData.length, 'usuarios en caché');
      userCacheService.preloadUsers(basicUserData);
    } catch (err) {
      console.error('👥 [UsuariosContext] Error cargando usuarios:', err);
      setError('Error al cargar usuarios de la organización');
    } finally {
      setLoading(false);
    }
  }, [usuario?.idOrganizacion]);

  // Marcar que hemos verificado la autenticación
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthChecked(true);
    }, 200); // Pequeño delay para evitar llamadas simultáneas
    
    return () => clearTimeout(timer);
  }, []);

  // Cargar usuarios cuando la autenticación esté verificada
  useEffect(() => {
    if (!authChecked) return;
    
    if (!usuario?.idOrganizacion) {
      setUsuarios([]);
      setLoading(false);
      return;
    }

    loadUsuarios();
  }, [authChecked, usuario?.idOrganizacion, loadUsuarios]);

  // Filtrar usuarios excluyendo al usuario actual (por email)
  const usuariosFiltrados = usuarios.filter(u => u.email !== usuario?.email);

  const value: UsuariosOrganizacionContextType = {
    usuarios,
    usuariosFiltrados,
    loading: !authChecked || loading,
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
