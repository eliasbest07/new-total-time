import { CardImage, CreateCardImageDTO, UpdateCardImageDTO } from "@/domain/entities/CardImage";

export interface CardImageRepository {
  // Obtener datos de imagen por ID de card
  getByCardId(idCard: string): Promise<CardImage | null>;

  // Crear datos de imagen para una card
  create(cardImage: CreateCardImageDTO): Promise<CardImage | null>;

  // Actualizar datos de imagen
  update(idCard: string, updates: UpdateCardImageDTO): Promise<CardImage | null>;

  // Eliminar datos de imagen
  delete(idCard: string): Promise<boolean>;
}
