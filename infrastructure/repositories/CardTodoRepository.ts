import { CardTodo, CreateCardTodoDTO, UpdateCardTodoDTO } from "@/domain/entities/CardTodo";

export interface CardTodoRepository {
  getByCardId(idCard: string): Promise<CardTodo[]>;
  getById(id: string): Promise<CardTodo | null>;
  create(cardTodo: CreateCardTodoDTO): Promise<CardTodo | null>;
  update(id: string, updates: UpdateCardTodoDTO): Promise<CardTodo | null>;
  delete(id: string): Promise<boolean>;
  deleteByCardId(idCard: string): Promise<boolean>;
  toggleCompleted(id: string, completed: boolean): Promise<CardTodo | null>;
  updatePosition(id: string, position: number): Promise<CardTodo | null>;
  reorderTodos(idCard: string, todoIds: string[]): Promise<boolean>;
}
