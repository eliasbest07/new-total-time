/**
 * Entidad de dominio para representar una tarea (Todo)
 * Esta es la representación canónica que se usa en toda la aplicación
 */
export interface Todo {
  id: number;           // ID secuencial dentro del contexto (todo_id en BD)
  text: string;
  completed: boolean;
  position?: number;
}

export type TodoList = Todo[];

/**
 * Subtarea de misión - alias para compatibilidad con el sistema de misiones
 */
export interface SubtareaMision {
  id: string;           // String para compatibilidad con el sistema actual
  text: string;
  completed: boolean;
}

// ============================================
// DTOs para operaciones
// ============================================

export type CreateTodoDTO = Omit<Todo, 'id'> & { id?: number };
export type UpdateTodoDTO = Partial<Omit<Todo, 'id'>>;

// ============================================
// Funciones de mapeo
// ============================================

import type { CardTodo } from './CardTodo';

/**
 * Convierte un CardTodo (BD) a Todo (dominio)
 */
export function cardTodoToTodo(cardTodo: CardTodo): Todo {
  return {
    id: cardTodo.todo_id,
    text: cardTodo.text,
    completed: cardTodo.completed,
    position: cardTodo.position
  };
}

/**
 * Convierte un array de CardTodo a TodoList
 */
export function cardTodosToTodoList(cardTodos: CardTodo[]): TodoList {
  return cardTodos
    .map(cardTodoToTodo)
    .sort((a, b) => (a.position ?? a.id) - (b.position ?? b.id));
}

/**
 * Convierte un Todo (dominio) a datos para crear CardTodo
 * Requiere el id_card para vincular a la card
 */
export function todoToCardTodoData(todo: Todo, idCard: string): Omit<CardTodo, 'id' | 'created_at' | 'updated_at'> {
  return {
    id_card: idCard,
    todo_id: todo.id,
    text: todo.text,
    completed: todo.completed,
    position: todo.position ?? todo.id - 1
  };
}

/**
 * Convierte un Todo a SubtareaMision (para misiones)
 */
export function todoToSubtarea(todo: Todo): SubtareaMision {
  return {
    id: todo.id.toString(),
    text: todo.text,
    completed: todo.completed
  };
}

/**
 * Convierte un array de Todo a array de SubtareaMision
 */
export function todosToSubtareas(todos: TodoList): SubtareaMision[] {
  return todos.map(todoToSubtarea);
}

/**
 * Convierte una SubtareaMision a Todo
 */
export function subtareaToTodo(subtarea: SubtareaMision, position?: number): Todo {
  return {
    id: parseInt(subtarea.id, 10),
    text: subtarea.text,
    completed: subtarea.completed,
    position
  };
}

/**
 * Convierte un array de SubtareaMision a TodoList
 */
export function subtareasToTodos(subtareas: SubtareaMision[]): TodoList {
  return subtareas.map((st, index) => subtareaToTodo(st, index));
}

// ============================================
// Utilidades
// ============================================

/**
 * Genera el siguiente ID para un nuevo todo en una lista
 */
export function getNextTodoId(todos: TodoList): number {
  if (todos.length === 0) return 1;
  return Math.max(...todos.map(t => t.id)) + 1;
}

/**
 * Encuentra un todo por ID
 */
export function findTodoById(todos: TodoList, id: number): Todo | undefined {
  return todos.find(t => t.id === id);
}

/**
 * Actualiza un todo en la lista (inmutable)
 */
export function updateTodoInList(todos: TodoList, id: number, updates: UpdateTodoDTO): TodoList {
  return todos.map(todo =>
    todo.id === id ? { ...todo, ...updates } : todo
  );
}

/**
 * Elimina un todo de la lista (inmutable)
 */
export function removeTodoFromList(todos: TodoList, id: number): TodoList {
  return todos.filter(todo => todo.id !== id);
}

/**
 * Agrega un todo a la lista (inmutable)
 */
export function addTodoToList(todos: TodoList, newTodo: CreateTodoDTO): TodoList {
  const id = newTodo.id ?? getNextTodoId(todos);
  return [...todos, { ...newTodo, id, position: newTodo.position ?? todos.length }];
}

/**
 * Toggle el estado completed de un todo (inmutable)
 */
export function toggleTodoCompleted(todos: TodoList, id: number): TodoList {
  return todos.map(todo =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
}
