"use client";

import React, { createContext, useContext, useState } from 'react';
import { Usuario } from '@/domain/entities/Usuario';
import { StorageService } from '@/infrastructure/services/StorageService';

interface AuthContextType {
  usuario: Usuario | null;
  setUsuario: (usuario: Usuario | null) => void;
  clearUsuario: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuarioState] = useState<Usuario | null>(() => {
    // Intentar cargar usuario desde localStorage al inicializar
    return StorageService.getUser();
  });

  const setUsuario = (usuario: Usuario | null) => {
    setUsuarioState(usuario);
    if (usuario) {
      StorageService.saveUser(usuario);
    }
  };

  const clearUsuario = () => {
    setUsuarioState(null);
    StorageService.clearUser();
  };

  const value = {
    usuario,
    setUsuario,
    clearUsuario
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