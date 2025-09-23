export interface Mision {
  id: number;
  created_at: string;
  nombre: string | null;
  descripcion: string | null;
  horas: number | null; // smallint
  fecha_start: string | null; // timestamp with time zone
  fecha_end: string | null; // timestamp with time zone
  id_usuario: number | null; // bigint
  id_proyecto: number | null; // bigint
}