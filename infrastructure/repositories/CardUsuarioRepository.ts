import { CardUsuario, CreateCardUsuarioDTO, UpdateCardUsuarioDTO } from "@/domain/entities/CardUsuario";

export interface CardUsuarioRepository {
  getByCardId(idCard: string): Promise<CardUsuario | null>;
  create(cardUsuario: CreateCardUsuarioDTO): Promise<CardUsuario | null>;
  update(idCard: string, updates: UpdateCardUsuarioDTO): Promise<CardUsuario | null>;
  delete(idCard: string): Promise<boolean>;
}
