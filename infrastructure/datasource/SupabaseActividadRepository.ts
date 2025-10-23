import { supabase } from "@/infrastructure/services/SupabaseClient";
import { ActividadRepository } from "@/infrastructure/repositories/ActividadRepository";
import { Actividad } from "@/domain/entities/Actividad";
import { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeCallbacks {
  onActividadesUpdated: (actividades: Actividad[]) => void;
  onError: (error: string) => void;
}

export class SupabaseActividadRepository implements ActividadRepository {
  private reconnectAttempts: Map<string, number> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private activeChannels: Map<string, RealtimeChannel> = new Map();
  private maxReconnectAttempts = 10; // Máximo 10 intentos
  private baseReconnectDelay = 2000; // 2 segundos inicial
  private maxReconnectDelay = 60000; // 60 segundos máximo

  async getActividadesByUsuario(idUsuario: string): Promise<Actividad[]> {
    try {
      // console.log('📅 Obteniendo actividades para usuario:', idUsuario);

      const { data, error } = await supabase
        .from('actividades')
        .select('*')
        .eq('id_usuario', idUsuario)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo actividades:', error);
        return [];
      }

      const actividades = data || [];
      // console.log('✅ Actividades encontradas:', actividades.length);
      return actividades;
    } catch (error) {
      console.error('❌ Error en getActividadesByUsuario:', error);
      return [];
    }
  }

  async createActividad(actividad: Omit<Actividad, 'id' | 'created_at'>): Promise<Actividad | null> {
    try {
      // console.log('➕ Creando nueva actividad:', actividad);

      const { data, error } = await supabase
        .from('actividades')
        .insert([actividad])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando actividad:', error);
        return null;
      }

      // console.log('✅ Actividad creada exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en createActividad:', error);
      return null;
    }
  }

  async updateActividad(id: number, actividad: Partial<Actividad>): Promise<Actividad | null> {
    try {
      // console.log('✏️ Actualizando actividad:', id, actividad);

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

      // console.log('✅ Actividad actualizada exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en updateActividad:', error);
      return null;
    }
  }

  async deleteActividad(id: number): Promise<boolean> {
    try {
      // console.log('🗑️ Eliminando actividad:', id);

      const { error } = await supabase
        .from('actividades')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error eliminando actividad:', error);
        return false;
      }

      // console.log('✅ Actividad eliminada exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error en deleteActividad:', error);
      return false;
    }
  }

  async getActividadById(id: number): Promise<Actividad | null> {
    try {
      // console.log('🔍 Obteniendo actividad por ID:', id);

      const { data, error } = await supabase
        .from('actividades')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo actividad:', error);
        return null;
      }

      // console.log('✅ Actividad encontrada:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en getActividadById:', error);
      return null;
    }
  }

  // Suscribirse a cambios en tiempo real de actividades del usuario
  subscribeToActividadesChanges(idUsuario: string, callbacks: RealtimeCallbacks): RealtimeChannel {
    const channelName = `actividades-usuario-${idUsuario}`;

    // Si ya existe un canal activo, retornarlo
    const existingChannel = this.activeChannels.get(channelName);
    if (existingChannel) {
      // console.log('♻️ Reutilizando canal realtime existente para:', channelName);
      return existingChannel;
    }

    // console.log('📡 Iniciando suscripción realtime para actividades del usuario:', idUsuario);

    const setupChannel = (): RealtimeChannel => {
      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: '' }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'actividades',
            filter: `id_usuario=eq.${idUsuario}`
          },
          async (payload) => {
            // console.log('📡 Cambio detectado en actividades:', payload);

            try {
              const nuevasActividades = await this.getActividadesByUsuario(idUsuario);
              callbacks.onActividadesUpdated(nuevasActividades);
            } catch (error) {
              console.error('❌ Error procesando cambio de actividades:', error);
              callbacks.onError('Error al procesar cambios de actividades');
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // console.log('✅ Suscripción realtime actividades activa');
            this.reconnectAttempts.set(channelName, 0); // Reset intentos al conectar exitosamente
            this.activeChannels.set(channelName, channel);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const attempts = this.reconnectAttempts.get(channelName) || 0;

            if (attempts < this.maxReconnectAttempts) {
              console.warn(`⚠️ Error en canal actividades (intento ${attempts + 1}/${this.maxReconnectAttempts})`);
              this.activeChannels.delete(channelName);
              this.handleReconnect(channelName, () => this.subscribeToActividadesChanges(idUsuario, callbacks), callbacks);
            } else {
              console.error('❌ Error en canal realtime actividades - máximo de reintentos alcanzado');
              callbacks.onError('No se pudo conectar al servicio realtime');
            }
          } else if (status === 'CLOSED') {
            // Solo reintentar si no fue un cierre manual
            this.activeChannels.delete(channelName);
            const attempts = this.reconnectAttempts.get(channelName) || 0;
            if (attempts < this.maxReconnectAttempts) {
              this.handleReconnect(channelName, () => this.subscribeToActividadesChanges(idUsuario, callbacks), callbacks);
            }
          }
        });

      return channel;
    };

    const newChannel = setupChannel();
    this.activeChannels.set(channelName, newChannel);
    return newChannel;
  }

  // Manejador de reconexión con backoff exponencial
  private handleReconnect(
    channelName: string,
    reconnectFn: () => RealtimeChannel,
    callbacks: RealtimeCallbacks
  ): void {
    // Limpiar timeout anterior si existe
    const existingTimeout = this.reconnectTimeouts.get(channelName);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const attempts = this.reconnectAttempts.get(channelName) || 0;

    if (attempts < this.maxReconnectAttempts) {
      // Calcular delay con backoff exponencial
      const delay = Math.min(
        this.baseReconnectDelay * Math.pow(2, attempts),
        this.maxReconnectDelay
      );

      // console.log(`🔄 Reintentando reconexión ${channelName} en ${delay}ms (intento ${attempts + 1})`);

      const timeout = setTimeout(async () => {
        this.reconnectAttempts.set(channelName, attempts + 1);

        try {
          // Remover canal anterior antes de reconectar
          await supabase.removeChannel(supabase.channel(channelName));
        } catch (error) {
          console.error('Error removiendo canal anterior:', error);
        }

        // Intentar reconectar
        reconnectFn();
      }, delay);

      this.reconnectTimeouts.set(channelName, timeout);
    } else {
      console.error(`❌ Máximo de intentos de reconexión alcanzado para ${channelName}`);
      callbacks.onError('No se pudo restablecer la conexión realtime después de múltiples intentos');
    }
  }

  // Desuscribirse de cambios en tiempo real
  unsubscribeFromChanges(channel: RealtimeChannel): Promise<void> {
    // console.log('🧹 Desuscribiendo canal realtime actividades');

    // Encontrar y eliminar el canal del Map
    for (const [name, ch] of this.activeChannels.entries()) {
      if (ch === channel) {
        this.activeChannels.delete(name);
        this.reconnectAttempts.delete(name);
        const timeout = this.reconnectTimeouts.get(name);
        if (timeout) {
          clearTimeout(timeout);
          this.reconnectTimeouts.delete(name);
        }
        break;
      }
    }

    return supabase.removeChannel(channel).then(() => {
      // console.log('✅ Canal realtime actividades removido exitosamente');
    }).catch((error) => {
      console.error('❌ Error removiendo canal realtime actividades:', error);
      throw error;
    });
  }
}