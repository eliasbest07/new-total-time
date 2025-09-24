import { supabase } from "@/infrastructure/services/SupabaseClient";
import { RecursoRepository } from "@/infrastructure/repositories/RecursoRepository";
import { Recurso } from "@/domain/entities/Recurso";
import { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeCallbacks {
  onRecursosUpdated: (recursos: Recurso[]) => void;
  onError: (error: string) => void;
}

export class SupabaseRecursoRepository implements RecursoRepository {

  async getRecursosByUsuario(idUsuario: string): Promise<Recurso[]> {
    try {
      console.log('📚 Obteniendo recursos para usuario:', idUsuario);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout en getRecursosByUsuario')), 5000);
      });

      const queryPromise = supabase
        .from('recursos')
        .select('*')
        .eq('id_usuario', idUsuario)
        .order('created_at', { ascending: false });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.error('❌ Error obteniendo recursos:', error);
        return [];
      }

      const recursos = data || [];
      console.log('✅ Recursos encontrados:', recursos.length);
      return recursos;
    } catch (error) {
      console.error('❌ Error en getRecursosByUsuario:', error);
      return [];
    }
  }

  async createRecurso(recurso: Omit<Recurso, 'id' | 'created_at'>): Promise<Recurso | null> {
    try {
      console.log('➕ Creando nuevo recurso:', recurso);

      const { data, error } = await supabase
        .from('recursos')
        .insert([recurso])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando recurso:', error);
        return null;
      }

      console.log('✅ Recurso creado exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en createRecurso:', error);
      return null;
    }
  }

  async updateRecurso(id: number, recurso: Partial<Recurso>): Promise<Recurso | null> {
    try {
      console.log('✏️ Actualizando recurso:', id, recurso);

      const { data, error } = await supabase
        .from('recursos')
        .update(recurso)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando recurso:', error);
        return null;
      }

      console.log('✅ Recurso actualizado exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en updateRecurso:', error);
      return null;
    }
  }

  async deleteRecurso(id: number): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando recurso:', id);

      const { error } = await supabase
        .from('recursos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error eliminando recurso:', error);
        return false;
      }

      console.log('✅ Recurso eliminado exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error en deleteRecurso:', error);
      return false;
    }
  }

  async getRecursoById(id: number): Promise<Recurso | null> {
    try {
      console.log('🔍 Obteniendo recurso por ID:', id);

      const { data, error } = await supabase
        .from('recursos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo recurso:', error);
        return null;
      }

      console.log('✅ Recurso encontrado:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en getRecursoById:', error);
      return null;
    }
  }

  // Suscribirse a cambios en tiempo real de recursos del usuario
  subscribeToRecursosChanges(idUsuario: string, callbacks: RealtimeCallbacks): RealtimeChannel {
    console.log('📡 Iniciando suscripción realtime para recursos del usuario:', idUsuario);

    const channel = supabase
      .channel(`recursos-usuario-${idUsuario}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'recursos',
          filter: `id_usuario=eq.${idUsuario}`
        },
        async (payload) => {
          console.log('📡 Cambio detectado en recursos:', payload);

          try {
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Timeout en realtime update')), 5000);
            });

            const updatePromise = this.getRecursosByUsuario(idUsuario);
            const nuevosRecursos = await Promise.race([updatePromise, timeoutPromise]);

            callbacks.onRecursosUpdated(nuevosRecursos);
          } catch (error) {
            console.error('❌ Error procesando cambio de recursos:', error);
            callbacks.onError('Error al procesar cambios de recursos');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción realtime recursos:', status);

        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscripción realtime recursos activa');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en canal realtime recursos');
          callbacks.onError('Error en la conexión realtime de recursos');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Timeout en suscripción realtime recursos');
          callbacks.onError('Timeout en la conexión realtime de recursos');
        } else if (status === 'CLOSED') {
          console.log('🔒 Canal realtime recursos cerrado');
        }
      });

    return channel;
  }

  // Desuscribirse de cambios en tiempo real
  unsubscribeFromChanges(channel: RealtimeChannel): Promise<void> {
    console.log('🧹 Desuscribiendo canal realtime recursos');

    return supabase.removeChannel(channel).then(() => {
      console.log('✅ Canal realtime recursos removido exitosamente');
    }).catch((error) => {
      console.error('❌ Error removiendo canal realtime recursos:', error);
      throw error;
    });
  }
}