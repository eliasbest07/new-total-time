"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario } from '@/domain/entities/Usuario';
import { SupabaseAuthRepository } from '@/infrastructure/repositories/SupabaseAuthRepository';
import { StorageService } from '@/infrastructure/services/StorageService';

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
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('🚀 Inicializando autenticación...');
      
      // Primero intentar cargar desde localStorage
      const storedUser = StorageService.getUser();
      console.log('💾 Usuario en localStorage:', storedUser);
      
      if (storedUser) {
        setUsuario(storedUser);
        setIsLoading(false);
        console.log('✅ Usuario cargado desde localStorage');

        // Solo verificar con Supabase si los datos no están "frescos"
        const isFresh = StorageService.isUserDataFresh();
        console.log('🕒 Datos frescos:', isFresh);
        
        if (!isFresh) {
          console.log('🔄 Verificando sesión con Supabase...');
          authRepository.getCurrentUser()
            .then(currentUser => {
              console.log('🔄 Usuario actual de Supabase:', currentUser);
              if (!currentUser) {
                // La sesión expiró, limpiar datos
                console.log('❌ Sesión expirada, limpiando datos');
                setUsuario(null);
                StorageService.clearUser();
              } else {
                // Actualizar datos y timestamp
                console.log('✅ Sesión válida, actualizando datos');
                setUsuario(currentUser);
                StorageService.saveUser(currentUser);
              }
            })
            .catch((error) => {
              // Error al verificar, mantener datos locales por ahora
              console.warn('⚠️ No se pudo verificar la sesión, manteniendo datos locales:', error);
            });
        }

        return;
      }

      // Si no hay datos en localStorage, verificar con Supabase
      console.log('🔍 No hay datos locales, verificando con Supabase...');
      const currentUser = await authRepository.getCurrentUser();
      console.log('🔍 Usuario actual de Supabase:', currentUser);
      
      if (currentUser) {
        setUsuario(currentUser);
        StorageService.saveUser(currentUser);
        console.log('✅ Usuario cargado desde Supabase y guardado localmente');
      } else {
        console.log('ℹ️ No hay usuario autenticado');
      }
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
      StorageService.clearUser();
    } finally {
      setIsLoading(false);
      console.log('🏁 Inicialización de auth completada');
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 Iniciando login para:', email);
      const user = await authRepository.login(email, password);
      console.log('🔐 Usuario obtenido del repositorio:', user);
      
      if (user) {
        setUsuario(user);
        // Usar StorageService para guardar
        StorageService.saveUser(user);
        console.log('✅ Login exitoso, usuario guardado');
        return true;
      }
      console.log('❌ Login falló - no se obtuvo usuario');
      return false;
    } catch (error) {
      console.error('❌ Login error:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authRepository.logout();
      setUsuario(null);
      // Usar StorageService para limpiar
      StorageService.clearUser();
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