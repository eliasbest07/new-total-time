import { supabase } from "@/infrastructure/services/SupabaseClient";
import { ActividadRepository } from "@/infrastructure/repositories/ActividadRepository";
import { Actividad } from "@/domain/entities/Actividad";
import { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeCallbacks {
  onActividadesUpdated: (actividades: Actividad[]) => void;
  onError: (error: string) => void;
}

export class SupabaseActividadRepository implements ActividadRepository {

  async getActividadesByUsuario(idUsuario: string): Promise<Actividad[]> {
    try {
      console.log('📅 Obteniendo actividades para usuario:', idUsuario);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout en getActividadesByUsuario')), 5000);
      });

      const queryPromise = supabase
        .from('actividades')
        .select('*')
        .eq('id_usuario', idUsuario)
        .order('created_at', { ascending: false });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.error('❌ Error obteniendo actividades:', error);
        return [];
      }

      const actividades = data || [];
      console.log('✅ Actividades encontradas:', actividades.length);
      return actividades;
    } catch (error) {
      console.error('❌ Error en getActividadesByUsuario:', error);
      return [];
    }
  }

  async createActividad(actividad: Omit<Actividad, 'id' | 'created_at'>): Promise<Actividad | null> {
    try {
      console.log('➕ Creando nueva actividad:', actividad);

      const { data, error } = await supabase
        .from('actividades')
        .insert([actividad])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando actividad:', error);
        return null;
      }

      console.log('✅ Actividad creada exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en createActividad:', error);
      return null;
    }
  }

  async updateActividad(id: number, actividad: Partial<Actividad>): Promise<Actividad | null> {
    try {
      console.log('✏️ Actualizando actividad:', id, actividad);

      const { data, error } = await supabase
        .from('actividades')
        .update(actividad)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando actividad:', error);
        return null;
      }

      console.log('✅ Actividad actualizada exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en updateActividad:', error);
      return null;
    }
  }

  async deleteActividad(id: number): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando actividad:', id);

      const { error } = await supabase
        .from('actividades')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error eliminando actividad:', error);
        return false;
      }

      console.log('✅ Actividad eliminada exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error en deleteActividad:', error);
      return false;
    }
  }

  async getActividadById(id: number): Promise<Actividad | null> {
    try {
      console.log('🔍 Obteniendo actividad por ID:', id);

      const { data, error } = await supabase
        .from('actividades')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo actividad:', error);
        return null;
      }

      console.log('✅ Actividad encontrada:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en getActividadById:', error);
      return null;
    }
  }

  // Suscribirse a cambios en tiempo real de actividades del usuario
  subscribeToActividadesChanges(idUsuario: string, callbacks: RealtimeCallbacks): RealtimeChannel {
    console.log('📡 Iniciando suscripción realtime para actividades del usuario:', idUsuario);

    const channel = supabase
      .channel(`actividades-usuario-${idUsuario}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'actividades',
          filter: `id_usuario=eq.${idUsuario}`
        },
        async (payload) => {
          console.log('📡 Cambio detectado en actividades:', payload);

          try {
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Timeout en realtime update')), 5000);
            });

            const updatePromise = this.getActividadesByUsuario(idUsuario);
            const nuevasActividades = await Promise.race([updatePromise, timeoutPromise]);

            callbacks.onActividadesUpdated(nuevasActividades);
          } catch (error) {
            console.error('❌ Error procesando cambio de actividades:', error);
            callbacks.onError('Error al procesar cambios de actividades');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción realtime actividades:', status);

        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscripción realtime actividades activa');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en canal realtime actividades');
          callbacks.onError('Error en la conexión realtime de actividades');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Timeout en suscripción realtime actividades');
          callbacks.onError('Timeout en la conexión realtime de actividades');
        } else if (status === 'CLOSED') {
          console.log('🔒 Canal realtime actividades cerrado');
        }
      });

    return channel;
  }

  // Desuscribirse de cambios en tiempo real
  unsubscribeFromChanges(channel: RealtimeChannel): Promise<void> {
    console.log('🧹 Desuscribiendo canal realtime actividades');

    return supabase.removeChannel(channel).then(() => {
      console.log('✅ Canal realtime actividades removido exitosamente');
    }).catch((error) => {
      console.error('❌ Error removiendo canal realtime actividades:', error);
      throw error;
    });
  }
}