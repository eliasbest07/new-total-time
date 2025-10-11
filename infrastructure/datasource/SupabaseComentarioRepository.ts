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
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Error obteniendo comentarios:', error);
        return { comentarios: [], total: 0, hasMore: false };
      }

      if (!data || data.length === 0) {
        return { comentarios: [], total: count || 0, hasMore: false };
      }

      // Obtener los IDs únicos de usuarios
      const userIds = [...new Set(data.map(c => (c as any).idUsuario || (c as any)['idUsuario']).filter(id => id !== null))];

      // Obtener los datos de los usuarios si hay IDs
      let usuariosMap = new Map();
      if (userIds.length > 0) {
        const { data: usuarios, error: userError } = await supabase
          .from('usuario')
          .select('id, nombre')
          .in('id', userIds);

        if (!userError && usuarios) {
          usuariosMap = new Map(usuarios.map(u => [u.id, { nombre: u.nombre }]));
        }
      }

      const comentarios: Comentario[] = data.map(item => {
        const idUsuario = (item as any).idUsuario || (item as any)['idUsuario'];
        return {
          id: item.id,
          contenido: item.contenido || '',
          created_at: item.created_at,
          edited_at: item.edited_at,
          likes_count: item.likes_count || 0,
          dislikes_count: item.dislikes_count || 0,
          idUsuario: idUsuario,
          usuario: idUsuario ? usuariosMap.get(idUsuario) : undefined
        };
      });

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
      console.log('📝 Contenido:', contenido);

      const insertData = {
        idUsuario: usuarioId,
        contenido: contenido
      };
      console.log('📦 Datos a insertar:', insertData);

      const { data, error } = await supabase
        .from('comentario_sala')
        .insert(insertData)
        .select('*')
        .single();

      console.log('📊 Respuesta de insert:', { data, error });

      if (error) {
        console.error('❌ Error creando comentario:', error);
        console.error('❌ Detalles del error:', JSON.stringify(error, null, 2));
        return null;
      }

      if (!data) {
        console.error('❌ No se recibieron datos después del insert');
        return null;
      }

      // Obtener el nombre del usuario
      const { data: usuario, error: userError } = await supabase
        .from('usuario')
        .select('nombre')
        .eq('id', usuarioId)
        .single();

      console.log('📊 Respuesta de usuario:', { data: usuario, error: userError });

      const idUsuarioFromData = (data as any).idUsuario || (data as any)['idUsuario'];

      const comentario: Comentario = {
        id: data.id,
        contenido: data.contenido || '',
        created_at: data.created_at,
        edited_at: data.edited_at,
        likes_count: data.likes_count || 0,
        dislikes_count: data.dislikes_count || 0,
        idUsuario: idUsuarioFromData,
        usuario: usuario ? { nombre: usuario.nombre } : undefined
      };

      console.log('✅ Comentario creado:', comentario);
      return comentario;
    } catch (error) {
      console.error('❌ Error en createComentario:', error);
      console.error('❌ Stack trace:', error);
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