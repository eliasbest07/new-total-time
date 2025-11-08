// src/infrastructure/services/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Variable global para almacenar la instancia singleton
// Esto previene múltiples instancias durante hot reload en desarrollo
declare global {
  var __supabase: SupabaseClient | undefined;
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
      console.error('❌ Error inicializando sesión:', error);
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
    console.error('❌ Error crítico inicializando sesión:', error);
    return null;
  }
};

// Función para verificar si la sesión está activa
export const isSessionActive = async () => {
  if (typeof window === 'undefined') return false;

  try {
    const { data: sessionData, error } = await supabase.auth.getSession();
    return !error && !!sessionData.session;
  } catch (error) {
    console.error('❌ Error verificando sesión:', error);
    return false;
  }
};
