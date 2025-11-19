import { useState, useEffect, useCallback } from 'react';

/**
 * Interfaz para una sesión de trabajo
 */
export interface SesionTrabajo {
  id: string;
  idMisionActiva: string;
  tipo: 'mision' | 'actividad';
  fechaInicio: string;
  fechaFin: string | null;
  duracionSegundos: number;
}

/**
 * Estadísticas calculadas de tiempo
 */
export interface EstadisticasTiempo {
  tiempoHoy: string;
  ultimaActividad: string;
  tiempoSemana: string;
}

const STORAGE_KEY = 'sesiones_trabajo';

/**
 * Hook para trackear sesiones de trabajo en localStorage
 */
export const useSesionesTracking = () => {
  const [sesiones, setSesiones] = useState<SesionTrabajo[]>([]);

  // Cargar sesiones desde localStorage al iniciar
  useEffect(() => {
    const cargarSesiones = () => {
      const sesionesGuardadas = localStorage.getItem(STORAGE_KEY);
      if (sesionesGuardadas) {
        try {
          const parsed = JSON.parse(sesionesGuardadas);
          setSesiones(parsed);
        } catch (error) {
          console.error('Error al cargar sesiones:', error);
          setSesiones([]);
        }
      }
    };

    // Cargar inicialmente
    cargarSesiones();

    // Escuchar cambios desde otros componentes
    const handleSesionesUpdated = () => {
      cargarSesiones();
    };

    window.addEventListener('sesiones-updated', handleSesionesUpdated);

    return () => {
      window.removeEventListener('sesiones-updated', handleSesionesUpdated);
    };
  }, []);

  // Guardar sesiones en localStorage cuando cambien
  const guardarSesiones = useCallback((nuevasSesiones: SesionTrabajo[]) => {
    console.log('💾 [TRACKING] Guardando sesiones en localStorage:', nuevasSesiones);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevasSesiones));
    console.log('💾 [TRACKING] Sesiones guardadas. Verificando:', localStorage.getItem(STORAGE_KEY));
    setSesiones(nuevasSesiones);

    // Disparar evento personalizado para notificar cambios
    console.log('📢 [TRACKING] Disparando evento sesiones-updated');
    window.dispatchEvent(new Event('sesiones-updated'));
  }, []);

  /**
   * Inicia una nueva sesión de trabajo
   */
  const iniciarSesion = useCallback((idMisionActiva: string, tipo: 'mision' | 'actividad') => {
    console.log('🟢 [TRACKING] Iniciando sesión:', idMisionActiva, tipo);

    // Primero, cerrar cualquier sesión abierta de esta misma misión
    const sesionesActualizadas = sesiones.map(sesion => {
      if (sesion.idMisionActiva === idMisionActiva && sesion.fechaFin === null) {
        const ahora = new Date();
        const inicio = new Date(sesion.fechaInicio);
        const duracion = Math.floor((ahora.getTime() - inicio.getTime()) / 1000);
        console.log('⏸️ [TRACKING] Cerrando sesión anterior:', sesion.id, 'Duración:', duracion);
        return {
          ...sesion,
          fechaFin: ahora.toISOString(),
          duracionSegundos: duracion
        };
      }
      return sesion;
    });

    // Crear nueva sesión
    const nuevaSesion: SesionTrabajo = {
      id: `sesion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      idMisionActiva,
      tipo,
      fechaInicio: new Date().toISOString(),
      fechaFin: null,
      duracionSegundos: 0
    };

    console.log('✅ [TRACKING] Nueva sesión creada:', nuevaSesion.id);
    console.log('📝 [TRACKING] A punto de guardar sesiones. Total a guardar:', sesionesActualizadas.length + 1);
    console.log('📝 [TRACKING] Función guardarSesiones existe?', typeof guardarSesiones);
    console.log('📝 [TRACKING] Array a guardar:', [...sesionesActualizadas, nuevaSesion]);

    try {
      guardarSesiones([...sesionesActualizadas, nuevaSesion]);
      console.log('✅ [TRACKING] guardarSesiones llamado exitosamente');
    } catch (error) {
      console.error('❌ [TRACKING] Error al llamar guardarSesiones:', error);
    }
  }, [sesiones, guardarSesiones]);

  /**
   * Finaliza una sesión de trabajo
   */
  const finalizarSesion = useCallback((idMisionActiva: string) => {
    console.log('🔴 [TRACKING] Finalizando sesión:', idMisionActiva);

    const sesionesActualizadas = sesiones.map(sesion => {
      if (sesion.idMisionActiva === idMisionActiva && sesion.fechaFin === null) {
        const ahora = new Date();
        const inicio = new Date(sesion.fechaInicio);
        const duracion = Math.floor((ahora.getTime() - inicio.getTime()) / 1000);
        console.log('✅ [TRACKING] Sesión finalizada:', sesion.id, 'Duración:', duracion, 'segundos');
        return {
          ...sesion,
          fechaFin: ahora.toISOString(),
          duracionSegundos: duracion
        };
      }
      return sesion;
    });

    guardarSesiones(sesionesActualizadas);
  }, [sesiones, guardarSesiones]);

  /**
   * Formatea segundos a formato HH:MM
   */
  const formatearTiempo = (segundos: number): string => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    return `${horas}:${minutos.toString().padStart(2, '0')}`;
  };

  /**
   * Calcula estadísticas de tiempo
   */
  const calcularEstadisticas = useCallback((): EstadisticasTiempo => {
    // Cargar sesiones DIRECTAMENTE desde localStorage cada vez
    const sesionesGuardadas = localStorage.getItem(STORAGE_KEY);
    const sesionesActuales: SesionTrabajo[] = sesionesGuardadas ? JSON.parse(sesionesGuardadas) : [];

    // DEBUG: Log cada segundo
    console.log('📊 [TRACKING] Calculando estadísticas, sesiones totales:', sesionesActuales.length);
    console.log('📊 [TRACKING] Sesiones en localStorage:', sesionesActuales);

    if (sesionesActuales.length === 0) {
      console.log('⚠️ [TRACKING] No hay sesiones guardadas');
      return {
        tiempoHoy: '0:00',
        ultimaActividad: 'Sin actividad',
        tiempoSemana: '0:00'
      };
    }

    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const inicioSemana = new Date(ahora);
    inicioSemana.setDate(ahora.getDate() - ahora.getDay()); // Inicio de semana (domingo)
    inicioSemana.setHours(0, 0, 0, 0);

    let tiempoHoySegundos = 0;
    let tiempoSemanaSegundos = 0;
    let ultimaSesion: SesionTrabajo | null = null;
    let ultimaSesionDuracion = 0;

    sesionesActuales.forEach(sesion => {
      const fechaInicio = new Date(sesion.fechaInicio);
      const fechaFin = sesion.fechaFin ? new Date(sesion.fechaFin) : ahora;

      // Calcular duración real de la sesión
      let duracion = sesion.duracionSegundos;
      if (sesion.fechaFin === null) {
        // Si la sesión está en progreso, calcular duración actual
        duracion = Math.floor((ahora.getTime() - fechaInicio.getTime()) / 1000);
        console.log('⏱️ [TRACKING] Sesión activa detectada:', {
          id: sesion.id,
          fechaInicio: sesion.fechaInicio,
          fechaFin: sesion.fechaFin,
          duracionGuardada: sesion.duracionSegundos,
          duracionCalculada: duracion,
          ahoraTimestamp: ahora.getTime(),
          inicioTimestamp: fechaInicio.getTime()
        });
      }

      console.log('🔍 [TRACKING] Procesando sesión:', {
        id: sesion.id,
        tipo: sesion.tipo,
        inicio: sesion.fechaInicio,
        fin: sesion.fechaFin,
        duracion: duracion,
        esHoy: fechaInicio >= inicioHoy,
        esSemana: fechaInicio >= inicioSemana
      });

      // Tiempo de hoy
      if (fechaInicio >= inicioHoy) {
        tiempoHoySegundos += duracion;
      }

      // Tiempo de la semana
      if (fechaInicio >= inicioSemana) {
        tiempoSemanaSegundos += duracion;
      }

      // Última sesión (guardar también su duración calculada)
      if (!ultimaSesion || fechaInicio > new Date(ultimaSesion.fechaInicio)) {
        ultimaSesion = sesion;
        ultimaSesionDuracion = duracion;
      }
    });

    const stats = {
      tiempoHoy: formatearTiempo(tiempoHoySegundos),
      ultimaActividad: ultimaSesion ? formatearTiempo(ultimaSesionDuracion) : 'Sin actividad',
      tiempoSemana: formatearTiempo(tiempoSemanaSegundos)
    };

    console.log('📊 [TRACKING] Estadísticas finales:', {
      tiempoHoySegundos,
      tiempoSemanaSegundos,
      ultimaSesionDuracion,
      stats
    });
    return stats;
  }, []); // Sin dependencias - siempre lee localStorage fresco

  /**
   * Limpia sesiones antiguas (opcional, para no acumular demasiados datos)
   */
  const limpiarSesionesAntiguas = useCallback((diasAMantener: number = 30) => {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAMantener);

    const sesionesActualizadas = sesiones.filter(sesion => {
      const fechaInicio = new Date(sesion.fechaInicio);
      return fechaInicio >= fechaLimite;
    });

    guardarSesiones(sesionesActualizadas);
  }, [sesiones, guardarSesiones]);

  return {
    sesiones,
    iniciarSesion,
    finalizarSesion,
    calcularEstadisticas,
    limpiarSesionesAntiguas
  };
};
