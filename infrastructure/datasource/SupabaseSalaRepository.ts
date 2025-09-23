import { supabase } from "@/infrastructure/services/SupabaseClient";
import { Sala } from "@/domain/entities/Sala";
import { SalaRepository, RealtimeCallbacks } from "@/infrastructure/repositories/SalaRepository";
import { RealtimeChannel } from "@supabase/supabase-js";

export class SupabaseSalaRepository implements SalaRepository {

  async getSalaIdsByOrganizacion(idOrganizacion: string): Promise<string[]> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout en getSalaIdsByOrganizacion')), 5000);
      });

      const queryPromise = supabase
        .from('organizacion')
        .select('id_salas')
        .eq('id', idOrganizacion)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.error('❌ Error obteniendo IDs de salas:', error);
        return [];
      }

      let idSalas = data?.id_salas || [];

      if (!Array.isArray(idSalas)) {
        idSalas = [];
      }

      const idSalasString = idSalas.map((id: any) => String(id));

      console.log('📋 IDs de salas encontrados:', idSalasString);
      return idSalasString;
    } catch (error) {
      console.error('❌ Error en getSalaIdsByOrganizacion:', error);
      return [];
    }
  }

  async getSalasByIds(salaIds: string[]): Promise<Sala[]> {
    try {
      if (salaIds.length === 0) {
        console.log('ℹ️ No hay IDs de salas para buscar');
        return [];
      }

      console.log('🔍 Buscando salas con IDs:', salaIds);

      const salaIdsNumeric = salaIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

      if (salaIdsNumeric.length === 0) {
        console.log('⚠️ No se pudieron convertir los IDs a números válidos');
        return [];
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout en getSalasByIds')), 5000);
      });

      const queryPromise = supabase
        .from('sala')
        .select('*')
        .in('id', salaIdsNumeric);

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.error('❌ Error obteniendo salas:', error);
        return [];
      }

      const salas = data || [];
      console.log('🏠 Salas encontradas:', salas);

      if (salas.length > 0) {
        salas[0].activa = true;
      }

      return salas;
    } catch (error) {
      console.error('❌ Error en getSalasByIds:', error);
      return [];
    }
  }

  async getSalasByOrganizacion(idOrganizacion: string): Promise<Sala[]> {
    try {
      console.log('🚀 Iniciando carga de salas para organización:', idOrganizacion);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout global en getSalasByOrganizacion')), 10000);
      });

      const loadSalasPromise = async () => {
        const salaIds = await this.getSalaIdsByOrganizacion(idOrganizacion);

        if (salaIds.length === 0) {
          console.log('ℹ️ No se encontraron salas para esta organización');
          return [];
        }

        const salas = await this.getSalasByIds(salaIds);

        console.log('✅ Carga de salas completada:', salas.length, 'salas encontradas');
        return salas;
      };

      return await Promise.race([loadSalasPromise(), timeoutPromise]);
    } catch (error) {
      console.error('❌ Error en getSalasByOrganizacion:', error);
      return [];
    }
  }

  subscribeToSalasChanges(idOrganizacion: string, callbacks: RealtimeCallbacks): RealtimeChannel {
    console.log('📡 Iniciando suscripción realtime para salas de organización:', idOrganizacion);

    const channel = supabase
      .channel(`salas-${idOrganizacion}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sala'
        },
        async (payload) => {
          console.log('📡 Cambio detectado en sala:', payload);

          const salaData = payload.new || payload.old;
          if (salaData && (salaData as any).id_organizacion === idOrganizacion) {
            try {
              const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Timeout en realtime sala update')), 3000);
              });

              const updatePromise = this.getSalasByOrganizacion(idOrganizacion);
              const nuevasSalas = await Promise.race([updatePromise, timeoutPromise]);

              callbacks.onSalasUpdated(nuevasSalas);
            } catch (error) {
              console.error('❌ Error procesando cambio de sala:', error);
              callbacks.onError('Error al procesar cambios de sala');
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción realtime:', status);

        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscripción realtime activa');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en canal realtime');
          callbacks.onError('Error en la conexión realtime');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Timeout en suscripción realtime');
          callbacks.onError('Timeout en la conexión realtime');
        } else if (status === 'CLOSED') {
          console.log('🔒 Canal realtime cerrado');
        }
      });

    return channel;
  }

  unsubscribeFromChanges(channel: RealtimeChannel): Promise<void> {
    console.log('🧹 Desuscribiendo canal realtime');

    return supabase.removeChannel(channel).then(() => {
      console.log('✅ Canal realtime removido exitosamente');
    }).catch((error) => {
      console.error('❌ Error removiendo canal realtime:', error);
      throw error;
    });
  }
}