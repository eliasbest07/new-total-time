/**
 * Entidad Card para la base de datos
 * Representa una card guardada en Supabase
 */
export interface CardDB {
  id: string; // uuid generado por la BD
  id_pizarra: string; // uuid de la pizarra
  card_id: string; // ID de la card en el frontend (ej: "mision-1")
  type: string; // Tipo de card: mision, usuario, proyecto, etc.
  title: string | null;
  content: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  font_size: number;
  z_index: number;
  is_persistent: boolean; // Si es true, aparece en todas las pizarras del usuario
  created_at: string; // timestamp
  updated_at: string; // timestamp
}

/**
 * Datos adicionales de la card que se guardan en JSON
 * Estos se guardarán en una tabla separada o como JSONB
 */
export interface CardDataDB {
  card_id: string; // Referencia al card_id de cards
  id_pizarra: string; // uuid de la pizarra
  data_type: string; // tipo de data: mision, usuario, proyecto, activity, todo
  data_json: any; // Los datos específicos en formato JSON
}

/**
 * DTO para crear una nueva card
 */
export type CreateCardDTO = Omit<CardDB, 'id' | 'created_at' | 'updated_at'>;

/**
 * DTO para actualizar una card
 */
export type UpdateCardDTO = Partial<Omit<CardDB, 'id' | 'id_pizarra' | 'card_id' | 'created_at' | 'updated_at'>>;
