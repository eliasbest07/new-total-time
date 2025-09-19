export interface Sala {
  id: number;
  created_at: string;
  nombre: string | null;
  descripcion: string | null;
  id_posts: string[] | null;
  id_organizacion: string | null;
  activa?: boolean; // Campo adicional para el UI
}