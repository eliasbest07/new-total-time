import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseCardRepository } from '@/infrastructure/datasource/SupabaseCardRepository';
import { CardDB, CreateCardDTO, UpdateCardDTO } from '@/domain/entities/Card';
import { supabase } from '@/infrastructure/services/SupabaseClient';

interface UseCardsReturn {
  cards: CardDB[];
  loading: boolean;
  error: string | null;
  createCard: (card: CreateCardDTO) => Promise<CardDB | null>;
  updateCard: (cardId: string, updates: UpdateCardDTO) => Promise<CardDB | null>;
  deleteCard: (cardId: string) => Promise<boolean>;
  updateCardPosition: (cardId: string, x: number, y: number) => Promise<CardDB | null>;
  updateCardSize: (cardId: string, width: number, height: number) => Promise<CardDB | null>;
  deleteAllCards: () => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Hook para cargar y gestionar las cards de una pizarra.
 * Incluye suscripción en tiempo real a cambios.
 * @param idPizarra - ID de la pizarra
 * @param currentUserId - ID del usuario actual (quien hace los cambios) - opcional
 * @param pizarraOwnerId - ID del dueño de la pizarra - opcional
 */
export const useCards = (idPizarra: string | null, currentUserId?: string | null, pizarraOwnerId?: string | null): UseCardsReturn => {
  const [cards, setCards] = useState<CardDB[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardRepository = useRef(new SupabaseCardRepository());

  // Nota: El envío de mensajes de actualización se maneja en saveToSupabase de pizarra.tsx
  // Los parámetros currentUserId y pizarraOwnerId se mantienen por compatibilidad pero no se usan aquí

  // Función para cargar las cards
  const loadCards = useCallback(async () => {
    if (!idPizarra) {
      // console.log('⚠️ Sin ID de pizarra, no se pueden cargar cards');
      setCards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // console.log('🃏 Cargando cards de pizarra:', idPizarra);
      const cardsData = await cardRepository.current.getCardsByPizarra(idPizarra);
      setCards(cardsData);
      // console.log('✅ Cards cargadas exitosamente:', cardsData.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar cards';
      console.error('❌ Error cargando cards:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [idPizarra]);

  // Función para crear una card
  const createCard = useCallback(async (card: CreateCardDTO): Promise<CardDB | null> => {
    if (!idPizarra) {
      console.error('❌ No hay pizarra para crear card');
      return null;
    }

    try {
      const nuevaCard = await cardRepository.current.createCard(card);
      return nuevaCard;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creando card';
      console.error('❌ Error creando card:', errorMessage);
      setError(errorMessage);
      return null;
    }
  }, [idPizarra]);

  // Función para actualizar una card
  const updateCard = useCallback(async (cardId: string, updates: UpdateCardDTO): Promise<CardDB | null> => {
    if (!idPizarra) {
      console.error('❌ No hay pizarra para actualizar card');
      return null;
    }

    try {
      const cardActualizada = await cardRepository.current.updateCard(idPizarra, cardId, updates);
      return cardActualizada;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando card';
      console.error('❌ Error actualizando card:', errorMessage);
      setError(errorMessage);
      return null;
    }
  }, [idPizarra]);

  // Función para eliminar una card
  const deleteCard = useCallback(async (cardId: string): Promise<boolean> => {
    if (!idPizarra) {
      console.error('❌ No hay pizarra para eliminar card');
      return false;
    }

    try {
      const eliminada = await cardRepository.current.deleteCard(idPizarra, cardId);
      return eliminada;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error eliminando card';
      console.error('❌ Error eliminando card:', errorMessage);
      setError(errorMessage);
      return false;
    }
  }, [idPizarra]);

  // Función para actualizar posición
  const updateCardPosition = useCallback(async (cardId: string, x: number, y: number): Promise<CardDB | null> => {
    if (!idPizarra) return null;

    try {
      return await cardRepository.current.updateCardPosition(idPizarra, cardId, x, y);
    } catch (err) {
      console.error('❌ Error actualizando posición:', err);
      return null;
    }
  }, [idPizarra]);

  // Función para actualizar tamaño
  const updateCardSize = useCallback(async (cardId: string, width: number, height: number): Promise<CardDB | null> => {
    if (!idPizarra) return null;

    try {
      return await cardRepository.current.updateCardSize(idPizarra, cardId, width, height);
    } catch (err) {
      console.error('❌ Error actualizando tamaño:', err);
      return null;
    }
  }, [idPizarra]);

  // Función para eliminar todas las cards
  const deleteAllCards = useCallback(async (): Promise<boolean> => {
    if (!idPizarra) return false;

    try {
      const eliminadas = await cardRepository.current.deleteAllCards(idPizarra);
      if (eliminadas) {
        setCards([]);
      }
      return eliminadas;
    } catch (err) {
      console.error('❌ Error eliminando todas las cards:', err);
      return false;
    }
  }, [idPizarra]);

  // Cargar cards inicialmente
  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Suscripción en tiempo real
  useEffect(() => {
    if (!idPizarra) return;

    // console.log('📡 Configurando suscripción realtime para cards de pizarra:', idPizarra);

    const channel = supabase
      .channel(`cards-pizarra-${idPizarra}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `id_pizarra=eq.${idPizarra}`
        },
        async (payload) => {
          // console.log('📡 Cambio detectado en cards:', payload.eventType);

          if (payload.eventType === 'INSERT') {
            const nuevaCard = payload.new as CardDB;
            setCards(prev => {
              const existe = prev.some(c => c.id === nuevaCard.id);
              if (existe) return prev;
              return [...prev, nuevaCard];
            });
          } else if (payload.eventType === 'UPDATE') {
            const cardActualizada = payload.new as CardDB;
            setCards(prev => prev.map(c => c.id === cardActualizada.id ? cardActualizada : c));
          } else if (payload.eventType === 'DELETE') {
            const cardEliminada = payload.old as CardDB;
            setCards(prev => prev.filter(c => c.id !== cardEliminada.id));
          }
        }
      )
      .subscribe();

    // console.log('✅ Suscripción realtime configurada');

    return () => {
      // console.log('🧹 Limpiando suscripción realtime de cards');
      supabase.removeChannel(channel);
    };
  }, [idPizarra]);

  return {
    cards,
    loading,
    error,
    createCard,
    updateCard,
    deleteCard,
    updateCardPosition,
    updateCardSize,
    deleteAllCards,
    refetch: loadCards
  };
};
