import { Organizacion } from "@/domain/entities/Organizacion";

export interface OrganizacionRepository {
  getByUsuarioId(userId: string): Promise<Organizacion | null>;
  getById(id: string): Promise<Organizacion | null>;
}