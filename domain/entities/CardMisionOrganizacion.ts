/**
 * Entidad: CardMisionOrganizacion
 *
 * Datos específicos para cards de tipo "mision" en la pizarra
 * de organización. Incluye información sobre asignación, estado,
 * y subtareas vinculadas.
 */
export interface CardMisionOrganizacion {
  id: string; // UUID
  idCard: string; // UUID - Referencia a cards_organizacion.id
  idMision: number; // bigint - ID de la misión
  isRunning: boolean; // Indica si la misión está en ejecución
  lastCaptureUrl: string | null; // URL del último screenshot/captura
  idUsuarioAsignado: number | null; // ID del usuario asignado
  estado: EstadoMisionOrganizacion; // Estado actual de la misión
  cardTodos: string[]; // Array de IDs de cards TODO vinculados
  fechaEntrega: string | null; // ISO timestamp de fecha de entrega
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Estados posibles de una misión en la organización
 */
export type EstadoMisionOrganizacion =
  | 'pendiente'
  | 'en_progreso'
  | 'entregada'
  | 'revisada'
  | 'completada'
  | 'cancelada';
