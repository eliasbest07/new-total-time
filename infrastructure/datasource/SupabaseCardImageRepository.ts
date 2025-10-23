import { supabase } from "@/infrastructure/services/SupabaseClient";
import { CardImageRepository } from "@/infrastructure/repositories/CardImageRepository";
import { CardImage, CreateCardImageDTO, UpdateCardImageDTO } from "@/domain/entities/CardImage";

export class SupabaseCardImageRepository implements CardImageRepository {

  /**
   * Obtiene los datos de imagen por ID de card
   */
  async getByCardId(idCard: string): Promise<CardImage | null> {
    try {
      // console.log('🖼️ Obteniendo datos de imagen para card:', idCard);

      const { data, error } = await supabase
        .from('card_images')
        .select('*')
        .eq('id_card', idCard)
        .single();

      if (error) {
        // Si no existe, no es un error crítico
        if (error.code === 'PGRST116') {
          // console.log('ℹ️ No hay datos de imagen para esta card');
          return null;
        }
        console.error('❌ Error obteniendo datos de imagen:', error);
        return null;
      }

      // console.log('✅ Datos de imagen encontrados');
      return data;
    } catch (error) {
      console.error('❌ Error en getByCardId:', error);
      return null;
    }
  }

  /**
   * Crea datos de imagen para una card
   */
  async create(cardImage: CreateCardImageDTO): Promise<CardImage | null> {
    try {
      // console.log('➕ Creando datos de imagen para card:', cardImage.id_card);

      const { data, error } = await supabase
        .from('card_images')
        .insert([cardImage])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando datos de imagen:', error);
        return null;
      }

      // console.log('✅ Datos de imagen creados exitosamente');
      return data;
    } catch (error) {
      console.error('❌ Error en create:', error);
      return null;
    }
  }

  /**
   * Actualiza datos de imagen
   */
  async update(idCard: string, updates: UpdateCardImageDTO): Promise<CardImage | null> {
    try {
      // console.log('✏️ Actualizando datos de imagen para card:', idCard);

      const { data, error } = await supabase
        .from('card_images')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id_card', idCard)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando datos de imagen:', error);
        return null;
      }

      // console.log('✅ Datos de imagen actualizados');
      return data;
    } catch (error) {
      console.error('❌ Error en update:', error);
      return null;
    }
  }

  /**
   * Elimina datos de imagen
   */
  async delete(idCard: string): Promise<boolean> {
    try {
      // console.log('🗑️ Eliminando datos de imagen para card:', idCard);

      const { error } = await supabase
        .from('card_images')
        .delete()
        .eq('id_card', idCard);

      if (error) {
        console.error('❌ Error eliminando datos de imagen:', error);
        return false;
      }

      // console.log('✅ Datos de imagen eliminados');
      return true;
    } catch (error) {
      console.error('❌ Error en delete:', error);
      return false;
    }
  }
}
