/**
 * Entidad CardProyecto
 * Representa la relación entre una card en la pizarra y un proyecto en la base de datos
 */
export interface CardProyecto {
  id: string; // uuid
  id_card: string; // uuid - referencia a cards.id
  id_proyecto: number; // bigint - referencia a proyectos.id
  created_at: string;
  updated_at: string;
}

/**
 * DTO para crear una relación card-proyecto
 */
export type CreateCardProyectoDTO = Omit<CardProyecto, 'id' | 'created_at' | 'updated_at'>;

/**
 * DTO para actualizar una relación card-proyecto
 */
export type UpdateCardProyectoDTO = Partial<Omit<CardProyecto, 'id' | 'id_card' | 'created_at' | 'updated_at'>>;
