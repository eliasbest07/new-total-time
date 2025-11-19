import { supabase } from "@/infrastructure/services/SupabaseClient";
import { CardProyectoNotaRepository } from "@/infrastructure/repositories/CardProyectoNotaRepository";
import { CardProyectoNota, CreateCardProyectoNotaDTO, UpdateCardProyectoNotaDTO } from "@/domain/entities/CardProyectoNota";

export class SupabaseCardProyectoNotaRepository implements CardProyectoNotaRepository {

  /**
   * Obtiene todas las notas asociadas a un card de proyecto
   */
  async getByCardProyectoId(idCardProyecto: string): Promise<CardProyectoNota[]> {
    try {
      const { data, error } = await supabase
        .from('card_proyecto_notas')
        .select('*')
        .eq('id_card_proyecto', idCardProyecto)
        .order('position', { ascending: true });

      if (error) {
        console.error('❌ Error obteniendo notas del proyecto:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error en getByCardProyectoId:', error);
      return [];
    }
  }

  /**
   * Crea una nueva relación proyecto-nota
   */
  async create(data: CreateCardProyectoNotaDTO): Promise<CardProyectoNota | null> {
    try {
      const { data: created, error } = await supabase
        .from('card_proyecto_notas')
        .insert([data])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando relación proyecto-nota:', error);
        return null;
      }

      return created;
    } catch (error) {
      console.error('❌ Error en create:', error);
      return null;
    }
  }

  /**
   * Actualiza una relación proyecto-nota
   */
  async update(id: string, updates: UpdateCardProyectoNotaDTO): Promise<CardProyectoNota | null> {
    try {
      const { data, error } = await supabase
        .from('card_proyecto_notas')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando relación proyecto-nota:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Error en update:', error);
      return null;
    }
  }

  /**
   * Elimina una relación proyecto-nota
   */
  async delete(idCardProyecto: string, idCardNota: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('card_proyecto_notas')
        .delete()
        .eq('id_card_proyecto', idCardProyecto)
        .eq('id_card_nota', idCardNota);

      if (error) {
        console.error('❌ Error eliminando relación proyecto-nota:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error en delete:', error);
      return false;
    }
  }

  /**
   * Elimina todas las notas de un proyecto
   */
  async deleteAllByProyecto(idCardProyecto: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('card_proyecto_notas')
        .delete()
        .eq('id_card_proyecto', idCardProyecto);

      if (error) {
        console.error('❌ Error eliminando todas las notas del proyecto:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error en deleteAllByProyecto:', error);
      return false;
    }
  }
}
