import { CardDB, CreateCardDTO, UpdateCardDTO } from "@/domain/entities/Card";

export interface CardRepository {
  // Obtener todas las cards de una pizarra
  getCardsByPizarra(idPizarra: string, idProyecto?: number | null): Promise<CardDB[]>;

  // Crear una nueva card
  createCard(card: CreateCardDTO): Promise<CardDB | null>;

  // Actualizar una card existente
  updateCard(idPizarra: string, cardId: string, updates: UpdateCardDTO): Promise<CardDB | null>;

  // Eliminar una card
  deleteCard(idPizarra: string, cardId: string): Promise<boolean>;

  // Obtener una card específica
  getCard(idPizarra: string, cardId: string): Promise<CardDB | null>;

  // Obtener una card por su UUID de BD (para referencias en mensajes)
  getCardById(id: string): Promise<CardDB | null>;

  // Actualizar posición de una card
  updateCardPosition(idPizarra: string, cardId: string, x: number, y: number): Promise<CardDB | null>;

  // Actualizar tamaño de una card
  updateCardSize(idPizarra: string, cardId: string, width: number, height: number): Promise<CardDB | null>;

  // Eliminar todas las cards de una pizarra
  deleteAllCards(idPizarra: string): Promise<boolean>;

  // Toggle persistencia de una card
  togglePersistent(idPizarra: string, cardId: string, isPersistent: boolean): Promise<boolean>;

  // Obtener cards persistentes de un usuario (excluyendo la pizarra actual)
  getPersistentCardsByUser(userId: string, excludePizarraId: string): Promise<CardDB[]>;
}
