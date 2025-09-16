"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario } from '@/domain/entities/Usuario';
import { SupabaseAuthRepository } from '@/infrastructure/repositories/SupabaseAuthRepository';

interface AuthContextType {
  usuario: Usuario | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authRepository = new SupabaseAuthRepository();

  useEffect(() => {
    // Verificar si hay un usuario logueado al cargar la app
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const currentUser = await authRepository.getCurrentUser();
      setUsuario(currentUser);
    } catch (error) {
      console.error('Error checking current user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const user = await authRepository.login(email, password);
      if (user) {
        setUsuario(user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authRepository.logout();
      setUsuario(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    usuario,
    login,
    logout,
    isLoading
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