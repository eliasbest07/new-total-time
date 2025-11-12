import { useState, useEffect, useCallback, useRef } from 'react';
import { CardDB } from '@/domain/entities/Card';
import { CardTodo } from '@/domain/entities/CardTodo';
import { supabase } from '@/infrastructure/services/SupabaseClient';

interface CardWithTodos {
  card: CardDB;
  todos: CardTodo[];
}

interface UseMisionCardTodosReturn {
  cardTodos: CardWithTodos[];
  loading: boolean;
  error: string | null;
  refreshCardTodos: () => Promise<void>;
}

/**
 * Hook para cargar los card_todos de una misión
 * @param cardIds - Array de UUIDs de cards de tipo "todo"
 */
export const useMisionCardTodos = (cardIds: string[] | null | undefined): UseMisionCardTodosReturn => {
  const [cardTodos, setCardTodos] = useState<CardWithTodos[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar cards y sus todos
  const loadCardTodos = useCallback(async () => {
    if (!cardIds || cardIds.length === 0) {
      setCardTodos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📋 [useMisionCardTodos] Cargando cards y todos para:', cardIds);

      // Obtener todos los cards con sus todos en una sola consulta
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select(`
          *,
          card_todos (*)
        `)
        .in('id', cardIds);

      if (cardsError) {
        console.error('❌ Error obteniendo cards:', cardsError);
        setError(cardsError.message);
        setCardTodos([]);
        return;
      }

      // Transformar los datos
      const cardTodosData: CardWithTodos[] = (cardsData || []).map((card: any) => {
        // Ordenar los todos por position
        const todos = (card.card_todos || []) as CardTodo[];
        const sortedTodos = todos.sort((a, b) => a.position - b.position);

        return {
          card: card as CardDB,
          todos: sortedTodos
        };
      });

      console.log('✅ [useMisionCardTodos] Cards y todos cargados:', cardTodosData.length);
      setCardTodos(cardTodosData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar card_todos';
      console.error('❌ [useMisionCardTodos] Error:', errorMessage);
      setError(errorMessage);
      setCardTodos([]);
    } finally {
      setLoading(false);
    }
  }, [cardIds?.join(',')]);

  // Cargar datos al montar o cuando cambien los cardIds
  useEffect(() => {
    loadCardTodos();
  }, [loadCardTodos]);

  // Suscripción en tiempo real a cambios en los todos
  useEffect(() => {
    if (!cardIds || cardIds.length === 0) return;

    console.log('📡 [useMisionCardTodos] Suscribiendo a cambios en card_todos');

    const channel = supabase
      .channel(`mision-card-todos-${cardIds.join('-')}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'card_todos',
          filter: `id_card=in.(${cardIds.join(',')})`
        },
        async (payload) => {
          console.log('📡 [useMisionCardTodos] Cambio detectado en card_todos:', payload.eventType);
          // Recargar todos los datos cuando haya cambios
          await loadCardTodos();
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 [useMisionCardTodos] Desuscribiendo de cambios en card_todos');
      supabase.removeChannel(channel);
    };
  }, [cardIds?.join(','), loadCardTodos]);

  // Refrescar datos manualmente
  const refreshCardTodos = useCallback(async (): Promise<void> => {
    await loadCardTodos();
  }, [loadCardTodos]);

  return {
    cardTodos,
    loading,
    error,
    refreshCardTodos,
  };
};
