import { supabase } from "@/infrastructure/services/SupabaseClient";
import { MisionRepository } from "@/infrastructure/repositories/MisionRepository";
import { Mision } from "@/domain/entities/Mision";
import { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeCallbacks {
  onMisionesUpdated: (misiones: Mision[]) => void;
  onError: (error: string) => void;
}

export class SupabaseMisionRepository implements MisionRepository {
  private reconnectAttempts: Map<string, number> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private activeChannels: Map<string, RealtimeChannel> = new Map();
  private maxReconnectAttempts = 5; // Máximo 5 intentos
  private baseReconnectDelay = 5000; // 5 segundos inicial
  private maxReconnectDelay = 60000; // 60 segundos máximo
  private silentMode = true; // Modo silencioso para reducir logs

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
    const channelName = 'misiones-all';

    // Si ya existe un canal activo, retornarlo
    const existingChannel = this.activeChannels.get(channelName);
    if (existingChannel) {
      if (!this.silentMode) console.log('♻️ Reutilizando canal realtime misiones');
      return existingChannel;
    }

    if (!this.silentMode) console.log('📡 Iniciando suscripción realtime para todas las misiones');

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
          if (status === 'SUBSCRIBED') {
            if (!this.silentMode) console.log('✅ Suscripción realtime misiones activa');
            this.reconnectAttempts.set(channelName, 0);
            this.activeChannels.set(channelName, channel);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const attempts = this.reconnectAttempts.get(channelName) || 0;
            if (attempts < this.maxReconnectAttempts) {
              if (!this.silentMode) console.warn(`⚠️ Error en canal misiones (${attempts + 1}/${this.maxReconnectAttempts})`);
              this.activeChannels.delete(channelName);
              this.handleReconnect(channelName, () => this.subscribeToAllMisionesChanges(callbacks), callbacks);
            } else {
              console.error('❌ Canal realtime misiones: máximo de reintentos alcanzado');
              callbacks.onError('No se pudo conectar al servicio realtime');
            }
          } else if (status === 'CLOSED') {
            this.activeChannels.delete(channelName);
            const attempts = this.reconnectAttempts.get(channelName) || 0;
            if (attempts < this.maxReconnectAttempts) {
              this.handleReconnect(channelName, () => this.subscribeToAllMisionesChanges(callbacks), callbacks);
            }
          }
        });

      return channel;
    };

    const newChannel = setupChannel();
    this.activeChannels.set(channelName, newChannel);
    return newChannel;
  }

  // Suscribirse a cambios en tiempo real de misiones del usuario
  subscribeToMisionesChanges(idUsuario: number, callbacks: RealtimeCallbacks): RealtimeChannel {
    const channelName = `misiones-usuario-${idUsuario}`;

    const existingChannel = this.activeChannels.get(channelName);
    if (existingChannel) {
      if (!this.silentMode) console.log('♻️ Reutilizando canal realtime misiones usuario');
      return existingChannel;
    }

    if (!this.silentMode) console.log('📡 Iniciando suscripción realtime para misiones del usuario:', idUsuario);

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
          if (status === 'SUBSCRIBED') {
            if (!this.silentMode) console.log('✅ Suscripción realtime misiones usuario activa');
            this.reconnectAttempts.set(channelName, 0);
            this.activeChannels.set(channelName, channel);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const attempts = this.reconnectAttempts.get(channelName) || 0;
            if (attempts < this.maxReconnectAttempts) {
              if (!this.silentMode) console.warn(`⚠️ Error en canal misiones usuario (${attempts + 1}/${this.maxReconnectAttempts})`);
              this.activeChannels.delete(channelName);
              this.handleReconnect(channelName, () => this.subscribeToMisionesChanges(idUsuario, callbacks), callbacks);
            } else {
              console.error('❌ Canal realtime misiones usuario: máximo de reintentos alcanzado');
              callbacks.onError('No se pudo conectar al servicio realtime');
            }
          } else if (status === 'CLOSED') {
            this.activeChannels.delete(channelName);
            const attempts = this.reconnectAttempts.get(channelName) || 0;
            if (attempts < this.maxReconnectAttempts) {
              this.handleReconnect(channelName, () => this.subscribeToMisionesChanges(idUsuario, callbacks), callbacks);
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

      if (!this.silentMode) console.log(`🔄 Reconexión ${channelName} en ${delay}ms (${attempts + 1}/${this.maxReconnectAttempts})`);

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
    if (!this.silentMode) console.log('🧹 Desuscribiendo canal realtime misiones');

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
      if (!this.silentMode) console.log('✅ Canal realtime misiones removido');
    }).catch((error) => {
      console.error('❌ Error removiendo canal realtime misiones:', error);
      throw error;
    });
  }
}