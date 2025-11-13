import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { CardOrganizacion } from '@/domain/entities/CardOrganizacion';
import {
  SupabaseCardOrganizacionRepository,
  CreateCardOrganizacionDTO,
  UpdateCardOrganizacionDTO
} from '@/infrastructure/datasource/SupabaseCardOrganizacionRepository';
import { retrySupabaseOperation } from '@/utils/retryWithBackoff';

/**
 * Hook para manejar las cards de la pizarra de organización.
 * Incluye suscripción en tiempo real para sincronización entre usuarios.
 *
 * @param idPizarraOrganizacion - ID de la pizarra de organización
 * @returns Estado de las cards y funciones CRUD
 */
export const useCardsOrganizacion = (idPizarraOrganizacion: string | null) => {
  const [cards, setCards] = useState<CardOrganizacion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const repository = new SupabaseCardOrganizacionRepository();

  /**
   * Carga todas las cards de la pizarra
   */
  const loadCards = useCallback(async () => {
    if (!idPizarraOrganizacion) {
      console.log('🃏 [useCardsOrg] No hay ID de pizarra');
      setLoading(false);
      setCards([]);
      return;
    }

    try {
      console.log('🃏 [useCardsOrg] Cargando cards para pizarra:', idPizarraOrganizacion);
      setLoading(true);
      setError(null);

      const cardsData = await retrySupabaseOperation(
        () => repository.getCardsByPizarra(idPizarraOrganizacion),
        'Cargar cards de organización'
      );

      console.log('✅ [useCardsOrg] Cards cargadas:', cardsData.length);
      setCards(cardsData);
    } catch (err) {
      console.error('❌ [useCardsOrg] Error cargando cards:', err);
      setError('Error al cargar las cards');
    } finally {
      setLoading(false);
    }
  }, [idPizarraOrganizacion]);

  /**
   * Crea una nueva card
   */
  const createCard = useCallback(async (card: CreateCardOrganizacionDTO) => {
    try {
      console.log('➕ [useCardsOrg] Creando card:', card.card_id);

      const newCard = await retrySupabaseOperation(
        () => repository.createCard(card),
        'Crear card de organización'
      );

      if (newCard) {
        console.log('✅ [useCardsOrg] Card creada:', newCard.id);
        setCards(prev => [...prev, newCard]);
        return newCard;
      }

      return null;
    } catch (err) {
      console.error('❌ [useCardsOrg] Error creando card:', err);
      return null;
    }
  }, []);

  /**
   * Actualiza una card existente
   */
  const updateCard = useCallback(async (
    cardId: string,
    updates: UpdateCardOrganizacionDTO
  ) => {
    if (!idPizarraOrganizacion) return null;

    try {
      console.log('✏️ [useCardsOrg] Actualizando card:', cardId);

      const updatedCard = await retrySupabaseOperation(
        () => repository.updateCard(idPizarraOrganizacion, cardId, updates),
        'Actualizar card de organización'
      );

      if (updatedCard) {
        console.log('✅ [useCardsOrg] Card actualizada');
        setCards(prev =>
          prev.map(c => (c.cardId === cardId ? updatedCard : c))
        );
        return updatedCard;
      }

      return null;
    } catch (err) {
      console.error('❌ [useCardsOrg] Error actualizando card:', err);
      return null;
    }
  }, [idPizarraOrganizacion]);

  /**
   * Actualiza la posición de una card
   */
  const updateCardPosition = useCallback(async (
    cardId: string,
    x: number,
    y: number
  ) => {
    return updateCard(cardId, { x, y });
  }, [updateCard]);

  /**
   * Actualiza el tamaño de una card
   */
  const updateCardSize = useCallback(async (
    cardId: string,
    width: number,
    height: number
  ) => {
    return updateCard(cardId, { width, height });
  }, [updateCard]);

  /**
   * Elimina una card
   */
  const deleteCard = useCallback(async (cardId: string) => {
    if (!idPizarraOrganizacion) return false;

    try {
      console.log('🗑️ [useCardsOrg] Eliminando card:', cardId);

      const success = await retrySupabaseOperation(
        () => repository.deleteCard(idPizarraOrganizacion, cardId),
        'Eliminar card de organización'
      );

      if (success) {
        console.log('✅ [useCardsOrg] Card eliminada');
        setCards(prev => prev.filter(c => c.cardId !== cardId));
        return true;
      }

      return false;
    } catch (err) {
      console.error('❌ [useCardsOrg] Error eliminando card:', err);
      return false;
    }
  }, [idPizarraOrganizacion]);

  /**
   * Refresca las cards desde la base de datos
   */
  const refetch = useCallback(async () => {
    await loadCards();
  }, [loadCards]);

  // Cargar cards al montar o cuando cambie el ID de pizarra
  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Suscripción en tiempo real a cambios en las cards
  useEffect(() => {
    if (!idPizarraOrganizacion) return;

    console.log('🔔 [useCardsOrg] Suscribiendo a cambios en tiempo real...');

    const channel = supabase
      .channel(`cards-org-${idPizarraOrganizacion}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards_organizacion',
          filter: `id_pizarra_organizacion=eq.${idPizarraOrganizacion}`
        },
        (payload) => {
          console.log('🔔 [useCardsOrg] Cambio detectado:', payload.eventType);

          if (payload.eventType === 'INSERT') {
            const newCard = payload.new as any;
            setCards(prev => {
              // Evitar duplicados
              if (prev.find(c => c.id === newCard.id)) {
                return prev;
              }
              return [...prev, {
                id: newCard.id,
                idPizarraOrganizacion: newCard.id_pizarra_organizacion,
                cardId: newCard.card_id,
                type: newCard.type,
                title: newCard.title,
                content: newCard.content,
                x: newCard.x,
                y: newCard.y,
                width: newCard.width,
                height: newCard.height,
                fontSize: newCard.font_size,
                zIndex: newCard.z_index,
                color: newCard.color,
                metadata: newCard.metadata,
                createdAt: newCard.created_at,
                updatedAt: newCard.updated_at
              }];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedCard = payload.new as any;
            setCards(prev =>
              prev.map(c =>
                c.id === updatedCard.id
                  ? {
                      id: updatedCard.id,
                      idPizarraOrganizacion: updatedCard.id_pizarra_organizacion,
                      cardId: updatedCard.card_id,
                      type: updatedCard.type,
                      title: updatedCard.title,
                      content: updatedCard.content,
                      x: updatedCard.x,
                      y: updatedCard.y,
                      width: updatedCard.width,
                      height: updatedCard.height,
                      fontSize: updatedCard.font_size,
                      zIndex: updatedCard.z_index,
                      color: updatedCard.color,
                      metadata: updatedCard.metadata,
                      createdAt: updatedCard.created_at,
                      updatedAt: updatedCard.updated_at
                    }
                  : c
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedCard = payload.old as any;
            setCards(prev => prev.filter(c => c.id !== deletedCard.id));
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 [useCardsOrg] Desuscribiendo de cambios en tiempo real');
      supabase.removeChannel(channel);
    };
  }, [idPizarraOrganizacion]);

  return {
    cards,
    loading,
    error,
    createCard,
    updateCard,
    updateCardPosition,
    updateCardSize,
    deleteCard,
    refetch
  };
};
