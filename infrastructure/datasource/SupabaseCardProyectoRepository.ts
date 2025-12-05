import { supabase } from "@/infrastructure/services/SupabaseClient";
import { CardProyectoRepository } from "@/infrastructure/repositories/CardProyectoRepository";
import { CardProyecto, CreateCardProyectoDTO, UpdateCardProyectoDTO } from "@/domain/entities/CardProyecto";

export class SupabaseCardProyectoRepository implements CardProyectoRepository {

  /**
   * Obtiene la relación card-proyecto por ID de card
   */
  async getByCardId(idCard: string): Promise<CardProyecto | null> {
    try {
      console.log('📁 [CardProyecto] Obteniendo datos de proyecto para card:', idCard);

      const { data, error } = await supabase
        .from('card_proyectos')
        .select('*')
        .eq('id_card', idCard)
        .maybeSingle();

      if (error) {
        // Si no existe, no es un error crítico
        if (error.code === 'PGRST116') {
          console.log('ℹ️ [CardProyecto] No hay datos de proyecto para esta card');
          return null;
        }
        console.error('❌ [CardProyecto] Error obteniendo datos de proyecto:', error);
        return null;
      }

      if (!data) {
        console.log('ℹ️ [CardProyecto] No se encontró relación card-proyecto');
        return null;
      }

      console.log('✅ [CardProyecto] Datos de proyecto encontrados:', data);
      return data;
    } catch (error) {
      console.error('❌ [CardProyecto] Error en getByCardId:', error);
      return null;
    }
  }

  /**
   * Obtiene la relación card-proyecto por ID de proyecto
   */
  async getByProyectoId(idProyecto: number): Promise<CardProyecto | null> {
    try {
      console.log('📁 [CardProyecto] Obteniendo card para proyecto:', idProyecto);

      const { data, error } = await supabase
        .from('card_proyectos')
        .select('*')
        .eq('id_proyecto', idProyecto)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ [CardProyecto] No hay card asociada a este proyecto');
          return null;
        }
        console.error('❌ [CardProyecto] Error obteniendo datos de proyecto:', error);
        return null;
      }

      if (!data) {
        console.log('ℹ️ [CardProyecto] No se encontró card para el proyecto');
        return null;
      }

      console.log('✅ [CardProyecto] Card de proyecto encontrada');
      return data;
    } catch (error) {
      console.error('❌ [CardProyecto] Error en getByProyectoId:', error);
      return null;
    }
  }

  /**
   * Crea una relación card-proyecto
   */
  async create(cardProyecto: CreateCardProyectoDTO): Promise<CardProyecto | null> {
    try {
      console.log('➕ [CardProyecto] Creando relación card-proyecto:', cardProyecto);

      const { data, error } = await supabase
        .from('card_proyectos')
        .insert([cardProyecto])
        .select()
        .single();

      if (error) {
        console.error('❌ [CardProyecto] Error creando relación:', error);
        return null;
      }

      console.log('✅ [CardProyecto] Relación creada exitosamente');
      return data;
    } catch (error) {
      console.error('❌ [CardProyecto] Error en create:', error);
      return null;
    }
  }

  /**
   * Actualiza una relación card-proyecto
   */
  async update(idCard: string, updates: UpdateCardProyectoDTO): Promise<CardProyecto | null> {
    try {
      console.log('✏️ [CardProyecto] Actualizando relación card-proyecto:', idCard);

      const { data, error } = await supabase
        .from('card_proyectos')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id_card', idCard)
        .select()
        .single();

      if (error) {
        console.error('❌ [CardProyecto] Error actualizando relación:', error);
        return null;
      }

      console.log('✅ [CardProyecto] Relación actualizada');
      return data;
    } catch (error) {
      console.error('❌ [CardProyecto] Error en update:', error);
      return null;
    }
  }

  /**
   * Elimina una relación card-proyecto
   */
  async delete(idCard: string): Promise<boolean> {
    try {
      console.log('🗑️ [CardProyecto] Eliminando relación card-proyecto:', idCard);

      const { error } = await supabase
        .from('card_proyectos')
        .delete()
        .eq('id_card', idCard);

      if (error) {
        console.error('❌ [CardProyecto] Error eliminando relación:', error);
        return false;
      }

      console.log('✅ [CardProyecto] Relación eliminada');
      return true;
    } catch (error) {
      console.error('❌ [CardProyecto] Error en delete:', error);
      return false;
    }
  }
}
