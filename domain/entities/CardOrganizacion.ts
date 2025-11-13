/**
 * Entidad: CardOrganizacion
 *
 * Representa una tarjeta/card en la pizarra de organización.
 * Similar a la entidad Card pero específica para la pizarra
 * de organización con persistencia permanente.
 */
export interface CardOrganizacion {
  id: string; // UUID - ID en la base de datos
  idPizarraOrganizacion: string; // UUID - Referencia a pizarra_organizacion.id
  cardId: string; // ID del card en el frontend (ej: "mision-1", "todo-2")
  type: CardOrganizacionType; // Tipo de card
  title: string | null; // Título del card
  content: string | null; // Contenido del card
  x: number; // Posición X en el canvas
  y: number; // Posición Y en el canvas
  width: number; // Ancho del card
  height: number; // Alto del card
  fontSize: number; // Tamaño de fuente
  zIndex: number; // Índice Z para ordenamiento visual
  color: string | null; // Color del card (opcional)
  metadata: Record<string, any> | null; // Datos adicionales en formato JSON
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Tipos de cards soportados en la pizarra de organización
 */
export type CardOrganizacionType =
  | 'mision'
  | 'todo'
  | 'note'
  | 'proyecto'
  | 'actividad'
  | 'usuario'
  | 'image'
  | 'recurso';
