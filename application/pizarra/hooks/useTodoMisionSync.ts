/**
 * useTodoMisionSync.ts
 *
 * Hook para sincronizar tareas entre TodoCard y MisionCard conectados.
 * Centraliza toda la lógica de eventos y sincronización bidireccional.
 */

import { useEffect, useCallback } from 'react';
import { Card, Connection } from '../types';
import {
  Todo,
  TodoList,
  todosToSubtareas,
  toggleTodoCompleted,
  removeTodoFromList,
  updateTodoInList
} from '@/domain/entities/Todo';
import { supabase } from '@/infrastructure/services/SupabaseClient';

// Tipos de eventos personalizados
export interface MisionTodoToggleEvent {
  misionCardId: string;
  todoId: number;
  completed: boolean;
}

export interface MisionTodoDeleteEvent {
  misionCardId: string;
  todoId: number;
}

export interface TodoActualizadoEvent {
  cardId: string;
  card: Card;
}

export interface ConexionEliminadaEvent {
  type: 'todo-mision';
  todoCard: Card;
  misionCard: Card;
  misionId?: string;
}

// Utilidad para verificar si un ID es UUID
export const isUUID = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// Encontrar TodoCard conectado a un MisionCard
export function findConnectedTodoCard(
  misionCardId: string,
  connections: Connection[],
  cards: Card[]
): Card | null {
  const conexion = connections.find(conn =>
    conn.from === misionCardId || conn.to === misionCardId
  );

  if (!conexion) return null;

  const todoCardId = conexion.from === misionCardId ? conexion.to : conexion.from;
  return cards.find(c => c.id === todoCardId && c.type === 'todo') || null;
}

// Encontrar MisionCard conectado a un TodoCard
export function findConnectedMisionCard(
  todoCardId: string,
  connections: Connection[],
  cards: Card[]
): Card | null {
  const conexion = connections.find(conn =>
    conn.from === todoCardId || conn.to === todoCardId
  );

  if (!conexion) return null;

  const misionCardId = conexion.from === todoCardId ? conexion.to : conexion.from;
  return cards.find(c =>
    c.id === misionCardId &&
    (c.type === 'mision' || c.type === 'mision-organizacion')
  ) || null;
}

// Persistir toggle en BD
async function persistToggleToBD(todoCardId: string, todoId: number, completed: boolean): Promise<void> {
  if (!isUUID(todoCardId)) return;

  try {
    await supabase
      .from('card_todos')
      .update({ completed })
      .eq('id_card', todoCardId)
      .eq('todo_id', todoId);
  } catch (error) {
    console.error('Error actualizando todo en BD:', error);
  }
}

// Persistir delete en BD
async function persistDeleteToBD(todoCardId: string, todoId: number): Promise<void> {
  if (!isUUID(todoCardId)) return;

  try {
    await supabase
      .from('card_todos')
      .delete()
      .eq('id_card', todoCardId)
      .eq('todo_id', todoId);
  } catch (error) {
    console.error('Error eliminando todo de BD:', error);
  }
}

interface UseTodoMisionSyncParams {
  cards: Card[];
  connections: Connection[];
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
}

/**
 * Hook que maneja la sincronización bidireccional entre TodoCard y MisionCard
 */
