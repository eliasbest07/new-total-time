/**
 * Entidad CardConnection para la base de datos
 * Representa las conexiones entre cards en la pizarra
 */
export interface CardConnection {
  id: string; // uuid generado por la BD
  id_pizarra: string; // uuid de la pizarra
  connection_id: string; // ID de la conexión (ej: "conn-1")
  from_card_id: string | null; // ID de la card de origen
  to_card_id: string; // ID de la card de destino
  created_at: string; // timestamp
}

/**
 * DTO para crear una nueva CardConnection
 */
export type CreateCardConnectionDTO = Omit<CardConnection, 'id' | 'created_at'>;

/**
 * DTO para actualizar una CardConnection
 */
export type UpdateCardConnectionDTO = Partial<Omit<CardConnection, 'id' | 'id_pizarra' | 'connection_id' | 'created_at'>>;
