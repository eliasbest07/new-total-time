import { useState, useEffect, useCallback } from 'react';

/**
 * Sistema de tracking SIMPLE
 * Solo guarda: ID de misión, fecha inicio, segundos acumulados
 */

interface TiempoMision {
  [idMisionActiva: string]: {
    fechaInicio: string | null; // null = pausada
    segundosAcumulados: number;
  };
}

const STORAGE_KEY = 'tiempo_misiones';

export const useSimpleTracking = () => {
  const [tiempos, setTiempos] = useState<TiempoMision>({});

  // Cargar tiempos desde localStorage
  useEffect(() => {
    const cargar = () => {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado) {
        try {
          setTiempos(JSON.parse(guardado));
        } catch (error) {
          console.error('Error cargando tiempos:', error);
        }
      }
    };

    cargar();

    // Escuchar cambios
    const handleUpdate = () => cargar();
    window.addEventListener('tiempos-updated', handleUpdate);
    return () => window.removeEventListener('tiempos-updated', handleUpdate);
  }, []);

  // Guardar en localStorage
  const guardar = useCallback((nuevosTiempos: TiempoMision) => {
    console.log('💾 [SIMPLE TRACKING] Guardando en localStorage:', nuevosTiempos);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevosTiempos));
    console.log('💾 [SIMPLE TRACKING] Guardado exitoso');
    setTiempos(nuevosTiempos);
    console.log('📢 [SIMPLE TRACKING] Disparando evento tiempos-updated');
    window.dispatchEvent(new Event('tiempos-updated'));
  }, []);

  // Iniciar misión
  const iniciar = useCallback((idMisionActiva: string) => {
    console.log('▶️ [SIMPLE TRACKING] Iniciando:', idMisionActiva);

    const ahora = new Date().toISOString();
    const nuevos = { ...tiempos };

    // Si no existe, crear
    if (!nuevos[idMisionActiva]) {
      console.log('🆕 [SIMPLE TRACKING] Creando nueva entrada para:', idMisionActiva);
      nuevos[idMisionActiva] = {
        fechaInicio: ahora,
        segundosAcumulados: 0
      };
    } else {
      console.log('🔄 [SIMPLE TRACKING] Reanudando misión existente:', idMisionActiva);
      // Si ya existe, solo actualizar fecha inicio (reanudar)
      nuevos[idMisionActiva].fechaInicio = ahora;
    }

    console.log('💾 [SIMPLE TRACKING] A punto de guardar:', nuevos);
    guardar(nuevos);
    console.log('✅ [SIMPLE TRACKING] Guardado completo. Verificando localStorage:', localStorage.getItem(STORAGE_KEY));
  }, [tiempos, guardar]);

  // Pausar misión
  const pausar = useCallback((idMisionActiva: string) => {
    console.log('⏸️ [SIMPLE TRACKING] Pausando:', idMisionActiva);

    const datos = tiempos[idMisionActiva];
    if (!datos || !datos.fechaInicio) return;

    const ahora = new Date();
    const inicio = new Date(datos.fechaInicio);
    const segundosEnSesion = Math.floor((ahora.getTime() - inicio.getTime()) / 1000);

    const nuevos = { ...tiempos };
    nuevos[idMisionActiva] = {
      fechaInicio: null, // Marcar como pausada
      segundosAcumulados: datos.segundosAcumulados + segundosEnSesion
    };

    console.log('⏸️ [SIMPLE TRACKING] Segundos en sesión:', segundosEnSesion, 'Total acumulado:', nuevos[idMisionActiva].segundosAcumulados);
    guardar(nuevos);
  }, [tiempos, guardar]);

  // Obtener tiempo actual de una misión (acumulado + en progreso)
  const obtenerTiempo = useCallback((idMisionActiva: string): number => {
    const datos = tiempos[idMisionActiva];
    if (!datos) return 0;

    let total = datos.segundosAcumulados;

    // Si está en progreso, sumar tiempo actual
    if (datos.fechaInicio) {
      const ahora = new Date();
      const inicio = new Date(datos.fechaInicio);
      const segundosActuales = Math.floor((ahora.getTime() - inicio.getTime()) / 1000);
      total += segundosActuales;
    }

    return total;
  }, [tiempos]);

  // Formatear segundos a HH:MM
  const formatear = (segundos: number): string => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    return `${horas}h ${minutos}m`;
  };

  // Calcular estadísticas
  const calcularEstadisticas = useCallback(() => {
    // Leer directamente de localStorage para tener datos frescos
    const guardado = localStorage.getItem(STORAGE_KEY);
    const tiemposActuales: TiempoMision = guardado ? JSON.parse(guardado) : {};

    console.log('📊 [SIMPLE TRACKING] Calculando estadísticas...');
    console.log('📊 [SIMPLE TRACKING] Datos en localStorage:', tiemposActuales);

    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const inicioSemana = new Date(ahora);
    inicioSemana.setDate(ahora.getDate() - ahora.getDay());
    inicioSemana.setHours(0, 0, 0, 0);

    let tiempoHoy = 0;
    let tiempoSemana = 0;
    let ultimaActividad = 0;
    let ultimaFecha: Date | null = null;

    Object.keys(tiemposActuales).forEach(idMision => {
      const datos = tiemposActuales[idMision];
      let tiempoTotal = datos.segundosAcumulados;

      console.log(`🔍 [SIMPLE TRACKING] Procesando misión ${idMision}:`, {
        fechaInicio: datos.fechaInicio,
        segundosAcumulados: datos.segundosAcumulados,
        estaActiva: datos.fechaInicio !== null
      });

      // Si está activa, calcular tiempo actual
      if (datos.fechaInicio) {
        const inicio = new Date(datos.fechaInicio);
        const segundosActuales = Math.floor((ahora.getTime() - inicio.getTime()) / 1000);
        tiempoTotal += segundosActuales;

        console.log(`⏱️ [SIMPLE TRACKING] Misión ACTIVA ${idMision}:`, {
          inicioTimestamp: inicio.getTime(),
          ahoraTimestamp: ahora.getTime(),
          segundosActuales,
          segundosAcumulados: datos.segundosAcumulados,
          tiempoTotal
        });

        // Verificar si es de hoy
        if (inicio >= inicioHoy) {
          tiempoHoy += tiempoTotal;
          console.log(`📅 [SIMPLE TRACKING] Es de HOY, acumulando ${tiempoTotal}s. Total hoy: ${tiempoHoy}s`);
        }

        // Verificar si es de esta semana
        if (inicio >= inicioSemana) {
          tiempoSemana += tiempoTotal;
          console.log(`📅 [SIMPLE TRACKING] Es de SEMANA, acumulando ${tiempoTotal}s. Total semana: ${tiempoSemana}s`);
        }

        // Última actividad
        if (!ultimaFecha || inicio > ultimaFecha) {
          ultimaFecha = inicio;
          ultimaActividad = tiempoTotal;
          console.log(`🎯 [SIMPLE TRACKING] Nueva última actividad: ${tiempoTotal}s`);
        }
      }
    });

    const stats = {
      tiempoHoy: formatear(tiempoHoy),
      ultimaActividad: ultimaActividad > 0 ? formatear(ultimaActividad) : 'Sin actividad',
      tiempoSemana: formatear(tiempoSemana)
    };

    console.log('✅ [SIMPLE TRACKING] Estadísticas calculadas:', stats);
    return stats;
  }, []);

  return {
    iniciar,
    pausar,
    obtenerTiempo,
    calcularEstadisticas,
    formatear
  };
};
