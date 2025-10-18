export interface CardTodo {
  id: string; // uuid
  id_card: string; // uuid reference to card
  todo_id: number;
  text: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export type CreateCardTodoDTO = Omit<CardTodo, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCardTodoDTO = Partial<Omit<CardTodo, 'id' | 'id_card' | 'todo_id' | 'created_at' | 'updated_at'>>;
