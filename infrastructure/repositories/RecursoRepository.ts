import { Recurso } from "@/domain/entities/Recurso";

export interface RecursoRepository {
  getRecursosByUsuario(idUsuario: string): Promise<Recurso[]>;
  createRecurso(recurso: Omit<Recurso, 'id' | 'created_at'>): Promise<Recurso | null>;
  updateRecurso(id: number, recurso: Partial<Recurso>): Promise<Recurso | null>;
  deleteRecurso(id: number): Promise<boolean>;
  getRecursoById(id: number): Promise<Recurso | null>;
}