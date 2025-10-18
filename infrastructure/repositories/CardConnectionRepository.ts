import { CardConnection, CreateCardConnectionDTO, UpdateCardConnectionDTO } from "@/domain/entities/CardConnection";

export interface CardConnectionRepository {
  // Obtener todas las conexiones de una pizarra
  getByPizarraId(idPizarra: string): Promise<CardConnection[]>;

  // Obtener una conexión específica por ID
  getByConnectionId(idPizarra: string, connectionId: string): Promise<CardConnection | null>;

  // Obtener todas las conexiones que salen de una card
  getByFromCardId(idPizarra: string, fromCardId: string): Promise<CardConnection[]>;

  // Obtener todas las conexiones que llegan a una card
  getByToCardId(idPizarra: string, toCardId: string): Promise<CardConnection[]>;

  // Crear una nueva conexión
  create(connection: CreateCardConnectionDTO): Promise<CardConnection | null>;

  // Actualizar una conexión
  update(idPizarra: string, connectionId: string, updates: UpdateCardConnectionDTO): Promise<CardConnection | null>;

  // Eliminar una conexión específica
  delete(idPizarra: string, connectionId: string): Promise<boolean>;

  // Eliminar todas las conexiones de una pizarra
  deleteAllByPizarra(idPizarra: string): Promise<boolean>;

  // Eliminar todas las conexiones asociadas a una card (cuando se elimina la card)
  deleteByCardId(idPizarra: string, cardId: string): Promise<boolean>;
}
