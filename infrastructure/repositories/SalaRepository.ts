import { supabase } from "@/infrastructure/services/SupabaseClient";
import { Sala } from "@/domain/entities/Sala";
import { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeCallbacks {
  onSalasUpdated: (salas: Sala[]) => void;
  onError: (error: string) => void;
}

export class SalaRepository {

  // Obtener los IDs de salas de una organización con timeout
  async getSalaIdsByOrganizacion(idOrganizacion: string): Promise<string[]> {
    try {
      console.log('🏢 Obteniendo IDs de salas para organización:', idOrganizacion);

      // Crear timeout de 5 segundos
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

      // Asegurar que id_salas sea un array
      let idSalas = data?.id_salas || [];

      // Si no es un array, convertirlo
      if (!Array.isArray(idSalas)) {
        idSalas = [];
      }

      // Convertir todos los elementos a string
      const idSalasString = idSalas.map((id: any) => String(id));

      console.log('📋 IDs de salas encontrados:', idSalasString);
      return idSalasString;
    } catch (error) {
      console.error('❌ Error en getSalaIdsByOrganizacion:', error);
      return [];
    }
  }

  // Obtener información completa de las salas por sus IDs con timeout
  async getSalasByIds(salaIds: string[]): Promise<Sala[]> {
    try {
      if (salaIds.length === 0) {
        console.log('ℹ️ No hay IDs de salas para buscar');
        return [];
      }

      console.log('🔍 Buscando salas con IDs:', salaIds);

      // Convertir los IDs a números para la consulta (ya que el campo id es bigint)
      const salaIdsNumeric = salaIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

      if (salaIdsNumeric.length === 0) {
        console.log('⚠️ No se pudieron convertir los IDs a números válidos');
        return [];
      }

      // Crear timeout de 5 segundos
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

      // Marcar la primera sala como activa por defecto
      if (salas.length > 0) {
        salas[0].activa = true;
      }

      return salas;
    } catch (error) {
      console.error('❌ Error en getSalasByIds:', error);
      return [];
    }
  }

  // Método principal para obtener todas las salas de una organización con timeout global
  async getSalasByOrganizacion(idOrganizacion: string): Promise<Sala[]> {
    try {
      console.log('🚀 Iniciando carga de salas para organización:', idOrganizacion);

      // Timeout global de 8 segundos para todo el proceso
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout global en getSalasByOrganizacion')), 8000);
      });

      const loadSalasPromise = async () => {
        // Paso 1: Obtener los IDs de las salas
        const salaIds = await this.getSalaIdsByOrganizacion(idOrganizacion);

        if (salaIds.length === 0) {
          console.log('ℹ️ No se encontraron salas para esta organización');
          return [];
        }

        // Paso 2: Obtener la información completa de las salas
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

  // Suscribirse a cambios en tiempo real de la organización (optimizado)
  subscribeToOrganizacionChanges(idOrganizacion: string, callbacks: RealtimeCallbacks): RealtimeChannel {
    console.log('📡 Iniciando suscripción realtime para organización:', idOrganizacion);

    const channel = supabase
      .channel(`organizacion-salas-${idOrganizacion}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organizacion',
          filter: `id=eq.${idOrganizacion}`
        },
        async (payload) => {
          console.log('📡 Cambio detectado en organización:', payload);

          try {
            // Timeout para la recarga en tiempo real
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Timeout en realtime update')), 5000);
            });

            const updatePromise = this.getSalasByOrganizacion(idOrganizacion);
            const nuevasSalas = await Promise.race([updatePromise, timeoutPromise]);

            callbacks.onSalasUpdated(nuevasSalas);
          } catch (error) {
            console.error('❌ Error procesando cambio de organización:', error);
            callbacks.onError('Error al procesar cambios de la organización');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'sala'
        },
        async (payload) => {
          console.log('📡 Cambio detectado en sala:', payload);

          // Solo procesar si la sala pertenece a nuestra organización
          const salaData = payload.new || payload.old;
          if (salaData && salaData.id_organizacion === idOrganizacion) {
            try {
              const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Timeout en realtime sala update')), 5000);
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

  // Desuscribirse de cambios en tiempo real
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