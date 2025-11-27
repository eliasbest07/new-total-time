"use client";

import React, { createContext, useContext, useState } from 'react';
import { Usuario } from '@/domain/entities/Usuario';
import { StorageService } from '@/infrastructure/services/StorageService';
import { usePresence, PresenceUser } from '@/hooks/usePresence';
import { userCacheService } from '@/infrastructure/services/UserCacheService';

interface AuthContextType {
  usuario: Usuario | null;
  setUsuario: (usuario: Usuario | null) => void;
  clearUsuario: () => void;
  onlineUsers: PresenceUser[];
  isUserOnline: (userId: string) => boolean;
  totalOnline: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuarioState] = useState<Usuario | null>(() => {
    // Intentar cargar usuario desde localStorage al inicializar
    const savedUser = StorageService.getUser();
    console.log('🔐 [AuthContext] Inicializando con usuario desde localStorage:', savedUser ? {
      id: savedUser.id,
      userAuth: savedUser.userAuth,
      email: savedUser.email,
      idOrganizacion: savedUser.idOrganizacion
    } : 'null');
    return savedUser;
  });

  // Hook de presencia que trackea usuarios online
  // IMPORTANTE: Usamos userAuth (UUID de Supabase) como ID único
  const { onlineUsers, isUserOnline, totalOnline } = usePresence(
    usuario?.idOrganizacion,
    usuario ? {
      id: usuario.userAuth, // Usar UUID de Supabase auth
      username: usuario.profile.username,
      avatar: usuario.profile.avatar,
    } : null
  );

  console.log('🔍 [AuthContext] Usuario actual:', usuario ? {
    id: usuario.id,
    userAuth: usuario.userAuth,
    username: usuario.profile.username,
    email: usuario.email,
    idOrganizacion: usuario.idOrganizacion
  } : 'null');

  const setUsuario = (usuario: Usuario | null) => {
    console.log('🔄 [AuthContext] Estableciendo usuario:', usuario ? {
      id: usuario.id,
      userAuth: usuario.userAuth,
      email: usuario.email,
      idOrganizacion: usuario.idOrganizacion
    } : 'Usuario null');
    setUsuarioState(usuario);
    if (usuario) {
      StorageService.saveUser(usuario);
      console.log('✅ [AuthContext] Usuario guardado en localStorage');
    } else {
      console.log('⚠️ [AuthContext] Usuario es null, no se guarda');
    }
  };

  const clearUsuario = () => {
    // Obtener el ID del usuario antes de limpiarlo
    const userId = usuario?.userAuth;

    setUsuarioState(null);
    StorageService.clearUser();
    // ✅ Limpiar el caché de usuarios al hacer logout
    userCacheService.clearAll();

    // ✅ Limpiar TODA la pizarra del localStorage sin guardar en Supabase
    if (userId) {
      // Claves de pizarra personal (prefix: 'real')
      const pizarraPersonalKeys = [
        `pizarra-real-cards-v1`,
        `pizarra-real-connections-v1`,
        `pizarra-real-pan-offset-v1`,
        `pizarra-real-date-v1`,
        `pizarra-real-history`,
        `pizarra-real-last-supabase-load`,
        `pizarra_last_sync_${userId}`,
        `pizarra_cards_real_${userId}`
      ];

      // Claves de pizarra de organización (prefix: 'organizacion')
      const pizarraOrgKeys = [
        `pizarra-organizacion-cards-v1`,
        `pizarra-organizacion-connections-v1`,
        `pizarra-organizacion-pan-offset-v1`,
        `pizarra-organizacion-date-v1`,
        `pizarra-organizacion-history`,
        `pizarra-organizacion-last-supabase-load`,
        `pizarra_cards_organizacion_${userId}`
      ];

      // Combinar todas las claves
      const allPizarraKeys = [...pizarraPersonalKeys, ...pizarraOrgKeys];

      allPizarraKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ [AuthContext] Limpiado: ${key}`);
      });

      console.log('✅ [AuthContext] Pizarra completamente limpiada del localStorage');
      console.log('🔄 [AuthContext] Estado de primera apertura reiniciado');
    }
  };

  const value = {
    usuario,
    setUsuario,
    clearUsuario,
    onlineUsers,
    isUserOnline,
    totalOnline,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}