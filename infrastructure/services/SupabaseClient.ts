// src/infrastructure/services/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { rateLimitHandler } from "./RateLimitHandler";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Variable global para almacenar la instancia singleton
// Esto previene múltiples instancias durante hot reload en desarrollo
declare global {
  var __supabase: SupabaseClient | undefined;
}

// Interceptor global para detectar errores 429 en llamadas de autenticación de Supabase
if (typeof window !== 'undefined' && !(window as any).__supabaseFetchIntercepted) {
  const originalFetch = window.fetch;
  (window as any).__supabaseFetchIntercepted = true;
  
  window.fetch = async function(...args) {
    const url = args[0]?.toString() || '';
    const isSupabaseAuthCall = url.includes('supabase.co') && url.includes('/auth/v1/token');
    
    try {
      const response = await originalFetch.apply(this, args);
      
      // Detectar errores 429 en llamadas de refresh token de Supabase
      if (response.status === 429 && isSupabaseAuthCall) {
        console.warn('⚠️ [SupabaseClient] Error 429 detectado en refresh token, activando cooldown');
        rateLimitHandler.handleRateLimitError();
        
        // Clonar la respuesta para poder leerla sin consumirla
        const clonedResponse = response.clone();
        
        // Intentar leer el error para verificar que es realmente un 429
        try {
          const errorData = await clonedResponse.json();
          if (errorData?.error === 'too_many_requests' || errorData?.message?.includes('rate limit')) {
            console.warn('⚠️ [SupabaseClient] Confirmado: error 429 en refresh token');
          }
        } catch {
          // Ignorar errores al leer la respuesta
        }
      }
      
      return response;
    } catch (error) {
      // Si hay un error y es relacionado con rate limiting en llamadas de auth, activar cooldown
      if (isSupabaseAuthCall && rateLimitHandler.isRateLimitError(error)) {
        rateLimitHandler.handleRateLimitError();
      }
      throw error;
    }
  };
}

// Cliente singleton de Supabase con protección contra hot reload
export const supabase =
  globalThis.__supabase ||
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'supabase-auth', // Clave única para el storage
    },
  });

// Guardar en global solo en desarrollo para prevenir múltiples instancias
if (process.env.NODE_ENV !== 'production') {
  globalThis.__supabase = supabase;
}

// Interceptar errores de autenticación para manejar rate limiting
if (typeof window !== 'undefined') {
  // Listener para errores de refresh token y cambios de estado
  supabase.auth.onAuthStateChange((event, session) => {
    // Limpiar cooldown cuando hay un login exitoso
    if (event === 'SIGNED_IN' && session) {
      rateLimitHandler.clearCooldown();
      console.log('✅ [SupabaseClient] Login exitoso, cooldown limpiado');
    }
    
    // Limpiar cooldown cuando hay un token refrescado exitosamente
    if (event === 'TOKEN_REFRESHED' && session) {
      rateLimitHandler.clearCooldown();
      // console.log('✅ [SupabaseClient] Token refrescado exitosamente, cooldown limpiado');
    }

    // Prevenir SIGNED_OUT si estamos en cooldown por rate limiting
    // Esto evita que se cierre la sesión cuando hay un error 429
    if (event === 'SIGNED_OUT' && rateLimitHandler.isRateLimited()) {
      const remaining = Math.ceil(rateLimitHandler.getRemainingCooldown() / 1000);
      console.warn(`⚠️ [SupabaseClient] SIGNED_OUT detectado durante cooldown. Ignorando para mantener sesión. Esperando ${remaining} segundos...`);
      
      // Si hay cache de sesión, intentar restaurarlo
      if (sessionCache?.session) {
        console.log('🔄 [SupabaseClient] Intentando restaurar sesión desde cache...');
        // No podemos restaurar directamente, pero podemos prevenir que se limpie el cache
        // El cache se mantendrá y se usará cuando se intente acceder a la sesión
      }
      
      // No propagar el evento SIGNED_OUT durante el cooldown
      return;
    }
  });
}

// Cache para la sesión de Supabase
let sessionCache: { session: any; timestamp: number } | null = null;
const SESSION_CACHE_TTL = 30 * 1000; // 30 segundos

