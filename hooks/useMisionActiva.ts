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
    try {
      const data = await misionActivaRepository.addCaptureUrl(misionActivaId, captureUrl);
      setMisionActiva(data);
      return data;
    } catch (err) {
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
    // Intentar obtener primero por tipo + referencia + usuario
    let mision = await misionActivaRepository.getByTipoAndReferencia(
      createDto.tipo,
      createDto.id_referencia,
      createDto.id_usuario_asignado
    );

    // Si no existe, crear
    if (!mision) {
      mision = await misionActivaRepository.create(createDto);
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
    getMisionesEntregadas
  };
};
