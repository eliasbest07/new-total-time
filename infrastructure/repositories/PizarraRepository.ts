import { Pizarra } from "@/domain/entities/Pizarra";

export interface PizarraRepository {
  // Obtener pizarra del día de un usuario (crea una si no existe)
  getPizarraDelDia(idUsuario: string, fecha: Date): Promise<Pizarra | null>;

  // Actualizar el pan offset de la pizarra
  updatePanOffset(id: string, panOffsetX: number, panOffsetY: number): Promise<Pizarra | null>;

  // Obtener pizarra por ID
  getPizarraById(id: string): Promise<Pizarra | null>;

  // Crear pizarra
  createPizarra(pizarra: Omit<Pizarra, 'id' | 'created_at' | 'updated_at'>): Promise<Pizarra | null>;
}
