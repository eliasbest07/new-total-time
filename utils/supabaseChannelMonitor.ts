/**
 * Monitor para rastrear canales de Supabase activos y detectar leaks
 */

import { supabase } from '@/infrastructure/services/SupabaseClient';

// Rastrear canales activos
const activeChannels = new Map<string, {
  name: string;
  createdAt: Date;
  component: string;
}>();

/**
 * Registrar un nuevo canal
 */
export const registerChannel = (channelName: string, componentName: string) => {
  activeChannels.set(channelName, {
    name: channelName,
    createdAt: new Date(),
    component: componentName
  });

  if (typeof window !== 'undefined') {
    // console.log(`📡 [CHANNEL] Registrado: ${channelName} (${componentName})`);
    // console.log(`📡 [CHANNEL] Total activos: ${activeChannels.size}`);
  }
};

/**
 * Desregistrar un canal
 */
export const unregisterChannel = (channelName: string) => {
  const channel = activeChannels.get(channelName);
  if (channel) {
    activeChannels.delete(channelName);

    if (typeof window !== 'undefined') {
      // console.log(`📡 [CHANNEL] Eliminado: ${channelName}`);
      // console.log(`📡 [CHANNEL] Total activos: ${activeChannels.size}`);
    }
  }
};

/**
 * Obtener información de canales activos
 */
export const getActiveChannels = () => {
  return Array.from(activeChannels.entries()).map(([key, value]) => ({
    name: value.name,
    component: value.component,
    ageSeconds: Math.floor((Date.now() - value.createdAt.getTime()) / 1000)
  }));
};

/**
 * Contar canales activos
 */
export const getChannelCount = () => activeChannels.size;

/**
 * Detectar canales huérfanos (que deberían haberse limpiado)
 */
export const detectOrphanChannels = () => {
  const orphans = Array.from(activeChannels.entries())
    .filter(([_, value]) => {
      const ageMinutes = (Date.now() - value.createdAt.getTime()) / 60000;
      return ageMinutes > 5; // Canales activos por más de 5 minutos
    });

  if (orphans.length > 0) {
    console.warn(`⚠️ Posibles ${orphans.length} canales huérfanos detectados:`);
    orphans.forEach(([key, value]) => {
      const ageMinutes = Math.floor((Date.now() - value.createdAt.getTime()) / 60000);
      console.warn(`  - ${value.name} (${value.component}) - ${ageMinutes} minutos`);
    });
  }

  return orphans;
};

/**
 * Forzar limpieza de todos los canales
 */
export const forceCleanupAllChannels = async () => {
  console.warn('🧹 Forzando limpieza de TODOS los canales de Supabase...');

  const channels = getActiveChannels();
  console.log(`📡 Canales a limpiar: ${channels.length}`);

  // Obtener todos los canales de Supabase
  // @ts-ignore - acceder a API interna
  const supabaseChannels = supabase.getChannels();

  console.log(`📡 Canales en Supabase: ${supabaseChannels.length}`);

  // Remover cada canal
  for (const channel of supabaseChannels) {
    try {
      await supabase.removeChannel(channel);
      console.log(`✅ Canal removido: ${channel.topic}`);
    } catch (error) {
      console.error(`❌ Error removiendo canal ${channel.topic}:`, error);
    }
  }

  // Limpiar nuestro registro
  activeChannels.clear();

  console.log('✅ Limpieza completada');
};

/**
 * Log de estado de canales
 */
export const logChannelStatus = () => {
  console.group('📡 Estado de Canales Supabase');

  const channels = getActiveChannels();
  console.log(`Total canales activos: ${channels.length}`);

  if (channels.length > 0) {
    console.table(channels);
  } else {
    console.log('No hay canales activos');
  }

  // @ts-ignore
  const supabaseChannels = supabase.getChannels();
  console.log(`Canales en Supabase.client: ${supabaseChannels.length}`);

  // Detectar huérfanos
  detectOrphanChannels();

  console.groupEnd();
};

// Exponer utilidades globalmente
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.__supabaseChannels = {
    getActive: getActiveChannels,
    getCount: getChannelCount,
    detectOrphans: detectOrphanChannels,
    forceCleanup: forceCleanupAllChannels,
    logStatus: logChannelStatus
  };

  console.log('💡 Monitor de canales Supabase disponible en window.__supabaseChannels');
}

// Verificación periódica cada 30 segundos
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const count = getChannelCount();
    if (count > 10) {
      console.warn(`⚠️ ADVERTENCIA: ${count} canales de Supabase activos (posible leak)`);
    }
  }, 30000);
}
