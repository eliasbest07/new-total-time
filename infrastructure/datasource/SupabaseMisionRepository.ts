import { supabase } from "@/infrastructure/services/SupabaseClient";
import { MisionRepository } from "@/infrastructure/repositories/MisionRepository";
import { Mision } from "@/domain/entities/Mision";
import { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeCallbacks {
  onMisionesUpdated: (misiones: Mision[]) => void;
  onError: (error: string) => void;
}

export class SupabaseMisionRepository implements MisionRepository {

  async getAllMisiones(): Promise<Mision[]> {
    try {
      console.log('🎯 Obteniendo todas las misiones');

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout en getAllMisiones')), 5000);
      });

      const queryPromise = supabase
        .from('misiones')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.error('❌ Error obteniendo todas las misiones:', error);
        return [];
      }

      const misiones = data || [];
      console.log('✅ Todas las misiones encontradas:', misiones.length);
      return misiones;
    } catch (error) {
      console.error('❌ Error en getAllMisiones:', error);
      return [];
    }
  }

  async getMisionesByUsuario(idUsuario: number): Promise<Mision[]> {
    try {
      console.log('🎯 Obteniendo misiones para usuario:', idUsuario);
      console.log('🎯 Tipo de idUsuario:', typeof idUsuario);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout en getMisionesByUsuario')), 5000);
      });

      const queryPromise = supabase
        .from('misiones')
        .select('*')
        .eq('id_usuario', idUsuario)
        .order('created_at', { ascending: false });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      console.log('🎯 Respuesta de Supabase misiones:', { data, error });

      if (error) {
        console.error('❌ Error obteniendo misiones:', error);
        console.error('❌ Detalles del error:', error.message, error.code, error.details);
        return [];
      }

      const misiones = data || [];
      console.log('✅ Misiones encontradas:', misiones.length);
      console.log('✅ Misiones data:', misiones);
      return misiones;
    } catch (error) {
      console.error('❌ Error en getMisionesByUsuario:', error);
      return [];
    }
  }

  async createMision(mision: Omit<Mision, 'id' | 'created_at'>): Promise<Mision | null> {
    try {
      console.log('➕ Creando nueva misión:', mision);

      const { data, error } = await supabase
        .from('misiones')
        .insert([mision])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando misión:', error);
        return null;
      }

      console.log('✅ Misión creada exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en createMision:', error);
      return null;
    }
  }

  async updateMision(id: number, mision: Partial<Mision>): Promise<Mision | null> {
    try {
      console.log('✏️ Actualizando misión:', id, mision);

      const { data, error } = await supabase
        .from('misiones')
        .update(mision)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando misión:', error);
        return null;
      }

      console.log('✅ Misión actualizada exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en updateMision:', error);
      return null;
    }
  }

  async deleteMision(id: number): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando misión:', id);

      const { error } = await supabase
        .from('misiones')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error eliminando misión:', error);
        return false;
      }

      console.log('✅ Misión eliminada exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error en deleteMision:', error);
      return false;
    }
  }

  async getMisionById(id: number): Promise<Mision | null> {
    try {
      console.log('🔍 Obteniendo misión por ID:', id);

      const { data, error } = await supabase
        .from('misiones')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo misión:', error);
        return null;
      }

      console.log('✅ Misión encontrada:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en getMisionById:', error);
      return null;
    }
  }

  // Suscribirse a cambios en tiempo real de todas las misiones
  subscribeToAllMisionesChanges(callbacks: RealtimeCallbacks): RealtimeChannel {
    console.log('📡 Iniciando suscripción realtime para todas las misiones');

    const channel = supabase
      .channel('misiones-all')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'misiones'
        },
        async (payload) => {
          console.log('📡 Cambio detectado en misiones:', payload);

          try {
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Timeout en realtime update')), 5000);
            });

            const updatePromise = this.getAllMisiones();
            const nuevasMisiones = await Promise.race([updatePromise, timeoutPromise]);

            callbacks.onMisionesUpdated(nuevasMisiones);
          } catch (error) {
            console.error('❌ Error procesando cambio de misiones:', error);
            callbacks.onError('Error al procesar cambios de misiones');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción realtime misiones:', status);

        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscripción realtime misiones activa');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en canal realtime misiones');
          callbacks.onError('Error en la conexión realtime de misiones');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Timeout en suscripción realtime misiones');
          callbacks.onError('Timeout en la conexión realtime de misiones');
        } else if (status === 'CLOSED') {
          console.log('🔒 Canal realtime misiones cerrado');
        }
      });

    return channel;
  }

  // Suscribirse a cambios en tiempo real de misiones del usuario
  subscribeToMisionesChanges(idUsuario: number, callbacks: RealtimeCallbacks): RealtimeChannel {
    console.log('📡 Iniciando suscripción realtime para misiones del usuario:', idUsuario);

    const channel = supabase
      .channel(`misiones-usuario-${idUsuario}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'misiones',
          filter: `id_usuario=eq.${idUsuario}`
        },
        async (payload) => {
          console.log('📡 Cambio detectado en misiones:', payload);

          try {
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Timeout en realtime update')), 5000);
            });

            const updatePromise = this.getMisionesByUsuario(idUsuario);
            const nuevasMisiones = await Promise.race([updatePromise, timeoutPromise]);

            callbacks.onMisionesUpdated(nuevasMisiones);
          } catch (error) {
            console.error('❌ Error procesando cambio de misiones:', error);
            callbacks.onError('Error al procesar cambios de misiones');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción realtime misiones:', status);

        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscripción realtime misiones activa');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en canal realtime misiones');
          callbacks.onError('Error en la conexión realtime de misiones');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Timeout en suscripción realtime misiones');
          callbacks.onError('Timeout en la conexión realtime de misiones');
        } else if (status === 'CLOSED') {
          console.log('🔒 Canal realtime misiones cerrado');
        }
      });

    return channel;
  }

  // Desuscribirse de cambios en tiempo real
  unsubscribeFromChanges(channel: RealtimeChannel): Promise<void> {
    console.log('🧹 Desuscribiendo canal realtime misiones');

    return supabase.removeChannel(channel).then(() => {
      console.log('✅ Canal realtime misiones removido exitosamente');
    }).catch((error) => {
      console.error('❌ Error removiendo canal realtime misiones:', error);
      throw error;
    });
  }
}