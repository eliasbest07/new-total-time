import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { misionActivaRepository } from '../infrastructure/datasource/SupabaseMisionActivaRepository';
import {
  MisionActiva,
  CreateMisionActivaDTO,
  UpdateRunningStateDTO,
  SubmitEntregaDTO
} from '../domain/entities/MisionActiva';

/**
 * Hook para gestionar misiones activas
 */
export const useMisionActiva = () => {
  const [misionActiva, setMisionActiva] = useState<MisionActiva | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cargar misión activa por ID de misión activa
   */
  const loadMisionActiva = useCallback(async (misionActivaId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('misiones_activas')
        .select('*')
        .eq('id', misionActivaId)
        .single();

      if (error) throw error;
      setMisionActiva(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crear nueva misión activa
   */
  const createMisionActiva = useCallback(async (dto: CreateMisionActivaDTO) => {
    setLoading(true);
    setError(null);
    try {
      const data = await misionActivaRepository.create(dto);
      setMisionActiva(data);
      return data;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Actualizar estado de ejecución (play/pause)
   */

  const updateRunningState = useCallback(async (
    misionActivaId: string,
    dto: UpdateRunningStateDTO
  ) => {
    setLoading(true);
    setError(null);
    try {
      const data = await misionActivaRepository.updateRunningState(misionActivaId, dto);
      setMisionActiva(data);
      return data;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Agregar URL de captura
   */
  const addCaptureUrl = useCallback(async (misionActivaId: string, captureUrl: string) => {
   console.log(misionActivaId)
    try {
      const data = await misionActivaRepository.addCaptureUrl(misionActivaId, captureUrl);
      setMisionActiva(data);
      return data;
    } catch (err) {
      console.log((err as Error).message)
      console.log("error")
      setError((err as Error).message);
      return null;
    }
  }, []);

  /**
   * Enviar entrega
   */
  const submitEntrega = useCallback(async (
    misionActivaId: string,
    dto: SubmitEntregaDTO
  ) => {
    setLoading(true);
    setError(null);
    try {
      const data = await misionActivaRepository.submitEntrega(misionActivaId, dto);
      setMisionActiva(data);
      return data;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener o crear misión activa
   */
  const getOrCreateMisionActiva = useCallback(async (
    createDto: CreateMisionActivaDTO
  ): Promise<MisionActiva | null> => {
    console.log('🔍 [GET_OR_CREATE] Procesando misión activa:', {
      tipo: createDto.tipo,
      id_referencia: createDto.id_referencia,
      id_usuario_asignado: createDto.id_usuario_asignado
    });

    // 1. Buscar si ya existe una misión activa para esta referencia
    let mision = await misionActivaRepository.getByTipoAndReferenciaOnly(
      createDto.tipo,
      createDto.id_referencia
    );

    if (mision) {
      // Ya existe - reutilizar la misma fila
      console.log('♻️ [GET_OR_CREATE] Misión activa encontrada, reutilizando:', {
        id: mision.id,
        usuario_actual: mision.id_usuario_asignado,
        usuario_nuevo: createDto.id_usuario_asignado
      });

      // Si el usuario es diferente, resetear la misión
      if (mision.id_usuario_asignado !== createDto.id_usuario_asignado) {
        console.log('🔄 [GET_OR_CREATE] Usuario diferente, reseteando misión');
        const reseteada = await misionActivaRepository.resetMisionActiva(
          mision.id,
          createDto.id_usuario_asignado
        );
        if (reseteada) {
          mision = reseteada;
        }
      }
    } else {
      // No existe - crear nueva
      console.log('➕ [GET_OR_CREATE] No existe, creando nueva misión activa');
      mision = await misionActivaRepository.create(createDto);
    }

    if (mision) {
      console.log('✅ [GET_OR_CREATE] Misión activa lista:', {
        id: mision.id,
        estado: mision.estado,
        is_running: mision.is_running
      });
    } else {
      console.error('❌ [GET_OR_CREATE] No se pudo obtener/crear la misión activa');
    }

    setMisionActiva(mision);
    return mision;
  }, []);

  /**
   * Obtener misiones entregadas de un usuario
   */
  const getMisionesEntregadas = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await misionActivaRepository.getEntregadasByUserId(userId);
      return data;
    } catch (err) {
      setError((err as Error).message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Actualizar capture_now
   */
  const updateCaptureNow = useCallback(async (misionActivaId: string, value: string) => {
    try {
      const data = await misionActivaRepository.updateCaptureNow(misionActivaId, value);
      if (data) {
        setMisionActiva(data);
      }
      return data;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, []);

  /**
   * Suscribirse a cambios en tiempo real
   */
  const subscribeToMisionActiva = useCallback((
    misionActivaId: string,
    onUpdate: (misionActiva: MisionActiva) => void
  ) => {
    return misionActivaRepository.subscribeToMisionActiva(misionActivaId, onUpdate);
  }, []);

  /**
   * Suscribirse a cambios en tiempo real por tipo y referencia
   */
  const subscribeToMisionActivaByReferencia = useCallback((
    tipo: 'mision' | 'actividad',
    idReferencia: number,
    onUpdate: (misionActiva: MisionActiva | null) => void
  ) => {
    return misionActivaRepository.subscribeToMisionActivaByReferencia(tipo, idReferencia, onUpdate);
  }, []);

  /**
   * Verificar y actualizar misiones inactivas (sin capturas en más de 6 minutos)
   */
  const verificarMisionesInactivas = useCallback(async () => {
    try {
      const actualizadas = await misionActivaRepository.verificarYActualizarMisionesInactivas();
      return actualizadas;
    } catch (err) {
      setError((err as Error).message);
      return 0;
    }
  }, []);

  return {
    misionActiva,
    loading,
    error,
    loadMisionActiva,
    createMisionActiva,
    updateRunningState,
    addCaptureUrl,
    submitEntrega,
    getOrCreateMisionActiva,
    getMisionesEntregadas,
    updateCaptureNow,
    subscribeToMisionActiva,
    subscribeToMisionActivaByReferencia,
    verificarMisionesInactivas
  };
};
