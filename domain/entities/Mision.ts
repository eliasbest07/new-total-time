import { CardDB } from './Card';
import { CardTodo } from './CardTodo';

export interface Mision {
  id: number;
  created_at: string;
  nombre: string | null;
  descripcion: string | null;
  horas: number | null; // smallint
  fecha_start: string | null; // timestamp with time zone
  fecha_end: string | null; // timestamp with time zone
  id_usuario: number | null; // bigint
  id_proyecto: number | null; // bigint
  id_creador: string | null; // uuid - El usuario que creó la misión
  card_todos: string[] | null; // array de UUIDs de cards
  estado: string | null;
}

/**
 * Interfaz extendida de Mision que incluye los cards con sus todos
 */
export interface MisionWithTodos extends Mision {
  cardTodosData?: Array<{
    card: CardDB;
    todos: CardTodo[];
  }>;
}