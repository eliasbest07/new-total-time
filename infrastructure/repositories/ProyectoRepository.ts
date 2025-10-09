import { Proyecto } from "@/domain/entities/Proyecto";

export interface ProyectoRepository {
  getProyectosByUsuario(userId: string): Promise<Proyecto[]>;
  getProyectosByOrganizacion(organizacionId: string): Promise<Proyecto[]>;
  getProyectosByCurrentUser(): Promise<Proyecto[]>;
  getUserOrganizationId(): Promise<string | null>;
  createProyecto(proyecto: Omit<Proyecto, 'id' | 'created_at'>): Promise<Proyecto | null>;
  updateProyecto(id: number, proyecto: Partial<Proyecto>): Promise<Proyecto | null>;
  deleteProyecto(id: number): Promise<boolean>;
  getProyectoById(id: number): Promise<Proyecto | null>;
}