import { Comentario } from "@/domain/entities/Comentario";

export interface ComentarioRepository {
  getComentariosByIds(ids: string[]): Promise<Comentario[]>;
}
