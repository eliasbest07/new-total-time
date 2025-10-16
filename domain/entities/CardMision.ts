/**
 * Entidad CardMision para la base de datos
 * Representa los datos específicos de una card de tipo misión
 */
export interface CardMision {
  id: string; // uuid generado por la BD
  id_card: string; // uuid de la card en la tabla cards
  id_mision: number; // bigint - ID de la misión
  is_running: boolean; // Si la misión está en ejecución
  last_capture_url: string | null; // URL de la última captura
  created_at: string; // timestamp
  updated_at: string; // timestamp
}

/**
 * DTO para crear una nueva CardMision
 */
export type CreateCardMisionDTO = Omit<CardMision, 'id' | 'created_at' | 'updated_at'>;

/**
 * DTO para actualizar una CardMision
 */
export type UpdateCardMisionDTO = Partial<Omit<CardMision, 'id' | 'id_card' | 'id_mision' | 'created_at' | 'updated_at'>>;
