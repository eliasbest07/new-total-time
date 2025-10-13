export interface Post {
  id: string;
  created_at: string;
  creado_por: string | null; // UUID del usuario que creó el post (campo real en DB)
  id_usuario: number | null; // ID numérico del usuario (legacy, mantener por compatibilidad)
  id_sala: number | null;
  contenido: string | null;
  id_comentarios: string[] | null;
  edited_at: string | null;
  likes_count: number;
  dislikes_count: number;
  // Datos del usuario (join)
  usuario?: {
    nombre: string | null;
    avatar?: string | null;
  };
}