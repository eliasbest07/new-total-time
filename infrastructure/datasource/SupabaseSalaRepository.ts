import { supabase } from "@/infrastructure/services/SupabaseClient";
import { Sala } from "@/domain/entities/Sala";
import { SalaRepository, RealtimeCallbacks } from "@/infrastructure/repositories/SalaRepository";
import { RealtimeChannel } from "@supabase/supabase-js";

export class SupabaseSalaRepository implements SalaRepository {
  private reconnectAttempts: Map<string, number> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private activeChannels: Map<string, RealtimeChannel> = new Map();
  private maxReconnectAttempts = 5; // Máximo 5 intentos
  private baseReconnectDelay = 5000; // 5 segundos inicial
  private maxReconnectDelay = 60000; // 60 segundos máximo

  async getSalaIdsByOrganizacion(idOrganizacion: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('organizacion')
        .select('id_salas')
        .eq('id', idOrganizacion)
        .single();

      if (error) {
        // console.error('❌ Error obteniendo IDs de salas:', error);
        return [];
      }

      let idSalas = data?.id_salas || [];

      if (!Array.isArray(idSalas)) {
        idSalas = [];
      }

      const idSalasString = idSalas.map((id: any) => String(id));

      // console.log('📋 IDs de salas encontrados:', idSalasString);
      return idSalasString;
    } catch (error) {
      // console.error('❌ Error en getSalaIdsByOrganizacion:', error);
      return [];
    }
  }

  async getSalasByIds(salaIds: string[]): Promise<Sala[]> {
    try {
      if (salaIds.length === 0) {
        // console.log('ℹ️ No hay IDs de salas para buscar');
        return [];
      }

      // console.log('🔍 Buscando salas con IDs:', salaIds);

      const salaIdsNumeric = salaIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

      if (salaIdsNumeric.length === 0) {
        // console.log('⚠️ No se pudieron convertir los IDs a números válidos');
        return [];
      }

      const { data, error } = await supabase
        .from('sala')
        .select('*')
        .in('id', salaIdsNumeric);

      if (error) {
        // console.error('❌ Error obteniendo salas:', error);
        return [];
      }

      const salas = data || [];
      // console.log('🏠 Salas encontradas:', salas);

      if (salas.length > 0) {
        salas[0].activa = true;
      }

      return salas;
    } catch (error) {
      // console.error('❌ Error en getSalasByIds:', error);
      return [];
    }
  }

  async getSalasByOrganizacion(idOrganizacion: string): Promise<Sala[]> {
    try {
      // console.log('🚀 Iniciando carga de salas para organización:', idOrganizacion);

      const salaIds = await this.getSalaIdsByOrganizacion(idOrganizacion);

      if (salaIds.length === 0) {
        // console.log('ℹ️ No se encontraron salas para esta organización');
        return [];
      }

      const salas = await this.getSalasByIds(salaIds);

      // console.log('✅ Carga de salas completada:', salas.length, 'salas encontradas');
      return salas;
    } catch (error) {
      // console.error('❌ Error en getSalasByOrganizacion:', error);
      return [];
    }
  }

  subscribeToSalasChanges(idOrganizacion: string, callbacks: RealtimeCallbacks): RealtimeChannel {
    const channelName = `salas-${idOrganizacion}`;

    // Si ya existe un canal activo, retornarlo
    const existingChannel = this.activeChannels.get(channelName);
    if (existingChannel) {
      return existingChannel;
    }

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
            event: '*',
            schema: 'public',
            table: 'sala'
          },
          async (payload) => {
            // console.log('📡 Cambio detectado en sala:', payload);

            const salaData = payload.new || payload.old;
            if (salaData && (salaData as any).id_organizacion === idOrganizacion) {
              try {
                const nuevasSalas = await this.getSalasByOrganizacion(idOrganizacion);

                callbacks.onSalasUpdated(nuevasSalas);
              } catch (error) {
                // console.error('❌ Error procesando cambio de sala:', error);
                callbacks.onError('Error al procesar cambios de sala');
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.reconnectAttempts.set(channelName, 0);
            this.activeChannels.set(channelName, channel);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const attempts = this.reconnectAttempts.get(channelName) || 0;
            if (attempts < this.maxReconnectAttempts) {
              this.activeChannels.delete(channelName);
              this.handleReconnect(channelName, () => this.subscribeToSalasChanges(idOrganizacion, callbacks), callbacks);
            } else {
              console.error('❌ Canal realtime salas: máximo de reintentos alcanzado');
              callbacks.onError('No se pudo conectar al servicio realtime');
            }
          } else if (status === 'CLOSED') {
            this.activeChannels.delete(channelName);
            const attempts = this.reconnectAttempts.get(channelName) || 0;
            if (attempts < this.maxReconnectAttempts) {
              this.handleReconnect(channelName, () => this.subscribeToSalasChanges(idOrganizacion, callbacks), callbacks);
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
          // console.error('Error removiendo canal anterior:', error);
        }

        // Intentar reconectar
        reconnectFn();
      }, delay);

      this.reconnectTimeouts.set(channelName, timeout);
    } else {
      // console.error(`❌ Máximo de intentos de reconexión alcanzado para ${channelName}`);
      callbacks.onError('No se pudo restablecer la conexión realtime después de múltiples intentos');
    }
  }

  unsubscribeFromChanges(channel: RealtimeChannel): Promise<void> {
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
      // Canal removido
    }).catch((error) => {
      console.error('❌ Error removiendo canal realtime salas:', error);
      throw error;
    });
  }
}