export interface Actividad {
  id: number;
  created_at: string;
  id_usuario: string | null;
  descripcion: string | null;
  fecha: string | null; // date
  cant_horas: number | null; // smallint
  captures: string | null;
  link: string | null;
  tiempo_dedicado: number | null; // real
  hora_inicio: string | null;
  id_proyecto: number | null; // bigint - relación con proyecto
}