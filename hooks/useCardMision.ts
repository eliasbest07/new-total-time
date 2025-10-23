import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseCardMisionRepository } from '@/infrastructure/datasource/SupabaseCardMisionRepository';
import { CardMision, CreateCardMisionDTO, UpdateCardMisionDTO } from '@/domain/entities/CardMision';
import { supabase } from '@/infrastructure/services/SupabaseClient';

interface UseCardMisionReturn {
  cardMision: CardMision | null;
  loading: boolean;
  error: string | null;
  create: (cardMision: CreateCardMisionDTO) => Promise<CardMision | null>;
  update: (updates: UpdateCardMisionDTO) => Promise<CardMision | null>;
  deleteCardMision: () => Promise<boolean>;
  updateRunningState: (isRunning: boolean) => Promise<CardMision | null>;
  updateLastCapture: (lastCaptureUrl: string) => Promise<CardMision | null>;
  refetch: () => Promise<void>;
}

/**
 * Hook para cargar y gestionar los datos de misión de una card.
 * Incluye suscripción en tiempo real a cambios.
 */
export const useCardMision = (idCard: string | null): UseCardMisionReturn => {
  const [cardMision, setCardMision] = useState<CardMision | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardMisionRepository = useRef(new SupabaseCardMisionRepository());

  // Función para cargar los datos de misión
  const loadCardMision = useCallback(async () => {
    if (!idCard) {
      // console.log('⚠️ Sin ID de card, no se pueden cargar datos de misión');
      setCardMision(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // console.log('🎯 Cargando datos de misión para card:', idCard);
      const data = await cardMisionRepository.current.getByCardId(idCard);
      setCardMision(data);
      if (data) {
        // console.log('✅ Datos de misión cargados exitosamente');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar datos de misión';
      console.error('❌ Error cargando datos de misión:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [idCard]);

  // Función para crear datos de misión
  const create = useCallback(async (cardMisionData: CreateCardMisionDTO): Promise<CardMision | null> => {
    if (!idCard) {
      console.error('❌ No hay card para crear datos de misión');
      return null;
    }

    try {
      const nuevaCardMision = await cardMisionRepository.current.create(cardMisionData);
      if (nuevaCardMision) {
        // La actualización se manejará via realtime
        // console.log('✅ Datos de misión creados');
      }
      return nuevaCardMision;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creando datos de misión';
      console.error('❌ Error creando datos de misión:', errorMessage);
      setError(errorMessage);
      return null;
    }
  }, [idCard]);

  // Función para actualizar datos de misión
  const update = useCallback(async (updates: UpdateCardMisionDTO): Promise<CardMision | null> => {
    if (!idCard) {
      console.error('❌ No hay card para actualizar');
      return null;
    }

    try {
      const cardMisionActualizada = await cardMisionRepository.current.update(idCard, updates);
      if (cardMisionActualizada) {
        // La actualización se manejará via realtime
        // console.log('✅ Datos de misión actualizados');
      }
      return cardMisionActualizada;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando datos de misión';
      console.error('❌ Error actualizando datos de misión:', errorMessage);
      setError(errorMessage);
      return null;
    }
  }, [idCard]);

  // Función para eliminar datos de misión
  const deleteCardMision = useCallback(async (): Promise<boolean> => {
    if (!idCard) {
      console.error('❌ No hay card para eliminar');
      return false;
    }

    try {
      const eliminada = await cardMisionRepository.current.delete(idCard);
      if (eliminada) {
        setCardMision(null);
        // console.log('✅ Datos de misión eliminados');
      }
      return eliminada;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error eliminando datos de misión';
      console.error('❌ Error eliminando datos de misión:', errorMessage);
      setError(errorMessage);
      return false;
    }
  }, [idCard]);

  // Función para actualizar estado de ejecución
  const updateRunningState = useCallback(async (isRunning: boolean): Promise<CardMision | null> => {
    if (!idCard) return null;

    try {
      return await cardMisionRepository.current.updateRunningState(idCard, isRunning);
    } catch (err) {
      console.error('❌ Error actualizando estado:', err);
      return null;
    }
  }, [idCard]);

  // Función para actualizar última captura
  const updateLastCapture = useCallback(async (lastCaptureUrl: string): Promise<CardMision | null> => {
    if (!idCard) return null;

    try {
      return await cardMisionRepository.current.updateLastCapture(idCard, lastCaptureUrl);
    } catch (err) {
      console.error('❌ Error actualizando captura:', err);
      return null;
    }
  }, [idCard]);

  // Cargar datos inicialmente
  useEffect(() => {
    loadCardMision();
  }, [loadCardMision]);

  // Suscripción en tiempo real
  useEffect(() => {
    if (!idCard) return;

    // console.log('📡 Configurando suscripción realtime para datos de misión de card:', idCard);

    const channel = supabase
      .channel(`card-mision-${idCard}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'card_misiones',
          filter: `id_card=eq.${idCard}`
        },
        async (payload) => {
          // console.log('📡 Cambio detectado en datos de misión:', payload.eventType);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const cardMisionActualizada = payload.new as CardMision;
            setCardMision(cardMisionActualizada);
          } else if (payload.eventType === 'DELETE') {
            setCardMision(null);
          }
        }
      )
      .subscribe();

    // console.log('✅ Suscripción realtime configurada');

    return () => {
      // console.log('🧹 Limpiando suscripción realtime de datos de misión');
      supabase.removeChannel(channel);
    };
  }, [idCard]);

  return {
    cardMision,
    loading,
    error,
    create,
    update,
    deleteCardMision,
    updateRunningState,
    updateLastCapture,
    refetch: loadCardMision
  };
};
