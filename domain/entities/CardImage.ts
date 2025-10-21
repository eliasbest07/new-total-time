/**
 * Entidad CardImage para la base de datos
 * Representa los datos específicos de una card de tipo imagen
 */
export interface CardImage {
  id: string; // uuid generado por la BD
  id_card: string; // uuid de la card en la tabla cards
  id_pizarra: string; // uuid de la pizarra
  image_url: string; // URL de la imagen en Supabase Storage
  file_name: string | null; // Nombre del archivo
  file_size: number | null; // Tamaño del archivo en bytes
  mime_type: string | null; // Tipo MIME (image/png, image/jpeg, etc.)
  created_at: string; // timestamp
  updated_at: string; // timestamp
}

/**
 * DTO para crear una nueva CardImage
 */
export type CreateCardImageDTO = Omit<CardImage, 'id' | 'created_at' | 'updated_at'>;

/**
 * DTO para actualizar una CardImage
 */
export type UpdateCardImageDTO = Partial<Omit<CardImage, 'id' | 'id_card' | 'created_at' | 'updated_at'>>;
