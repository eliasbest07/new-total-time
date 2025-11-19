/**
 * Entidad para la relación entre cards de proyecto y cards de tipo text (notas)
 */
export interface CardProyectoNota {
  id: string; // UUID
  id_card_proyecto: string; // UUID del card de proyecto
  id_card_nota: string; // UUID del card de tipo text (nota)
  position: number; // Orden en la lista
  created_at: string;
  updated_at: string;
}

/**
 * DTO para crear una nueva relación proyecto-nota
 */
export interface CreateCardProyectoNotaDTO {
  id_card_proyecto: string;
  id_card_nota: string;
  position: number;
}

/**
 * DTO para actualizar una relación proyecto-nota
 */
export interface UpdateCardProyectoNotaDTO {
  position?: number;
}
