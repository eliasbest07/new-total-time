import { supabase } from "@/infrastructure/services/SupabaseClient";
import { CardActividadRepository } from "@/infrastructure/repositories/CardActividadRepository";
import { CardActividad, CreateCardActividadDTO, UpdateCardActividadDTO } from "@/domain/entities/CardActividad";

export class SupabaseCardActividadRepository implements CardActividadRepository {

  /**
   * Obtiene los datos de actividad por ID de card
   */
  async getByCardId(idCard: string): Promise<CardActividad | null> {
    try {
      console.log('📅 Obteniendo datos de actividad para card:', idCard);

      const { data, error } = await supabase
        .from('card_actividades')
        .select('*')
        .eq('id_card', idCard)
        .single();

      if (error) {
        // Si no existe, no es un error crítico
        if (error.code === 'PGRST116') {
          console.log('ℹ️ No hay datos de actividad para esta card');
          return null;
        }
        console.error('❌ Error obteniendo datos de actividad:', error);
        return null;
      }

      console.log('✅ Datos de actividad encontrados');
      return data;
    } catch (error) {
      console.error('❌ Error en getByCardId:', error);
      return null;
    }
  }

  /**
   * Crea datos de actividad para una card
   */
  async create(cardActividad: CreateCardActividadDTO): Promise<CardActividad | null> {
    try {
      console.log('➕ Creando datos de actividad para card:', cardActividad.id_card);

      const { data, error } = await supabase
        .from('card_actividades')
        .insert([cardActividad])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando datos de actividad:', error);
        return null;
      }

      console.log('✅ Datos de actividad creados exitosamente');
      return data;
    } catch (error) {
      console.error('❌ Error en create:', error);
      return null;
    }
  }

  /**
   * Actualiza datos de actividad
   */
  async update(idCard: string, updates: UpdateCardActividadDTO): Promise<CardActividad | null> {
    try {
      console.log('✏️ Actualizando datos de actividad para card:', idCard);

      const { data, error } = await supabase
        .from('card_actividades')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id_card', idCard)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando datos de actividad:', error);
        return null;
      }

      console.log('✅ Datos de actividad actualizados');
      return data;
    } catch (error) {
      console.error('❌ Error en update:', error);
      return null;
    }
  }

  /**
   * Elimina datos de actividad
   */
  async delete(idCard: string): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando datos de actividad para card:', idCard);

      const { error } = await supabase
        .from('card_actividades')
        .delete()
        .eq('id_card', idCard);

      if (error) {
        console.error('❌ Error eliminando datos de actividad:', error);
        return false;
      }

      console.log('✅ Datos de actividad eliminados');
      return true;
    } catch (error) {
      console.error('❌ Error en delete:', error);
      return false;
    }
  }

  /**
   * Actualiza el estado de ejecución (play/pause)
   */
  async updateRunningState(idCard: string, isRunning: boolean): Promise<CardActividad | null> {
    try {
      console.log('▶️ Actualizando estado de ejecución:', isRunning ? 'corriendo' : 'pausado');

      const { data, error } = await supabase
        .from('card_actividades')
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
}
