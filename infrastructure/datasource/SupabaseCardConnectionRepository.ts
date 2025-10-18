import { supabase } from "@/infrastructure/services/SupabaseClient";
import { CardConnectionRepository } from "@/infrastructure/repositories/CardConnectionRepository";
import { CardConnection, CreateCardConnectionDTO, UpdateCardConnectionDTO } from "@/domain/entities/CardConnection";

export class SupabaseCardConnectionRepository implements CardConnectionRepository {

  /**
   * Obtiene todas las conexiones de una pizarra
   */
  async getByPizarraId(idPizarra: string): Promise<CardConnection[]> {
    try {
      console.log('🔗 Obteniendo conexiones de pizarra:', idPizarra);

      const { data, error } = await supabase
        .from('card_connections')
        .select('*')
        .eq('id_pizarra', idPizarra);

      if (error) {
        console.error('❌ Error obteniendo conexiones:', error);
        return [];
      }

      console.log(`✅ ${data?.length || 0} conexiones encontradas`);
      return data || [];
    } catch (error) {
      console.error('❌ Error en getByPizarraId:', error);
      return [];
    }
  }

  /**
   * Obtiene una conexión específica por ID
   */
  async getByConnectionId(idPizarra: string, connectionId: string): Promise<CardConnection | null> {
    try {
      console.log('🔗 Obteniendo conexión:', connectionId);

      const { data, error } = await supabase
        .from('card_connections')
        .select('*')
        .eq('id_pizarra', idPizarra)
        .eq('connection_id', connectionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ Conexión no encontrada');
          return null;
        }
        console.error('❌ Error obteniendo conexión:', error);
        return null;
      }

      console.log('✅ Conexión encontrada');
      return data;
    } catch (error) {
      console.error('❌ Error en getByConnectionId:', error);
      return null;
    }
  }

  /**
   * Obtiene todas las conexiones que salen de una card
   */
  async getByFromCardId(idPizarra: string, fromCardId: string): Promise<CardConnection[]> {
    try {
      console.log('🔗 Obteniendo conexiones desde card:', fromCardId);

      const { data, error } = await supabase
        .from('card_connections')
        .select('*')
        .eq('id_pizarra', idPizarra)
        .eq('from_card_id', fromCardId);

      if (error) {
        console.error('❌ Error obteniendo conexiones:', error);
        return [];
      }

      console.log(`✅ ${data?.length || 0} conexiones desde card encontradas`);
      return data || [];
    } catch (error) {
      console.error('❌ Error en getByFromCardId:', error);
      return [];
    }
  }

  /**
   * Obtiene todas las conexiones que llegan a una card
   */
  async getByToCardId(idPizarra: string, toCardId: string): Promise<CardConnection[]> {
    try {
      console.log('🔗 Obteniendo conexiones hacia card:', toCardId);

      const { data, error } = await supabase
        .from('card_connections')
        .select('*')
        .eq('id_pizarra', idPizarra)
        .eq('to_card_id', toCardId);

      if (error) {
        console.error('❌ Error obteniendo conexiones:', error);
        return [];
      }

      console.log(`✅ ${data?.length || 0} conexiones hacia card encontradas`);
      return data || [];
    } catch (error) {
      console.error('❌ Error en getByToCardId:', error);
      return [];
    }
  }

  /**
   * Crea una nueva conexión
   */
  async create(connection: CreateCardConnectionDTO): Promise<CardConnection | null> {
    try {
      console.log('➕ Creando conexión:', connection.connection_id);

      const { data, error } = await supabase
        .from('card_connections')
        .insert([connection])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando conexión:', error);
        return null;
      }

      console.log('✅ Conexión creada exitosamente');
      return data;
    } catch (error) {
      console.error('❌ Error en create:', error);
      return null;
    }
  }

  /**
   * Actualiza una conexión
   */
  async update(idPizarra: string, connectionId: string, updates: UpdateCardConnectionDTO): Promise<CardConnection | null> {
    try {
      console.log('✏️ Actualizando conexión:', connectionId);

      const { data, error } = await supabase
        .from('card_connections')
        .update(updates)
        .eq('id_pizarra', idPizarra)
        .eq('connection_id', connectionId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando conexión:', error);
        return null;
      }

      console.log('✅ Conexión actualizada');
      return data;
    } catch (error) {
      console.error('❌ Error en update:', error);
      return null;
    }
  }

  /**
   * Elimina una conexión específica
   */
  async delete(idPizarra: string, connectionId: string): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando conexión:', connectionId);

      const { error } = await supabase
        .from('card_connections')
        .delete()
        .eq('id_pizarra', idPizarra)
        .eq('connection_id', connectionId);

      if (error) {
        console.error('❌ Error eliminando conexión:', error);
        return false;
      }

      console.log('✅ Conexión eliminada');
      return true;
    } catch (error) {
      console.error('❌ Error en delete:', error);
      return false;
    }
  }

  /**
   * Elimina todas las conexiones de una pizarra
   */
  async deleteAllByPizarra(idPizarra: string): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando todas las conexiones de pizarra:', idPizarra);

      const { error } = await supabase
        .from('card_connections')
        .delete()
        .eq('id_pizarra', idPizarra);

      if (error) {
        console.error('❌ Error eliminando conexiones:', error);
        return false;
      }

      console.log('✅ Todas las conexiones eliminadas');
      return true;
    } catch (error) {
      console.error('❌ Error en deleteAllByPizarra:', error);
      return false;
    }
  }

  /**
   * Elimina todas las conexiones asociadas a una card
   * (cuando se elimina la card, eliminar conexiones de origen y destino)
   */
  async deleteByCardId(idPizarra: string, cardId: string): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando conexiones de card:', cardId);

      // Eliminar conexiones donde la card es origen
      const { error: fromError } = await supabase
        .from('card_connections')
        .delete()
        .eq('id_pizarra', idPizarra)
        .eq('from_card_id', cardId);

      if (fromError) {
        console.error('❌ Error eliminando conexiones from:', fromError);
        return false;
      }

      // Eliminar conexiones donde la card es destino
      const { error: toError } = await supabase
        .from('card_connections')
        .delete()
        .eq('id_pizarra', idPizarra)
        .eq('to_card_id', cardId);

      if (toError) {
        console.error('❌ Error eliminando conexiones to:', toError);
        return false;
      }

      console.log('✅ Conexiones de card eliminadas');
      return true;
    } catch (error) {
      console.error('❌ Error en deleteByCardId:', error);
      return false;
    }
  }
}
