import { supabase } from "@/infrastructure/services/SupabaseClient";
import { CardRepository } from "@/infrastructure/repositories/CardRepository";
import { CardDB, CreateCardDTO, UpdateCardDTO } from "@/domain/entities/Card";

export class SupabaseCardRepository implements CardRepository {

  /**
   * Obtiene todas las cards de una pizarra
   */
  async getCardsByPizarra(idPizarra: string, idProyecto?: number | null): Promise<CardDB[]> {
    try {
      let query = supabase
        .from('cards')
        .select('*')
        .eq('id_pizarra', idPizarra);

      // ❌ COLUMNA ELIMINADA: id_proyecto ya no existe en la tabla cards
      // Solo para pizarras de organización: separar cards de pizarra base vs proyecto
      /*
      if (idProyecto !== undefined) {
        if (idProyecto === null) {
          query = query.is('id_proyecto', null);
        } else {
          query = query.eq('id_proyecto', idProyecto);
        }
      }
      */

      const { data, error } = await query.order('z_index', { ascending: true });

      if (error) {
        console.error('❌ Error obteniendo cards:', error);
        return [];
      }

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
      // console.log('➕ Creando nueva card:', card.card_id);

      const { data, error } = await supabase
        .from('cards')
        .insert([card])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando card:', error);
        return null;
      }

      // console.log('✅ Card creada exitosamente:', data.id);
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
      // console.log('✏️ Actualizando card:', cardId);

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

      // console.log('✅ Card actualizada');
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
      // console.log('🗑️ Eliminando card:', cardId);

      // CRÍTICO: Filtrar por id_pizarra para evitar borrar la misma card de otras pizarras
      // (caso de cards persistentes). card_id identifica la card, pero id_pizarra identifica la instancia en esta pizarra.
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id_pizarra', idPizarra)
        .eq('card_id', cardId);

      if (error) {
        console.error('❌ Error eliminando card:', error);
        return false;
      }

      // console.log('✅ Card eliminada');
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
      // console.log('🔍 Obteniendo card:', cardId);

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

      // console.log('✅ Card encontrada');
      return data;
    } catch (error) {
      console.error('❌ Error en getCard:', error);
      return null;
    }
  }

  /**
   * Obtiene una card por su UUID de BD (para referencias en mensajes compartidos)
   */
  async getCardById(id: string): Promise<CardDB | null> {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error obteniendo card por ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error en getCardById:', error);
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
      // console.log('🗑️ Eliminando todas las cards de pizarra:', idPizarra);

      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id_pizarra', idPizarra);

      if (error) {
        console.error('❌ Error eliminando cards:', error);
        return false;
      }

      // console.log('✅ Todas las cards eliminadas');
      return true;
    } catch (error) {
      console.error('❌ Error en deleteAllCards:', error);
      return false;
    }
  }

  /**
   * Toggle persistencia de una card
   */
  async togglePersistent(idPizarra: string, cardId: string, isPersistent: boolean): Promise<boolean> {
    try {
      console.log(`📌 [Repo] Toggle persistent: pizarra=${idPizarra}, card=${cardId}, persistent=${isPersistent}`);
      // Remover filtro por id_pizarra para permitir toggle de cards persistentes de otras pizarras
      // card_id es único globalmente, no necesitamos filtrar por pizarra
      const { data, error } = await supabase
        .from('cards')
        .update({
          is_persistent: isPersistent,
          updated_at: new Date().toISOString()
        })
        .eq('card_id', cardId)
        .select();

      if (error) {
        console.error('❌ Error actualizando persistencia:', error);
        return false;
      }

      console.log(`📌 [Repo] Resultado update:`, data);
      return true;
    } catch (error) {
      console.error('❌ Error en togglePersistent:', error);
      return false;
    }
  }

  /**
   * Obtener cards persistentes de un usuario (excluyendo la pizarra actual)
   */
  async getPersistentCardsByUser(userId: string, excludePizarraId: string): Promise<CardDB[]> {
    try {
      console.log(`🔍 Buscando pizarras del usuario: ${userId}`);
      // Primero obtener las pizarras del usuario
      const { data: pizarras, error: pizarrasError } = await supabase
        .from('pizarras')
        .select('id')
        .eq('id_usuario', userId);

      if (pizarrasError || !pizarras) {
        console.error('❌ Error obteniendo pizarras del usuario:', pizarrasError);
        return [];
      }

      console.log(`🔍 Pizarras encontradas: ${pizarras.length}`, pizarras.map(p => p.id));

      // Obtener IDs de pizarras excluyendo la actual
      const pizarraIds = pizarras
        .map(p => p.id)
        .filter(id => id !== excludePizarraId);

      console.log(`🔍 Pizarras (excluyendo actual ${excludePizarraId}): ${pizarraIds.length}`);

      if (pizarraIds.length === 0) {
        console.log('⚠️ No hay otras pizarras para buscar cards persistentes');
        return [];
      }

      // Obtener cards persistentes de esas pizarras
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .in('id_pizarra', pizarraIds)
        .eq('is_persistent', true);

      if (error) {
        console.error('❌ Error obteniendo cards persistentes:', error);
        return [];
      }

      console.log(`📌 Cards persistentes encontradas en BD: ${data?.length || 0}`);
      return data || [];
    } catch (error) {
      console.error('❌ Error en getPersistentCardsByUser:', error);
      return [];
    }
  }
}
