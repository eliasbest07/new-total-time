"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { SupabaseAuthRepository } from '@/infrastructure/datasource/SupabaseAuthRepository';
import { StorageService } from '@/infrastructure/services/StorageService';
import { initializeSupabaseSession, supabase } from '@/infrastructure/services/SupabaseClient';
import { Session } from '@supabase/supabase-js';
import { rateLimitHandler } from '@/infrastructure/services/RateLimitHandler';

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

        // Si estamos en cooldown por rate limiting, ignorar eventos de refresh y SIGNED_OUT
        // Esto previene que se cierre la sesión cuando hay un error 429
        if (rateLimitHandler.isRateLimited()) {
          if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            console.warn('⚠️ [AuthWrapper] Ignorando evento de auth durante cooldown:', event);
            return;
          }
          // Prevenir SIGNED_OUT durante cooldown para mantener la sesión activa
          if (event === 'SIGNED_OUT') {
            const remaining = Math.ceil(rateLimitHandler.getRemainingCooldown() / 1000);
            console.warn(`⚠️ [AuthWrapper] SIGNED_OUT detectado durante cooldown. Ignorando para mantener sesión. Esperando ${remaining} segundos...`);
            // NO limpiar usuario ni redirigir durante el cooldown
            return;
          }
        }

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

    // Si estamos en cooldown por rate limiting, no procesar eventos
    if (rateLimitHandler.isRateLimited()) {
      const remaining = Math.ceil(rateLimitHandler.getRemainingCooldown() / 1000);
      console.warn(`⚠️ [AuthWrapper] En cooldown por rate limiting. Esperando ${remaining} segundos antes de procesar evento.`);
      return;
    }

    const handleAuthEvent = async () => {
      if (authEvent.event === 'SIGNED_IN' && authEvent.session) {
        // console.log('🔄 Procesando SIGNED_IN en effect separado...');
        try {
          const currentUser = await authRepository.getCurrentUser();
          if (currentUser) {
            // console.log('✅ Usuario obtenido, actualizando contexto');
            setUsuario(currentUser);
          } else {
            console.error('❌ No se pudo obtener usuario después de SIGNED_IN');
          }
        } catch (error: any) {
          // Verificar si es un error 429
          if (rateLimitHandler.isRateLimitError(error)) {
            rateLimitHandler.handleRateLimitError();
            console.error('❌ Error 429 (Rate Limit) obteniendo usuario después de SIGNED_IN. Cooldown activado.');
            // No limpiar el evento para que se reintente después del cooldown
            return;
          } else {
            console.error('❌ Error obteniendo usuario después de SIGNED_IN:', error);
          }
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
      
      // Verificar si estamos en cooldown por rate limiting
      if (rateLimitHandler.isRateLimited()) {
        const remaining = Math.ceil(rateLimitHandler.getRemainingCooldown() / 1000);
        console.warn(`⚠️ [initializeAuth] En cooldown por rate limiting. Esperando ${remaining} segundos...`);
        
        // Usar usuario de localStorage si existe
        if (storedUser) {
          console.log('⚠️ Usando usuario de localStorage durante cooldown');
          setUsuario(storedUser);
          setIsLoading(false);
          return;
        }
        
        // Si no hay usuario en localStorage, redirigir a login
        console.log('❌ No hay usuario en localStorage y estamos en cooldown, redirigiendo a login');
        router.replace('/login');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Pequeño delay
      
      try {
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
      } catch (error: any) {
        // Verificar si es un error 429
        if (rateLimitHandler.isRateLimitError(error)) {
          rateLimitHandler.handleRateLimitError();
          console.error('❌ Error 429 (Rate Limit) en initializeAuth. Cooldown activado.');
          
          // Usar usuario de localStorage si existe
          if (storedUser) {
            console.log('⚠️ Usando usuario de localStorage después de error 429');
            setUsuario(storedUser);
            setIsLoading(false);
            return;
          }
          
          // Si no hay usuario en localStorage, redirigir a login
          console.log('❌ No hay usuario en localStorage después de error 429, redirigiendo a login');
          clearUsuario();
          router.replace('/login');
          return;
        }
        
        // Re-lanzar el error para que se maneje en el catch general
        throw error;
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