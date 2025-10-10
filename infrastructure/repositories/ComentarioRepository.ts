import { Comentario } from "@/domain/entities/Comentario";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface ComentarioRealtimeCallbacks {
  onComentariosUpdated: (comentarios: Comentario[]) => void;
  onError: (error: string) => void;
}

export interface ComentarioRepository {
  getComentarios(page?: number, limit?: number): Promise<{
    comentarios: Comentario[];
    total: number;
    hasMore: boolean;
  }>;
  createComentario(contenido: string, usuarioId: number): Promise<Comentario | null>;
  toggleLike(comentarioId: string, usuarioId: number): Promise<boolean>;
  toggleDislike(comentarioId: string, usuarioId: number): Promise<boolean>;
  subscribeToComentarios(callbacks: ComentarioRealtimeCallbacks): RealtimeChannel;
  unsubscribeFromComentarios(channel: RealtimeChannel): void;
}