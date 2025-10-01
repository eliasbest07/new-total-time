export interface Capture {
  id: number;
  created_at: Date;
  id_usuario: string | null;
  img_url: string | null;
  mision_actividad: string | null;
  id_bloque: string | null;
  detalle_img: string | null;
  total_trabajado_hoy: string | null;
  tiempo_tarea_actual: string | null;
}

export interface CaptureCreate {
  id_usuario: string;
  img_url: string;
  mision_actividad: string;
  id_bloque: string;
  detalle_img?: string;
  total_trabajado_hoy?: string;
  tiempo_tarea_actual?: string;
}