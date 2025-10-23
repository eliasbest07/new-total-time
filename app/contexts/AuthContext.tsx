"use client";

import React, { createContext, useContext, useState } from 'react';
import { Usuario } from '@/domain/entities/Usuario';
import { StorageService } from '@/infrastructure/services/StorageService';
import { usePresence, PresenceUser } from '@/hooks/usePresence';

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
    return StorageService.getUser();
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

  // console.log('🔍 AuthContext: Usuario actual:', usuario ? {
  //   id: usuario.id,
  //   userAuth: usuario.userAuth,
  //   username: usuario.profile.username,
  //   idOrganizacion: usuario.idOrganizacion
  // } : 'null');

  const setUsuario = (usuario: Usuario | null) => {
    // console.log('🔄 AuthContext: Estableciendo usuario:', usuario ? 'Usuario presente' : 'Usuario null');
    setUsuarioState(usuario);
    if (usuario) {
      StorageService.saveUser(usuario);
      // console.log('✅ AuthContext: Usuario guardado en localStorage');
    } else {
      console.log('⚠️ AuthContext: Usuario es null, no se guarda');
    }
  };

  const clearUsuario = () => {
    setUsuarioState(null);
    StorageService.clearUser();
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