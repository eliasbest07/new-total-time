export interface Recurso {
  id: number;
  created_at: string;
  link: string | null;
  nombre: string | null;
  icono: string | null;
  proyecto_id: number | null;
  id_usuario: string | null;
}