export function useTodoMisionSync({ cards, connections, setCards }: UseTodoMisionSyncParams) {

  // Handler: Toggle desde MisionCard → actualizar TodoCard
  const handleMisionTodoToggle = useCallback(async (event: CustomEvent<MisionTodoToggleEvent>) => {
    const { misionCardId, todoId, completed } = event.detail;

    const todoCard = findConnectedTodoCard(misionCardId, connections, cards);
    if (!todoCard) return;

    // Actualizar estado local del TodoCard
    setCards(prev => prev.map(card => {
      if (card.id === todoCard.id && card.todos) {
        const updatedTodos = toggleTodoCompleted(
          card.todos as TodoList,
          todoId
        );
        // Forzar el estado completed específico (no toggle)
        return {
          ...card,
          todos: updateTodoInList(card.todos as TodoList, todoId, { completed })
        };
      }
      return card;
    }));

    // Persistir en BD
    await persistToggleToBD(todoCard.id, todoId, completed);
  }, [connections, cards, setCards]);

  // Handler: Delete desde MisionCard → actualizar TodoCard
  const handleMisionTodoDelete = useCallback(async (event: CustomEvent<MisionTodoDeleteEvent>) => {
    const { misionCardId, todoId } = event.detail;

    const todoCard = findConnectedTodoCard(misionCardId, connections, cards);
    if (!todoCard) return;

    // Actualizar estado local
    setCards(prev => prev.map(card => {
      if (card.id === todoCard.id && card.todos) {
        return {
          ...card,
          todos: removeTodoFromList(card.todos as TodoList, todoId)
        };
      }
      return card;
    }));

    // Persistir en BD
    await persistDeleteToBD(todoCard.id, todoId);
  }, [connections, cards, setCards]);

  // Handler: Cambio en TodoCard → actualizar MisionCard
  const handleTodoActualizado = useCallback((event: CustomEvent<TodoActualizadoEvent>) => {
    const { cardId: todoCardId, card: updatedTodoCard } = event.detail;

    const misionCard = findConnectedMisionCard(todoCardId, connections, cards);
    if (!misionCard) return;

    // Convertir todos a subtareas usando la entidad Todo
    const subtareasActualizadas = todosToSubtareas(updatedTodoCard.todos as TodoList || []);

    setCards(prev => prev.map(card => {
      if (card.id === misionCard.id && card.misionData) {
        return {
          ...card,
          misionData: {
            ...card.misionData,
            subtareas: subtareasActualizadas
          }
        };
      }
      return card;
    }));
  }, [connections, cards, setCards]);

  // Handler: Conexión eliminada → limpiar MisionCard
  const handleConexionEliminada = useCallback((event: CustomEvent<ConexionEliminadaEvent>) => {
    const { type, misionCard } = event.detail;

    if (type === 'todo-mision' && misionCard) {
      setCards(prev => prev.map(card => {
        if (card.id === misionCard.id && card.misionData) {
          return {
            ...card,
            misionData: {
              ...card.misionData,
              subtareas: [],
              card_todos: []
            }
          };
        }
        return card;
      }));
    }
  }, [setCards]);

  // Registrar event listeners
  useEffect(() => {
    window.addEventListener('mision-todo-toggle', handleMisionTodoToggle as EventListener);
    window.addEventListener('mision-todo-delete', handleMisionTodoDelete as EventListener);
    window.addEventListener('todo-actualizado', handleTodoActualizado as EventListener);
    window.addEventListener('conexion-eliminada', handleConexionEliminada as EventListener);

    return () => {
      window.removeEventListener('mision-todo-toggle', handleMisionTodoToggle as EventListener);
      window.removeEventListener('mision-todo-delete', handleMisionTodoDelete as EventListener);
      window.removeEventListener('todo-actualizado', handleTodoActualizado as EventListener);
      window.removeEventListener('conexion-eliminada', handleConexionEliminada as EventListener);
    };
  }, [handleMisionTodoToggle, handleMisionTodoDelete, handleTodoActualizado, handleConexionEliminada]);

  return {
    findConnectedTodoCard,
    findConnectedMisionCard
  };
}

// Funciones para emitir eventos (usar desde componentes)
export const emitMisionTodoToggle = (detail: MisionTodoToggleEvent) => {
  window.dispatchEvent(new CustomEvent('mision-todo-toggle', { detail }));
};

export const emitMisionTodoDelete = (detail: MisionTodoDeleteEvent) => {
  window.dispatchEvent(new CustomEvent('mision-todo-delete', { detail }));
};

export const emitTodoActualizado = (detail: TodoActualizadoEvent) => {
  window.dispatchEvent(new CustomEvent('todo-actualizado', { detail }));
};

export const emitConexionEliminada = (detail: ConexionEliminadaEvent) => {
  window.dispatchEvent(new CustomEvent('conexion-eliminada', { detail }));
};

export const emitConexionCreada = (detail: {
  type: 'todo-mision';
  todoCard: Card;
  misionCard: Card;
  todoCardUUID: string;
  misionId?: string;
}) => {
  window.dispatchEvent(new CustomEvent('conexion-creada', { detail }));
};
