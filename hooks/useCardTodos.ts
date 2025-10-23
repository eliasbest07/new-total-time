import { useState, useEffect, useCallback, useRef } from 'react';
import { CardTodo, CreateCardTodoDTO, UpdateCardTodoDTO } from '@/domain/entities/CardTodo';
import { SupabaseCardTodoRepository } from '@/infrastructure/datasource/SupabaseCardTodoRepository';
import { supabase } from '@/infrastructure/services/SupabaseClient';

interface UseCardTodosReturn {
  todos: CardTodo[];
  loading: boolean;
  error: string | null;
  createTodo: (todo: CreateCardTodoDTO) => Promise<CardTodo | null>;
  updateTodo: (id: string, updates: UpdateCardTodoDTO) => Promise<CardTodo | null>;
  deleteTodo: (id: string) => Promise<boolean>;
  toggleCompleted: (id: string, completed: boolean) => Promise<CardTodo | null>;
  updatePosition: (id: string, position: number) => Promise<CardTodo | null>;
  reorderTodos: (todoIds: string[]) => Promise<boolean>;
  refreshTodos: () => Promise<void>;
}

export const useCardTodos = (idCard: string | null): UseCardTodosReturn => {
  const [todos, setTodos] = useState<CardTodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todoRepository = useRef(new SupabaseCardTodoRepository());

  // Cargar todos de la card
  const loadTodos = useCallback(async () => {
    if (!idCard) {
      setTodos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const todosData = await todoRepository.current.getByCardId(idCard);
      setTodos(todosData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar todos');
      console.error('Error loading todos:', err);
    } finally {
      setLoading(false);
    }
  }, [idCard]);

  // Cargar todos al montar o cuando cambie idCard
  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // Suscripción en tiempo real
  useEffect(() => {
    if (!idCard) return;

    const channel = supabase
      .channel(`card-todos-${idCard}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'card_todos',
          filter: `id_card=eq.${idCard}`
        },
        async (payload) => {
          // console.log('📡 Cambio en card_todos:', payload);

          if (payload.eventType === 'INSERT') {
            const nuevoTodo = payload.new as CardTodo;
            setTodos(prev => [...prev, nuevoTodo].sort((a, b) => a.position - b.position));
          } else if (payload.eventType === 'UPDATE') {
            const todoActualizado = payload.new as CardTodo;
            setTodos(prev =>
              prev.map(t => t.id === todoActualizado.id ? todoActualizado : t)
                .sort((a, b) => a.position - b.position)
            );
          } else if (payload.eventType === 'DELETE') {
            const todoEliminado = payload.old as CardTodo;
            setTodos(prev => prev.filter(t => t.id !== todoEliminado.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [idCard]);

  // Crear todo
  const createTodo = useCallback(async (todo: CreateCardTodoDTO): Promise<CardTodo | null> => {
    try {
      const nuevoTodo = await todoRepository.current.create(todo);
      if (nuevoTodo) {
        // La suscripción en tiempo real se encargará de actualizar el estado
        return nuevoTodo;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear todo');
      console.error('Error creating todo:', err);
      return null;
    }
  }, []);

  // Actualizar todo
  const updateTodo = useCallback(async (id: string, updates: UpdateCardTodoDTO): Promise<CardTodo | null> => {
    try {
      const todoActualizado = await todoRepository.current.update(id, updates);
      if (todoActualizado) {
        // La suscripción en tiempo real se encargará de actualizar el estado
        return todoActualizado;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar todo');
      console.error('Error updating todo:', err);
      return null;
    }
  }, []);

  // Eliminar todo
  const deleteTodo = useCallback(async (id: string): Promise<boolean> => {
    try {
      const resultado = await todoRepository.current.delete(id);
      // La suscripción en tiempo real se encargará de actualizar el estado
      return resultado;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar todo');
      console.error('Error deleting todo:', err);
      return false;
    }
  }, []);

  // Toggle completado
  const toggleCompleted = useCallback(async (id: string, completed: boolean): Promise<CardTodo | null> => {
    try {
      const todoActualizado = await todoRepository.current.toggleCompleted(id, completed);
      // La suscripción en tiempo real se encargará de actualizar el estado
      return todoActualizado;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado');
      console.error('Error toggling completed:', err);
      return null;
    }
  }, []);

  // Actualizar posición
  const updatePosition = useCallback(async (id: string, position: number): Promise<CardTodo | null> => {
    try {
      const todoActualizado = await todoRepository.current.updatePosition(id, position);
      // La suscripción en tiempo real se encargará de actualizar el estado
      return todoActualizado;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar posición');
      console.error('Error updating position:', err);
      return null;
    }
  }, []);

  // Reordenar todos
  const reorderTodos = useCallback(async (todoIds: string[]): Promise<boolean> => {
    if (!idCard) return false;

    try {
      const resultado = await todoRepository.current.reorderTodos(idCard, todoIds);
      // La suscripción en tiempo real se encargará de actualizar el estado
      return resultado;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reordenar todos');
      console.error('Error reordering todos:', err);
      return false;
    }
  }, [idCard]);

  // Refrescar todos manualmente
  const refreshTodos = useCallback(async (): Promise<void> => {
    await loadTodos();
  }, [loadTodos]);

  return {
    todos,
    loading,
    error,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleCompleted,
    updatePosition,
    reorderTodos,
    refreshTodos,
  };
};
