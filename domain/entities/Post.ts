export interface Post {
  id: string;
  created_at: string;
  id_usuario: number | null; // ID numérico del usuario que creó el post (campo real en DB)
  id_sala: number | null;
  contenido: string | null;
  id_comentarios: string[] | null;
  edited_at: string | null;
  likes_count: number;
  dislikes_count: number;
  imagen: string | null; // URL de la imagen en Supabase Storage
  // Datos del usuario (join)
  usuario?: {
    nombre: string | null;
    avatar?: string | null;
  };
}