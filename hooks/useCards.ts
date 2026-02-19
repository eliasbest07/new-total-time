import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseCardRepository } from '@/infrastructure/datasource/SupabaseCardRepository';
import { CardDB, CreateCardDTO, UpdateCardDTO } from '@/domain/entities/Card';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { useCardDataCache } from '@/application/pizarra/hooks/useCardDataCache';

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
  togglePersistent: (cardId: string, isPersistent: boolean) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Hook para cargar y gestionar las cards de una pizarra.
 * Incluye suscripción en tiempo real a cambios.
 * También carga cards persistentes del usuario de otras pizarras.
 * @param idPizarra - ID de la pizarra
 * @param currentUserId - ID del usuario actual (quien hace los cambios) - opcional
 * @param pizarraOwnerId - ID del dueño de la pizarra - opcional
 * @param skipInitialLoad - Si es true, no carga cards automáticamente al montar (para local-first)
 * @param idProyectoFilter - En pizarras de organización, filtra cards por proyecto (null = pizarra base)
 */
export const useCards = (
  idPizarra: string | null,
  currentUserId?: string | null,
  pizarraOwnerId?: string | null,
  skipInitialLoad: boolean = false,
  idProyectoFilter?: number | null
): UseCardsReturn => {
  const [cards, setCards] = useState<CardDB[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardRepository = useRef(new SupabaseCardRepository());
  const { loadPersistentCards, savePersistentCards } = useCardDataCache();

  // Nota: El envío de mensajes de actualización se maneja en saveToSupabase de pizarra.tsx
  // Los parámetros currentUserId y pizarraOwnerId se mantienen por compatibilidad pero no se usan aquí

  // Función para cargar las cards (incluye persistentes de otras pizarras)
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
      // Cargar cards de la pizarra actual
      const cardsData = await cardRepository.current.getCardsByPizarra(idPizarra, idProyectoFilter);
      console.log(`🃏 Cards de pizarra actual: ${cardsData.length}`);

      // Cargar cards persistentes de otras pizarras del usuario
      let allCards = cardsData;
      console.log(`🔍 currentUserId para buscar persistentes: ${currentUserId}`);
      if (currentUserId) {
        // Intentar cargar desde caché primero
        let persistentCards = loadPersistentCards(currentUserId);

        if (persistentCards === null) {
          // Si no hay caché, cargar desde BD
          console.log('🔍 [CARD-CACHE] No hay caché de cards persistentes, cargando desde BD...');
          persistentCards = await cardRepository.current.getPersistentCardsByUser(currentUserId, idPizarra);

          // Guardar en caché para próximas cargas
          if (persistentCards.length > 0) {
            savePersistentCards(persistentCards, currentUserId);
          }
        } else {
          console.log(`✅ [CARD-CACHE] Cards persistentes cargadas desde caché: ${persistentCards.length}`);
          // Filtrar las que no sean de la pizarra actual (esto ya está implementado en el repositorio)
          persistentCards = persistentCards.filter(c => c.id_pizarra !== idPizarra);
        }

        console.log(`📌 Cards persistentes encontradas: ${persistentCards.length}`);
        if (persistentCards.length > 0) {
          // Combinar cards, evitando duplicados por card_id
          const existingCardIds = new Set(cardsData.map(c => c.card_id));
          const uniquePersistentCards = persistentCards.filter(c => !existingCardIds.has(c.card_id));
          allCards = [...cardsData, ...uniquePersistentCards];
          console.log(`📌 Cargadas ${uniquePersistentCards.length} cards persistentes de otras pizarras`);
        }
      } else {
        console.log('⚠️ No hay currentUserId, no se buscan cards persistentes');
      }

      setCards(allCards);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar cards';
      console.error('❌ Error cargando cards:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [idPizarra, currentUserId, idProyectoFilter]);

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

  // Función para toggle persistencia de una card
  const togglePersistent = useCallback(async (cardId: string, isPersistent: boolean): Promise<boolean> => {
    if (!idPizarra) {
      console.log('⚠️ No hay idPizarra para toggle persistent');
      return false;
    }

    try {
      console.log(`📌 Intentando ${isPersistent ? 'persistir' : 'despersistir'} card: ${cardId} en pizarra: ${idPizarra}`);
      const resultado = await cardRepository.current.togglePersistent(idPizarra, cardId, isPersistent);
      console.log(`📌 Resultado de togglePersistent: ${resultado}`);
      if (resultado) {
        // Actualizar el estado local
        setCards(prev => prev.map(c =>
          c.card_id === cardId ? { ...c, is_persistent: isPersistent } : c
        ));
      }
      return resultado;
    } catch (err) {
      console.error('❌ Error actualizando persistencia:', err);
      return false;
    }
  }, [idPizarra]);

  // Cargar cards inicialmente (si no se salta la carga inicial)
  useEffect(() => {
    if (!skipInitialLoad) {
      loadCards();
    }
  }, [loadCards, skipInitialLoad]);

  // Suscripción en tiempo real (deshabilitada si skipInitialLoad)
  useEffect(() => {
    if (!idPizarra || skipInitialLoad) return;

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
          // En pizarras de organización, ignorar eventos de otros proyectos
          if (idProyectoFilter !== undefined) {
            const row = (payload.new || payload.old) as { id_proyecto?: number | null } | null;
            const rowProjectId = row?.id_proyecto ?? null;
            if (rowProjectId !== idProyectoFilter) {
              return;
            }
          }

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
  }, [idPizarra, skipInitialLoad, idProyectoFilter]);

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
    togglePersistent,
    refetch: loadCards
  };
};
