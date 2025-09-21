"use client";

import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SupabaseAuthRepository } from '@/infrastructure/repositories/SupabaseAuthRepository';
import { StorageService } from '@/infrastructure/services/StorageService';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { usuario, setUsuario, clearUsuario } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const authRepository = new SupabaseAuthRepository();

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Si ya hay usuario en contexto, usar directamente
      if (usuario) {
        setIsLoading(false);
        return;
      }

      // Verificar localStorage primero (más rápido)
      const storedUser = StorageService.getUser();
      if (storedUser && StorageService.isUserDataFresh()) {
        setUsuario(storedUser);
        setIsLoading(false);
        return;
      }

      // Solo verificar con Supabase si no hay datos locales o no están frescos
      const currentUser = await authRepository.getCurrentUser();
      
      if (currentUser) {
        setUsuario(currentUser);
      } else {
        router.replace('/login');
        return;
      }
    } catch (error) {
      console.error('❌ Error en AuthWrapper:', error);
      clearUsuario();
      router.replace('/login');
      return;
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null; // No mostrar nada mientras carga, el dynamic se encarga del loading
  }

  if (!usuario) {
    return null;
  }

  return <>{children}</>;
}