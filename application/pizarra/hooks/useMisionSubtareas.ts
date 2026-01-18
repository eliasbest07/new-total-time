/**
 * useMisionSubtareas.ts
 *
 * Hook para manejar las subtareas de una MisionCard usando la entidad Todo.
 * Centraliza la lógica de sincronización con BD y eventos.
 */

import { useCallback, useRef, useEffect } from 'react';
import { Card, MisionData, SubtareaMision } from '../types';
import {
  Todo,
  TodoList,
  cardTodosToTodoList,
  todosToSubtareas,
  subtareasToTodos,
  getNextTodoId,
  toggleTodoCompleted,
  removeTodoFromList,
  addTodoToList
} from '@/domain/entities/Todo';
import { CardTodo } from '@/domain/entities/CardTodo';
import { emitMisionTodoToggle, emitMisionTodoDelete } from './useTodoMisionSync';

interface UseMisionSubtareasParams {
  cardId: string;
  misionData: MisionData;
  tareasBD: CardTodo[] | null;
  updateCard: (cardId: string, updates: Partial<Omit<Card, 'misionData'>> & { misionData?: Partial<MisionData> }) => void;
  toggleCompletedBD?: (id: string, completed: boolean) => Promise<void>;
  deleteTodoBD?: (id: string) => Promise<void>;
  createTodoBD?: (data: any) => Promise<any>;
}

/**
 * Hook que maneja las subtareas de una MisionCard
 */
export function useMisionSubtareas({
  cardId,
  misionData,
  tareasBD,
  updateCard,
  toggleCompletedBD,
  deleteTodoBD,
  createTodoBD
}: UseMisionSubtareasParams) {
  // Ref para ignorar realtime después de desconectar
  const ignorarRealtimeHasta = useRef<number>(0);

  // Obtener subtareas actuales como TodoList
  const getTodosFromSubtareas = useCallback((): TodoList => {
    return subtareasToTodos(misionData.subtareas || []);
  }, [misionData.subtareas]);

  // Actualizar subtareas en el card
  const updateSubtareas = useCallback((todos: TodoList) => {
    updateCard(cardId, {
      misionData: {
        ...misionData,
        subtareas: todosToSubtareas(todos)
      }
    });
  }, [cardId, misionData, updateCard]);

  // Sincronizar desde BD
  const syncFromBD = useCallback(() => {
    if (Date.now() < ignorarRealtimeHasta.current) return;

    if (tareasBD && tareasBD.length > 0 && misionData.card_todos?.length) {
      const todosFromBD = cardTodosToTodoList(tareasBD);
      const subtareasDesdeDB = todosToSubtareas(todosFromBD);

      const subtareasActuales = misionData.subtareas || [];
      const sonDiferentes = JSON.stringify(subtareasActuales) !== JSON.stringify(subtareasDesdeDB);

      if (sonDiferentes) {
        updateCard(cardId, {
          misionData: {
            ...misionData,
            subtareas: subtareasDesdeDB
          }
        });
      }
    }
  }, [tareasBD, misionData, cardId, updateCard]);

  // Toggle subtarea
  const handleToggle = useCallback(async (subtareaId: string) => {
    const todos = getTodosFromSubtareas();
    const todoId = parseInt(subtareaId, 10);
    const todo = todos.find(t => t.id === todoId);

    if (!todo) return;

    const nuevoCompleted = !todo.completed;

    // Actualizar UI inmediatamente
    const todosActualizados = toggleTodoCompleted(todos, todoId);
    updateSubtareas(todosActualizados);

    // Emitir evento para sincronizar TodoCard conectado
    emitMisionTodoToggle({
      misionCardId: cardId,
      todoId,
      completed: nuevoCompleted
    });

    // Persistir en BD si hay conexión
    if (misionData.card_todos?.length && tareasBD?.length && toggleCompletedBD) {
      const tareaBD = tareasBD.find(t => t.todo_id === todoId);
      if (tareaBD) {
        await toggleCompletedBD(tareaBD.id, nuevoCompleted);
      }
    }
  }, [getTodosFromSubtareas, updateSubtareas, cardId, misionData.card_todos, tareasBD, toggleCompletedBD]);

  // Eliminar subtarea
  const handleDelete = useCallback(async (subtareaId: string) => {
    const todos = getTodosFromSubtareas();
    const todoId = parseInt(subtareaId, 10);

    // Actualizar UI inmediatamente
    const todosActualizados = removeTodoFromList(todos, todoId);
    updateSubtareas(todosActualizados);

    // Emitir evento para sincronizar TodoCard conectado
    emitMisionTodoDelete({
      misionCardId: cardId,
      todoId
    });

    // Persistir en BD si hay conexión
    if (misionData.card_todos?.length && tareasBD?.length && deleteTodoBD) {
      const tareaBD = tareasBD.find(t => t.todo_id === todoId);
      if (tareaBD) {
        await deleteTodoBD(tareaBD.id);
      }
    }
  }, [getTodosFromSubtareas, updateSubtareas, cardId, misionData.card_todos, tareasBD, deleteTodoBD]);

  // Agregar subtarea
  const handleAdd = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const todos = getTodosFromSubtareas();

    // Si hay card_todos conectado, crear en BD
    if (misionData.card_todos?.length && createTodoBD) {
      const cardTodoId = misionData.card_todos[0];
      const nextId = getNextTodoId(todos);

      const nuevaTarea = await createTodoBD({
        id_card: cardTodoId,
        todo_id: nextId,
        text: text.trim(),
        completed: false,
        position: nextId - 1
      });

      if (nuevaTarea) {
        // La sincronización con BD actualizará las subtareas
        return;
      }
    }

    // Si no hay card_todos, usar método local
    const nuevoTodo: Todo = {
      id: Date.now(), // ID temporal
      text: text.trim(),
      completed: false
    };

    const todosActualizados = addTodoToList(todos, nuevoTodo);
    updateSubtareas(todosActualizados);
  }, [getTodosFromSubtareas, updateSubtareas, misionData.card_todos, createTodoBD]);

  // Bloquear sincronización temporalmente (usado al desconectar)
  const blockSync = useCallback((durationMs: number = 5000) => {
    ignorarRealtimeHasta.current = Date.now() + durationMs;
  }, []);

  // Desbloquear sincronización
  const unblockSync = useCallback(() => {
    ignorarRealtimeHasta.current = 0;
  }, []);

  // Limpiar subtareas (usado al desconectar)
  const clearSubtareas = useCallback(() => {
    updateCard(cardId, {
      misionData: {
        subtareas: [],
        card_todos: []
      }
    });
  }, [cardId, updateCard]);

  // Efecto para sincronizar desde BD cuando cambian las tareas
  useEffect(() => {
    syncFromBD();
  }, [tareasBD, misionData.card_todos]);

  return {
    subtareas: misionData.subtareas || [],
    handleToggle,
    handleDelete,
    handleAdd,
    syncFromBD,
    blockSync,
    unblockSync,
    clearSubtareas,
    isBlocked: () => Date.now() < ignorarRealtimeHasta.current
  };
}
