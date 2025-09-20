import { supabase } from "@/infrastructure/services/SupabaseClient";
import { Comentario } from "@/domain/entities/Comentario";
import { RealtimeChannel } from "@supabase/supabase-js";

interface ComentarioRealtimeCallbacks {
  onComentariosUpdated: (comentarios: Comentario[]) => void;
  onError: (error: string) => void;
}

export class ComentarioRepository {
  
  // Obtener comentarios de una sala con paginación
  async getComentariosBySala(salaId: number, page: number = 1, limit: number = 10): Promise<{
    comentarios: Comentario[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      console.log('💬 Obteniendo comentarios para sala:', salaId, 'página:', page);
      
      const offset = (page - 1) * limit;
      
      // Obtener el total de comentarios
      const { count, error: countError } = await supabase
        .from('comentario')
        .select('*', { count: 'exact', head: true })
        .eq('id_sala', salaId);

      if (countError) {
        console.error('❌ Error obteniendo total de comentarios:', countError);
        return { comentarios: [], total: 0, hasMore: false };
      }

      // Obtener los comentarios paginados
      const { data, error } = await supabase
        .from('comentario')
        .select(`
          *,
          usuario:id_usuario (
            nombre,
            username,
            avatar
          )
        `)
        .eq('id_sala', salaId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Error obteniendo comentarios:', error);
        return { comentarios: [], total: 0, hasMore: false };
      }

      const comentarios: Comentario[] = (data || []).map(item => ({
        id: item.id,
        autor: item.usuario?.nombre || item.usuario?.username || 'Usuario',
        avatar: item.usuario?.avatar || item.usuario?.nombre?.substring(0, 2).toUpperCase() || 'U',
        contenido: item.contenido || '',
        fecha: new Date(item.created_at),
        id_sala: item.id_sala,
        id_usuario: item.id_usuario,
        respuestas: 0 // TODO: implementar conteo de respuestas
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

  // Crear un nuevo comentario
  async createComentario(salaId: number, contenido: string, usuarioId: string): Promise<Comentario | null> {
    try {
      console.log('✍️ Creando comentario en sala:', salaId);
      
      const { data, error } = await supabase
        .from('comentario')
        .insert({
          id_sala: salaId,
          id_usuario: usuarioId,
          contenido: contenido
        })
        .select(`
          *,
          usuario:id_usuario (
            nombre,
            username,
            avatar
          )
        `)
        .single();

      if (error) {
        console.error('❌ Error creando comentario:', error);
        return null;
      }

      const comentario: Comentario = {
        id: data.id,
        autor: data.usuario?.nombre || data.usuario?.username || 'Usuario',
        avatar: data.usuario?.avatar || data.usuario?.nombre?.substring(0, 2).toUpperCase() || 'U',
        contenido: data.contenido || '',
        fecha: new Date(data.created_at),
        id_sala: data.id_sala,
        id_usuario: data.id_usuario,
        respuestas: 0
      };

      console.log('✅ Comentario creado:', comentario);
      return comentario;
    } catch (error) {
      console.error('❌ Error en createComentario:', error);
      return null;
    }
  }

  // Suscribirse a cambios en tiempo real de comentarios de una sala
  subscribeToSalaComentarios(salaId: number, callbacks: ComentarioRealtimeCallbacks): RealtimeChannel {
    console.log('📡 Iniciando suscripción realtime para comentarios de sala:', salaId);

    const channel = supabase
      .channel(`comentarios-sala-${salaId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'comentario',
          filter: `id_sala=eq.${salaId}`
        },
        async (payload) => {
          console.log('📡 Cambio detectado en comentarios:', payload);
          
          try {
            // Recargar los comentarios de la primera página
            const { comentarios } = await this.getComentariosBySala(salaId, 1, 10);
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

  // Desuscribirse de cambios en tiempo real
  unsubscribeFromComentarios(channel: RealtimeChannel): void {
    console.log('🧹 Desuscribiendo canal comentarios');
    
    supabase.removeChannel(channel).then(() => {
      console.log('✅ Canal comentarios removido exitosamente');
    }).catch((error) => {
      console.error('❌ Error removiendo canal comentarios:', error);
    });
  }
}