// Función para inicializar la sesión al arrancar la aplicación
export const initializeSupabaseSession = async () => {
  try {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') {
      // console.log('⚠️ initializeSupabaseSession llamado en el servidor, saltando...');
      return null;
    }

    // Verificar si estamos en cooldown por rate limiting
    if (rateLimitHandler.isRateLimited()) {
      const remaining = Math.ceil(rateLimitHandler.getRemainingCooldown() / 1000);
      console.warn(`⚠️ [SupabaseClient] En cooldown por rate limiting. Esperando ${remaining} segundos...`);
      
      // Si hay cache, usarlo aunque esté expirado
      if (sessionCache?.session) {
        console.log('🎯 Usando sesión desde cache (cooldown activo)');
        return sessionCache.session;
      }
      
      return null;
    }

    // Verificar cache de sesión primero
    if (sessionCache && (Date.now() - sessionCache.timestamp) < SESSION_CACHE_TTL) {
      // console.log('🎯 Usando sesión desde cache');
      return sessionCache.session;
    }

    // console.log('🔄 Inicializando sesión de Supabase...');
    
    // Pequeña pausa para asegurar que el DOM esté listo
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const { data: sessionData, error } = await supabase.auth.getSession();
    
    if (error) {
      // Verificar si es un error 429
      if (rateLimitHandler.isRateLimitError(error)) {
        rateLimitHandler.handleRateLimitError();
        console.error('❌ Error 429 (Rate Limit) inicializando sesión. Cooldown activado.');
        
        // Si hay cache, usarlo como fallback
        if (sessionCache?.session) {
          console.log('🎯 Usando sesión desde cache después de error 429');
          return sessionCache.session;
        }
      } else {
        console.error('❌ Error inicializando sesión:', error);
      }
      return null;
    }
    
    // Guardar en cache
    sessionCache = {
      session: sessionData.session,
      timestamp: Date.now()
    };
    
    if (sessionData.session) {
      // console.log('✅ Sesión de Supabase inicializada correctamente');
      // console.log('📅 Sesión expira:', new Date(sessionData.session.expires_at * 1000));

      // Solo log de expiración, NO renovar automáticamente
      if (sessionData.session.expires_at) {
        const expiresAt = sessionData.session.expires_at * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        const oneHour = 60 * 60 * 1000;

        if (timeUntilExpiry < oneHour) {
          // console.log('⚠️ Sesión expira pronto. Supabase la renovará automáticamente cuando sea necesario.');
        }
      }
    } else {
      // console.log('ℹ️ No hay sesión activa para inicializar');
    }
    
    return sessionData.session;
  } catch (error) {
    // Verificar si es un error 429
    if (rateLimitHandler.isRateLimitError(error)) {
      rateLimitHandler.handleRateLimitError();
      console.error('❌ Error 429 (Rate Limit) crítico inicializando sesión. Cooldown activado.');
      
      // Si hay cache, usarlo como fallback
      if (sessionCache?.session) {
        console.log('🎯 Usando sesión desde cache después de error 429 crítico');
        return sessionCache.session;
      }
    } else {
      console.error('❌ Error crítico inicializando sesión:', error);
    }
    return null;
  }
};

// Función para verificar si la sesión está activa
export const isSessionActive = async () => {
  if (typeof window === 'undefined') return false;

  // Verificar si estamos en cooldown por rate limiting
  if (rateLimitHandler.isRateLimited()) {
    // Si hay cache, asumir que la sesión está activa
    if (sessionCache?.session) {
      return true;
    }
    return false;
  }

  try {
    const { data: sessionData, error } = await supabase.auth.getSession();
    
    // Verificar si es un error 429
    if (error && rateLimitHandler.isRateLimitError(error)) {
      rateLimitHandler.handleRateLimitError();
      // Si hay cache, asumir que la sesión está activa
      if (sessionCache?.session) {
        return true;
      }
      return false;
    }
    
    return !error && !!sessionData.session;
  } catch (error) {
    // Verificar si es un error 429
    if (rateLimitHandler.isRateLimitError(error)) {
      rateLimitHandler.handleRateLimitError();
      // Si hay cache, asumir que la sesión está activa
      if (sessionCache?.session) {
        return true;
      }
    } else {
      console.error('❌ Error verificando sesión:', error);
    }
    return false;
  }
};
