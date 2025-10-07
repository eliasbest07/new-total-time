import { Mision } from "@/domain/entities/Mision";

export interface MisionRepository {
  getMisionesByUsuario(idUsuario: number): Promise<Mision[]>;
  createMision(mision: Omit<Mision, 'id' | 'created_at'>): Promise<Mision | null>;
  updateMision(id: number, mision: Partial<Mision>): Promise<Mision | null>;
  deleteMision(id: number): Promise<boolean>;
  getMisionById(id: number): Promise<Mision | null>;
}