/**
 * Entidad: PizarraOrganizacion
 *
 * Representa la pizarra permanente de una organización.
 * A diferencia de la pizarra personal que se renueva diariamente,
 * esta pizarra persiste indefinidamente y es compartida por todos
 * los miembros de la organización.
 */
export interface PizarraOrganizacion {
  id: string; // UUID
  idOrganizacion: string; // UUID - Referencia a organizacion.id
  idProyecto?: number | null; // ID del proyecto (null = pizarra libre de org)
  panOffsetX: number; // Posición X del canvas
  panOffsetY: number; // Posición Y del canvas
  zoomLevel: number; // Nivel de zoom del canvas
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
