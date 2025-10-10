import { supabase } from "@/infrastructure/services/SupabaseClient";
import { Comentario } from "@/domain/entities/Comentario";
import { ComentarioRepository, ComentarioRealtimeCallbacks } from "@/infrastructure/repositories/ComentarioRepository";
import { RealtimeChannel } from "@supabase/supabase-js";

export class SupabaseComentarioRepository implements ComentarioRepository {

  async getComentarios(page: number = 1, limit: number = 10): Promise<{
    comentarios: Comentario[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      console.log('💬 Obteniendo comentarios, página:', page);

      const offset = (page - 1) * limit;

      // Obtener el total de comentarios
      const { count, error: countError } = await supabase
        .from('comentario_sala')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('❌ Error obteniendo total de comentarios:', countError);
        return { comentarios: [], total: 0, hasMore: false };
      }

      // Obtener los comentarios paginados
      const { data, error } = await supabase
        .from('comentario_sala')
        .select(`
          id,
          contenido,
          created_at,
          edited_at,
          likes_count,
          dislikes_count,
          "idUsuario",
          usuario:"idUsuario" (
            profile (
              nombre
            )
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Error obteniendo comentarios:', error);
        return { comentarios: [], total: 0, hasMore: false };
      }

      const comentarios: Comentario[] = (data || []).map(item => ({
        id: item.id,
        contenido: item.contenido || '',
        created_at: item.created_at,
        edited_at: item.edited_at,
        likes_count: item.likes_count || 0,
        dislikes_count: item.dislikes_count || 0,
        idUsuario: item.idUsuario,
        usuario: item.usuario && item.usuario.profile ? {
          nombre: item.usuario.profile.nombre
        } : undefined
      }));

      const total = count || 0;
      const hasMore = offset + limit < total;

      console.log('💬 Comentarios obtenidos:', comentarios.length, 'de', total);

      return { comentarios, total, hasMore };
    } catch (error) {
      console.error('❌ Error en getComentariosBySala:', error);
      return { comentarios: [], total: 0, hasMore: false };
    }
  }

  async createComentario(contenido: string, usuarioId: number): Promise<Comentario | null> {
    try {
      console.log('✍️ Creando comentario para usuario:', usuarioId);

      const { data, error } = await supabase
        .from('comentario_sala')
        .insert({
          "idUsuario": usuarioId,
          contenido: contenido
        })
        .select(`
          id,
          contenido,
          created_at,
          edited_at,
          likes_count,
          dislikes_count,
          "idUsuario",
          usuario:"idUsuario" (
            profile (
              nombre
            )
          )
        `)
        .single();

      if (error) {
        console.error('❌ Error creando comentario:', error);
        return null;
      }

      const comentario: Comentario = {
        id: data.id,
        contenido: data.contenido || '',
        created_at: data.created_at,
        edited_at: data.edited_at,
        likes_count: data.likes_count || 0,
        dislikes_count: data.dislikes_count || 0,
        idUsuario: data.idUsuario,
        usuario: data.usuario && data.usuario.profile ? {
          nombre: data.usuario.profile.nombre
        } : undefined
      };

      console.log('✅ Comentario creado:', comentario);
      return comentario;
    } catch (error) {
      console.error('❌ Error en createComentario:', error);
      return null;
    }
  }

  async toggleLike(comentarioId: string, usuarioId: number): Promise<boolean> {
    try {
      console.log('👍 Toggling like para comentario:', comentarioId, 'usuario:', usuarioId);

      // Primero obtener el comentario actual
      const { data: comentario, error: fetchError } = await supabase
        .from('comentario_sala')
        .select('likes_count')
        .eq('id', comentarioId)
        .single();

      if (fetchError) {
        console.error('❌ Error obteniendo comentario:', fetchError);
        return false;
      }

      // Incrementar likes_count
      const { error: updateError } = await supabase
        .from('comentario_sala')
        .update({ 
          likes_count: (comentario.likes_count || 0) + 1 
        })
        .eq('id', comentarioId);

      if (updateError) {
        console.error('❌ Error actualizando likes:', updateError);
        return false;
      }

      console.log('✅ Like agregado exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error en toggleLike:', error);
      return false;
    }
  }

  async toggleDislike(comentarioId: string, usuarioId: number): Promise<boolean> {
    try {
      console.log('👎 Toggling dislike para comentario:', comentarioId, 'usuario:', usuarioId);

      // Primero obtener el comentario actual
      const { data: comentario, error: fetchError } = await supabase
        .from('comentario_sala')
        .select('dislikes_count')
        .eq('id', comentarioId)
        .single();

      if (fetchError) {
        console.error('❌ Error obteniendo comentario:', fetchError);
        return false;
      }

      // Incrementar dislikes_count
      const { error: updateError } = await supabase
        .from('comentario_sala')
        .update({ 
          dislikes_count: (comentario.dislikes_count || 0) + 1 
        })
        .eq('id', comentarioId);

      if (updateError) {
        console.error('❌ Error actualizando dislikes:', updateError);
        return false;
      }

      console.log('✅ Dislike agregado exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error en toggleDislike:', error);
      return false;
    }
  }

  subscribeToComentarios(callbacks: ComentarioRealtimeCallbacks): RealtimeChannel {
    console.log('📡 Iniciando suscripción realtime para comentarios');

    const channel = supabase
      .channel(`comentarios-sala`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'comentario_sala'
        },
        async (payload) => {
          console.log('📡 Cambio detectado en comentarios:', payload);

          try {
            // Recargar los comentarios de la primera página
            const { comentarios } = await this.getComentarios(1, 10);
            callbacks.onComentariosUpdated(comentarios);
          } catch (error) {
            console.error('❌ Error procesando cambio de comentario:', error);
            callbacks.onError('Error al procesar cambios de comentarios');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción comentarios:', status);

        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscripción comentarios activa');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en canal comentarios');
          callbacks.onError('Error en la conexión realtime de comentarios');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Timeout en suscripción comentarios');
          callbacks.onError('Timeout en la conexión realtime de comentarios');
        }
      });

    return channel;
  }

  unsubscribeFromComentarios(channel: RealtimeChannel): void {
    console.log('🧹 Desuscribiendo canal comentarios');

    supabase.removeChannel(channel).then(() => {
      console.log('✅ Canal comentarios removido exitosamente');
    }).catch((error) => {
      console.error('❌ Error removiendo canal comentarios:', error);
    });
  }
}