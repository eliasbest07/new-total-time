export interface Comentario {
  id: number;
  autor: string;
  avatar?: string;
  contenido: string;
  fecha: Date;
  respuestas?: number;
  id_sala?: number;
  id_usuario?: string;
}