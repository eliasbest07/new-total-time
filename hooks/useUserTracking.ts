import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/infrastructure/services/SupabaseClient';

/**
 * Hook para obtener estadísticas de tracking de un usuario específico
 * Basado en la tabla 'capture'
 */

const MINUTOS_POR_CAPTURA = 5;

interface UserStats {
  tiempoHoy: string;
  ultimaActividad: string;
  tiempoSemana: string;
}

export const useUserTracking = (userId: string | null) => {
  const [estadisticas, setEstadisticas] = useState<UserStats>({
    tiempoHoy: '0h 0m',
    ultimaActividad: 'Sin actividad',
    tiempoSemana: '0h 0m'
  });
  const [isLoading, setIsLoading] = useState(true);

  // Formatear minutos a HH:MM
  const formatear = (minutos: number): string => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  };

  // Calcular estadísticas desde Supabase para un usuario específico
  const calcularEstadisticas = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const ahora = new Date();

      // Definir inicio del día de hoy
      const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

      // Definir inicio de la semana (domingo = 0, ajustamos para que lunes = 0)
      const inicioSemana = new Date(ahora);
      const diaSemana = ahora.getDay();
      const diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1;
      inicioSemana.setDate(ahora.getDate() - diasHastaLunes);
      inicioSemana.setHours(0, 0, 0, 0);

      console.log(`📊 [USER TRACKING] Calculando stats para usuario: ${userId}`);

      // 1. TIEMPO HOY: Contar capturas de hoy
      const { data: capturasHoy, error: errorHoy } = await supabase
        .from('capture')
        .select('id')
        .eq('id_usuario', userId)
        .gte('created_at', inicioHoy.toISOString());

      if (errorHoy) {
        console.error('❌ [USER TRACKING] Error obteniendo capturas de hoy:', errorHoy);
      }

      const totalCapturasHoy = capturasHoy?.length || 0;
      const minutosHoy = totalCapturasHoy * MINUTOS_POR_CAPTURA;
      const tiempoHoy = formatear(minutosHoy);

      // 2. ÚLTIMA ACTIVIDAD: Buscar la última actividad del día (por mision_actividad)
      const { data: capturasActividad, error: errorActividad } = await supabase
        .from('capture')
        .select('mision_actividad, created_at')
        .eq('id_usuario', userId)
        .gte('created_at', inicioHoy.toISOString())
        .not('mision_actividad', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (errorActividad) {
        console.error('❌ [USER TRACKING] Error obteniendo última actividad:', errorActividad);
      }

      let ultimaActividad = 'Sin actividad';

      if (capturasActividad && capturasActividad.length > 0) {
        const ultimaMisionActividad = capturasActividad[0].mision_actividad;

        // Contar cuántas capturas tiene esta actividad hoy
        const { data: capturasDeActividad, error: errorConteo } = await supabase
          .from('capture')
          .select('id')
          .eq('id_usuario', userId)
          .eq('mision_actividad', ultimaMisionActividad)
          .gte('created_at', inicioHoy.toISOString());

        if (errorConteo) {
          console.error('❌ [USER TRACKING] Error contando capturas de actividad:', errorConteo);
        }

        const totalCapturasActividad = capturasDeActividad?.length || 0;
        const minutosActividad = totalCapturasActividad * MINUTOS_POR_CAPTURA;
        ultimaActividad = formatear(minutosActividad);
      }

      // 3. TIEMPO SEMANA: Contar capturas de la semana
      const { data: capturasSemana, error: errorSemana } = await supabase
        .from('capture')
        .select('id')
        .eq('id_usuario', userId)
        .gte('created_at', inicioSemana.toISOString());

      if (errorSemana) {
        console.error('❌ [USER TRACKING] Error obteniendo capturas de la semana:', errorSemana);
      }

      const totalCapturasSemana = capturasSemana?.length || 0;
      const minutosSemana = totalCapturasSemana * MINUTOS_POR_CAPTURA;
      const tiempoSemana = formatear(minutosSemana);

      const stats = {
        tiempoHoy,
        ultimaActividad,
        tiempoSemana
      };

      console.log(`✅ [USER TRACKING] Stats calculadas para ${userId}:`, stats);
      setEstadisticas(stats);
      setIsLoading(false);
      return stats;

    } catch (error) {
      console.error('❌ [USER TRACKING] Error calculando estadísticas:', error);
      setIsLoading(false);
      return {
        tiempoHoy: '0h 0m',
        ultimaActividad: 'Sin actividad',
        tiempoSemana: '0h 0m'
      };
    }
  }, [userId]);

  // Cargar estadísticas al montar el componente o cuando cambie el userId
  useEffect(() => {
    calcularEstadisticas();
  }, [calcularEstadisticas]);

  // Escuchar cambios en la tabla capture mediante Realtime
  useEffect(() => {
    if (!userId) return;

    console.log(`🔄 [USER TRACKING] Configurando suscripción para usuario: ${userId}`);

    const channel = supabase
      .channel(`captures-tracking-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'capture',
          filter: `id_usuario=eq.${userId}`
        },
        (payload) => {
          console.log(`🔔 [USER TRACKING] Cambio detectado para usuario ${userId}:`, payload);
          calcularEstadisticas();
        }
      )
      .subscribe();

    return () => {
      console.log(`🛑 [USER TRACKING] Cerrando suscripción para usuario: ${userId}`);
      supabase.removeChannel(channel);
    };
  }, [userId, calcularEstadisticas]);

  return {
    estadisticas,
    isLoading,
    calcularEstadisticas,
    formatear
  };
};
