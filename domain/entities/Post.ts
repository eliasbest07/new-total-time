export interface Post {
  id: string;
  created_at: string;
  id_sala: number | null;
  contenido: string | null;
  id_usuario: number | null;
  id_comentarios: string[] | null;
  edited_at: string | null;
  likes_count: number;
  dislikes_count: number;
  // Datos del usuario (join)
  usuario?: {
    nombre: string | null;
  };
}
