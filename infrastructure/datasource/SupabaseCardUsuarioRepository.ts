import { supabase } from "@/infrastructure/services/SupabaseClient";
import { CardUsuarioRepository } from "@/infrastructure/repositories/CardUsuarioRepository";
import { CardUsuario, CreateCardUsuarioDTO, UpdateCardUsuarioDTO } from "@/domain/entities/CardUsuario";

export class SupabaseCardUsuarioRepository implements CardUsuarioRepository {

  /**
   * Obtiene los datos de usuario por ID de card
   */
  async getByCardId(idCard: string): Promise<CardUsuario | null> {
    try {
      // console.log('👤 Obteniendo datos de usuario para card:', idCard);

      const { data, error } = await supabase
        .from('card_usuarios')
        .select('*')
        .eq('id_card', idCard)
        .single();

      if (error) {
        // Si no existe, no es un error crítico
        if (error.code === 'PGRST116') {
          // console.log('ℹ️ No hay datos de usuario para esta card');
          return null;
        }
        console.error('❌ Error obteniendo datos de usuario:', error);
        return null;
      }

      // console.log('✅ Datos de usuario encontrados');
      return data;
    } catch (error) {
      console.error('❌ Error en getByCardId:', error);
      return null;
    }
  }

  /**
   * Crea datos de usuario para una card
   */
  async create(cardUsuario: CreateCardUsuarioDTO): Promise<CardUsuario | null> {
    try {
      // console.log('➕ Creando datos de usuario para card:', cardUsuario.id_card);

      const { data, error } = await supabase
        .from('card_usuarios')
        .insert([cardUsuario])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando datos de usuario:', error);
        return null;
      }

      // console.log('✅ Datos de usuario creados exitosamente');
      return data;
    } catch (error) {
      console.error('❌ Error en create:', error);
      return null;
    }
  }

  /**
   * Actualiza datos de usuario
   */
  async update(idCard: string, updates: UpdateCardUsuarioDTO): Promise<CardUsuario | null> {
    try {
      // console.log('✏️ Actualizando datos de usuario para card:', idCard);

      const { data, error } = await supabase
        .from('card_usuarios')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id_card', idCard)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando datos de usuario:', error);
        return null;
      }

      // console.log('✅ Datos de usuario actualizados');
      return data;
    } catch (error) {
      console.error('❌ Error en update:', error);
      return null;
    }
  }

  /**
   * Elimina datos de usuario
   */
  async delete(idCard: string): Promise<boolean> {
    try {
      // console.log('🗑️ Eliminando datos de usuario para card:', idCard);

      const { error } = await supabase
        .from('card_usuarios')
        .delete()
        .eq('id_card', idCard);

      if (error) {
        console.error('❌ Error eliminando datos de usuario:', error);
        return false;
      }

      // console.log('✅ Datos de usuario eliminados');
      return true;
    } catch (error) {
      console.error('❌ Error en delete:', error);
      return false;
    }
  }
}
