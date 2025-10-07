import { Actividad } from "@/domain/entities/Actividad";

export interface ActividadRepository {
  getActividadesByUsuario(idUsuario: string): Promise<Actividad[]>;
  createActividad(actividad: Omit<Actividad, 'id' | 'created_at'>): Promise<Actividad | null>;
  updateActividad(id: number, actividad: Partial<Actividad>): Promise<Actividad | null>;
  deleteActividad(id: number): Promise<boolean>;
  getActividadById(id: number): Promise<Actividad | null>;
}