import { supabase } from "@/infrastructure/services/SupabaseClient";
import { CardRepository } from "@/infrastructure/repositories/CardRepository";
import { CardDB, CreateCardDTO, UpdateCardDTO } from "@/domain/entities/Card";

export class SupabaseCardRepository implements CardRepository {

  /**
   * Obtiene todas las cards de una pizarra
   */
  async getCardsByPizarra(idPizarra: string): Promise<CardDB[]> {
    try {
      console.log('🃏 Obteniendo cards de pizarra:', idPizarra);

      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('id_pizarra', idPizarra)
        .order('z_index', { ascending: true });

      if (error) {
        console.error('❌ Error obteniendo cards:', error);
        return [];
      }

      console.log('✅ Cards encontradas:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ Error en getCardsByPizarra:', error);
      return [];
    }
  }

  /**
   * Crea una nueva card
   */
  async createCard(card: CreateCardDTO): Promise<CardDB | null> {
    try {
      console.log('➕ Creando nueva card:', card.card_id);

      const { data, error } = await supabase
        .from('cards')
        .insert([card])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando card:', error);
        return null;
      }

      console.log('✅ Card creada exitosamente:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error en createCard:', error);
      return null;
    }
  }

  /**
   * Actualiza una card existente
   */
  async updateCard(idPizarra: string, cardId: string, updates: UpdateCardDTO): Promise<CardDB | null> {
    try {
      console.log('✏️ Actualizando card:', cardId);

      const { data, error } = await supabase
        .from('cards')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id_pizarra', idPizarra)
        .eq('card_id', cardId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando card:', error);
        return null;
      }

      console.log('✅ Card actualizada');
      return data;
    } catch (error) {
      console.error('❌ Error en updateCard:', error);
      return null;
    }
  }

  /**
   * Elimina una card
   */
  async deleteCard(idPizarra: string, cardId: string): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando card:', cardId);

      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id_pizarra', idPizarra)
        .eq('card_id', cardId);

      if (error) {
        console.error('❌ Error eliminando card:', error);
        return false;
      }

      console.log('✅ Card eliminada');
      return true;
    } catch (error) {
      console.error('❌ Error en deleteCard:', error);
      return false;
    }
  }

  /**
   * Obtiene una card específica
   */
  async getCard(idPizarra: string, cardId: string): Promise<CardDB | null> {
    try {
      console.log('🔍 Obteniendo card:', cardId);

      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('id_pizarra', idPizarra)
        .eq('card_id', cardId)
        .single();

      if (error) {
        console.error('❌ Error obteniendo card:', error);
        return null;
      }

      console.log('✅ Card encontrada');
      return data;
    } catch (error) {
      console.error('❌ Error en getCard:', error);
      return null;
    }
  }

  /**
   * Actualiza la posición de una card
   */
  async updateCardPosition(idPizarra: string, cardId: string, x: number, y: number): Promise<CardDB | null> {
    try {
      const { data, error } = await supabase
        .from('cards')
        .update({
          x,
          y,
          updated_at: new Date().toISOString()
        })
        .eq('id_pizarra', idPizarra)
        .eq('card_id', cardId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando posición:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Error en updateCardPosition:', error);
      return null;
    }
  }

  /**
   * Actualiza el tamaño de una card
   */
  async updateCardSize(idPizarra: string, cardId: string, width: number, height: number): Promise<CardDB | null> {
    try {
      const { data, error } = await supabase
        .from('cards')
        .update({
          width,
          height,
          updated_at: new Date().toISOString()
        })
        .eq('id_pizarra', idPizarra)
        .eq('card_id', cardId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando tamaño:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Error en updateCardSize:', error);
      return null;
    }
  }

  /**
   * Elimina todas las cards de una pizarra
   */
  async deleteAllCards(idPizarra: string): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando todas las cards de pizarra:', idPizarra);

      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id_pizarra', idPizarra);

      if (error) {
        console.error('❌ Error eliminando cards:', error);
        return false;
      }

      console.log('✅ Todas las cards eliminadas');
      return true;
    } catch (error) {
      console.error('❌ Error en deleteAllCards:', error);
      return false;
    }
  }
}
