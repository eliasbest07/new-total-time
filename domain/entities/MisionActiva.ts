/**
 * Entidad para misiones activas
 * Representa una misión o actividad asignada a un usuario
 */
export interface MisionActiva {
  id: string;
  tipo: 'mision' | 'actividad';
  id_referencia: number;
  id_usuario_asignado: string;
  id_creador: string | null;

  estado: 'pendiente' | 'en_progreso' | 'pausada' | 'entregada' | 'aprobada' | 'rechazada' | 'cancelada';
  is_running: boolean;

  tiempo_total_segundos: number;
  fecha_inicio: string | null;
  fecha_pausa: string | null;
  fecha_entrega: string | null;
  fecha_revision: string | null;

  entrega_descripcion: string | null;
  entrega_imagen_url: string[] | null;
  entrega_archivos_urls: string[] | null;

  // Nota: Las capturas se guardan en la tabla 'capture' separada
  fecha_ultimo_capture: string | null;
  capture_now: string | null;

  comentarios_entrega: string | null;
  calificacion: number | null;
  id_revisor: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * DTO para crear una nueva misión activa
 */
export interface CreateMisionActivaDTO {
  tipo: 'mision' | 'actividad';
  id_referencia: number;
  id_usuario_asignado: string;
  id_creador?: string;
}

/**
 * DTO para actualizar el estado de ejecución (play/pause)
 */
export interface UpdateRunningStateDTO {
  is_running: boolean;
  estado?: 'en_progreso' | 'pausada';
  tiempo_total_segundos?: number;
  fecha_inicio?: string;
  fecha_pausa?: string;
}

/**
 * DTO para enviar entrega
 * Las capturas se obtienen automáticamente de la tabla 'capture' y se guardan en 'entregables'
 */
export interface SubmitEntregaDTO {
  titulo?: string;
  entrega_descripcion: string;
  entrega_imagen_url?: string[];
  entrega_archivos_urls?: string[];
  tiempo_total_segundos: number;
}
