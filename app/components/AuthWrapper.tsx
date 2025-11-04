"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { SupabaseAuthRepository } from '@/infrastructure/datasource/SupabaseAuthRepository';
import { StorageService } from '@/infrastructure/services/StorageService';
import { initializeSupabaseSession, supabase } from '@/infrastructure/services/SupabaseClient';
import { Session } from '@supabase/supabase-js';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { usuario, setUsuario, clearUsuario } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [authEvent, setAuthEvent] = useState<{ event: string; session: Session | null } | null>(null);
  const router = useRouter();

  // Mover authRepository a useMemo para evitar recreaciones
  const authRepository = useMemo(() => new SupabaseAuthRepository(), []);

  useEffect(() => {
    // Solo ejecutar en el cliente y después de que el componente esté montado
    if (typeof window !== 'undefined') {
      // Delay más largo para evitar rate limiting
      const timer = setTimeout(() => {
        initializeAuth();
      }, 1000); // Aumentado a 1 segundo para evitar rate limiting
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Listener para cambios en el estado de autenticación
  // IMPORTANTE: NO hacer llamadas async de Supabase aquí (según docs de Supabase)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // console.log('🎧 Configurando listener de auth state changes...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // console.log('🔄 AUTH STATE CHANGE:', {
        //   event,
        //   sessionExists: !!session,
        //   sessionExpiry: session ? new Date(session.expires_at * 1000) : null,
        //   currentPath: window.location.pathname
        // });

        // Solo establecer el estado para que se maneje en otro useEffect
        // NO hacer llamadas async de Supabase aquí
        if (event === 'SIGNED_OUT') {
          // console.log('❌ SIGNED_OUT event - limpiando usuario');
          clearUsuario();
          if (window.location.pathname !== '/login') {
            router.replace('/login');
          }
        } else if (event === 'SIGNED_IN') {
          // console.log('✅ SIGNED_IN event - estableciendo flag para cargar usuario');
          setAuthEvent({ event, session });
        } else if (event === 'TOKEN_REFRESHED') {
          // console.log('🔄 TOKEN_REFRESHED - sesión actualizada');
          // No hacer nada más, el token se actualizó automáticamente
        } else if (event === 'INITIAL_SESSION') {
          // console.log('ℹ️ INITIAL_SESSION - ignorando');
        } else {
          // console.log('ℹ️ Evento de auth no manejado:', event);
        }
      }
    );

    return () => {
      // console.log('🧹 Desmontando listener de auth state');
      subscription.unsubscribe();
    };
  }, [clearUsuario, router]);

  // Effect separado para manejar eventos de auth que requieren llamadas async
  useEffect(() => {
    if (!authEvent) return;

    const handleAuthEvent = async () => {
      if (authEvent.event === 'SIGNED_IN' && authEvent.session) {
        // console.log('🔄 Procesando SIGNED_IN en effect separado...');
        const currentUser = await authRepository.getCurrentUser();
        if (currentUser) {
          // console.log('✅ Usuario obtenido, actualizando contexto');
          setUsuario(currentUser);
        } else {
          console.error('❌ No se pudo obtener usuario después de SIGNED_IN');
        }
        setAuthEvent(null); // Limpiar el evento
      }
    };

    handleAuthEvent();
  }, [authEvent, authRepository, setUsuario]);

  const initializeAuth = async () => {
    // Evitar múltiples inicializaciones simultáneas
    if (isInitializing) {
      // console.log('⚠️ Ya hay una inicialización en curso, saltando...');
      return;
    }

    setIsInitializing(true);

    try {
      // Si ya hay usuario en contexto, usar directamente
      if (usuario) {
        // console.log('✅ Usuario ya existe en contexto');
        setIsLoading(false);
        return;
      }

      // PRIMERO: Verificar localStorage (más confiable y rápido)
      const storedUser = StorageService.getUser();
      if (storedUser && StorageService.isUserDataFresh()) {
        console.log('✅ Usuario válido en localStorage, cargando inmediatamente');
        setUsuario(storedUser);
        setIsLoading(false);
        
        // Inicializar sesión de Supabase en background con delay para evitar rate limiting
        setTimeout(() => {
          initializeSupabaseSession().then(() => {
            console.log('🔄 Sesión de Supabase inicializada en background');
          }).catch(err => {
            console.warn('⚠️ Error inicializando sesión en background:', err);
          });
        }, 2000); // Delay de 2 segundos
        
        return;
      }

      // Si no hay datos locales frescos, intentar con Supabase (con throttling)
      console.log('🔄 No hay datos locales válidos, verificando con Supabase...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Pequeño delay
      await initializeSupabaseSession();

      console.log('🔍 Obteniendo usuario actual...');
      const currentUser = await authRepository.getCurrentUser();
      
      if (currentUser) {
        console.log('✅ Usuario encontrado en Supabase');
        setUsuario(currentUser);
      } else if (storedUser) {
        // Si hay usuario en localStorage pero no está fresco, usarlo temporalmente
        console.log('⚠️ Usando usuario de localStorage (no fresco) como fallback');
        setUsuario(storedUser);
      } else {
        console.log('❌ No hay usuario en ningún lado, redirigiendo a login');
        router.replace('/login');
        return;
      }
    } catch (error) {
      console.error('❌ Error crítico en initializeAuth:', error);
      
      // En caso de error, verificar fallback
      const storedUser = StorageService.getUser();
      if (storedUser) {
        console.log('🆘 Error pero hay fallback en localStorage');
        setUsuario(storedUser);
      } else {
        clearUsuario();
        router.replace('/login');
        return;
      }
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
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