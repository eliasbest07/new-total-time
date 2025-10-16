import { supabase } from "@/infrastructure/services/SupabaseClient";
import { CardMisionRepository } from "@/infrastructure/repositories/CardMisionRepository";
import { CardMision, CreateCardMisionDTO, UpdateCardMisionDTO } from "@/domain/entities/CardMision";

export class SupabaseCardMisionRepository implements CardMisionRepository {

  /**
   * Obtiene los datos de misión por ID de card
   */
  async getByCardId(idCard: string): Promise<CardMision | null> {
    try {
      console.log('🎯 Obteniendo datos de misión para card:', idCard);

      const { data, error } = await supabase
        .from('card_misiones')
        .select('*')
        .eq('id_card', idCard)
        .single();

      if (error) {
        // Si no existe, no es un error crítico
        if (error.code === 'PGRST116') {
          console.log('ℹ️ No hay datos de misión para esta card');
          return null;
        }
        console.error('❌ Error obteniendo datos de misión:', error);
        return null;
      }

      console.log('✅ Datos de misión encontrados');
      return data;
    } catch (error) {
      console.error('❌ Error en getByCardId:', error);
      return null;
    }
  }

  /**
   * Obtiene los datos de misión por ID de misión
   */
  async getByMisionId(idMision: number): Promise<CardMision | null> {
    try {
      console.log('🎯 Obteniendo datos de card para misión:', idMision);

      const { data, error } = await supabase
        .from('card_misiones')
        .select('*')
        .eq('id_mision', idMision)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ No hay card asociada a esta misión');
          return null;
        }
        console.error('❌ Error obteniendo datos de misión:', error);
        return null;
      }

      console.log('✅ Datos de misión encontrados');
      return data;
    } catch (error) {
      console.error('❌ Error en getByMisionId:', error);
      return null;
    }
  }

  /**
   * Crea datos de misión para una card
   */
  async create(cardMision: CreateCardMisionDTO): Promise<CardMision | null> {
    try {
      console.log('➕ Creando datos de misión para card:', cardMision.id_card);

      const { data, error } = await supabase
        .from('card_misiones')
        .insert([cardMision])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando datos de misión:', error);
        return null;
      }

      console.log('✅ Datos de misión creados exitosamente');
      return data;
    } catch (error) {
      console.error('❌ Error en create:', error);
      return null;
    }
  }

  /**
   * Actualiza datos de misión
   */
  async update(idCard: string, updates: UpdateCardMisionDTO): Promise<CardMision | null> {
    try {
      console.log('✏️ Actualizando datos de misión para card:', idCard);

      const { data, error } = await supabase
        .from('card_misiones')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id_card', idCard)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando datos de misión:', error);
        return null;
      }

      console.log('✅ Datos de misión actualizados');
      return data;
    } catch (error) {
      console.error('❌ Error en update:', error);
      return null;
    }
  }

  /**
   * Elimina datos de misión
   */
  async delete(idCard: string): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando datos de misión para card:', idCard);

      const { error } = await supabase
        .from('card_misiones')
        .delete()
        .eq('id_card', idCard);

      if (error) {
        console.error('❌ Error eliminando datos de misión:', error);
        return false;
      }

      console.log('✅ Datos de misión eliminados');
      return true;
    } catch (error) {
      console.error('❌ Error en delete:', error);
      return false;
    }
  }

  /**
   * Actualiza el estado de ejecución (play/pause)
   */
  async updateRunningState(idCard: string, isRunning: boolean): Promise<CardMision | null> {
    try {
      console.log('▶️ Actualizando estado de ejecución:', isRunning ? 'corriendo' : 'pausado');

      const { data, error } = await supabase
        .from('card_misiones')
        .update({
          is_running: isRunning,
          updated_at: new Date().toISOString()
        })
        .eq('id_card', idCard)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando estado:', error);
        return null;
      }

      console.log('✅ Estado actualizado');
      return data;
    } catch (error) {
      console.error('❌ Error en updateRunningState:', error);
      return null;
    }
  }

  /**
   * Actualiza la URL de la última captura
   */
  async updateLastCapture(idCard: string, lastCaptureUrl: string): Promise<CardMision | null> {
    try {
      console.log('📸 Actualizando última captura');

      const { data, error } = await supabase
        .from('card_misiones')
        .update({
          last_capture_url: lastCaptureUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id_card', idCard)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando captura:', error);
        return null;
      }

      console.log('✅ Captura actualizada');
      return data;
    } catch (error) {
      console.error('❌ Error en updateLastCapture:', error);
      return null;
    }
  }
}
