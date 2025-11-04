export interface Comentario {
  id: string;
  contenido: string;
  created_at: string;
  edited_at: string | null;
  likes_count: number;
  dislikes_count: number;
  idUsuario: number | null;
  // Datos del usuario (join)
  usuario?: {
    nombre: string | null;
    avatar?: string | null;
  };
}