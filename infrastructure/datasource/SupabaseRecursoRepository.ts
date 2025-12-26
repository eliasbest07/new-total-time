import { supabase } from "@/infrastructure/services/SupabaseClient";
import { RecursoRepository } from "@/infrastructure/repositories/RecursoRepository";
import { Recurso } from "@/domain/entities/Recurso";

export class SupabaseRecursoRepository implements RecursoRepository {

  async getRecursosByUsuario(idUsuario: string): Promise<Recurso[]> {
    try {
      // console.log('📚 Obteniendo recursos para usuario:', idUsuario);

      const { data, error } = await supabase
        .from('recursos')
        .select('*')
        .eq('id_usuario', idUsuario)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo recursos:', error);
        return [];
      }

      const recursos = data || [];
      // console.log('✅ Recursos encontrados:', recursos.length);
      return recursos;
    } catch (error) {
      console.error('❌ Error en getRecursosByUsuario:', error);
      return [];
    }
  }

  async createRecurso(recurso: Omit<Recurso, 'id' | 'created_at'>): Promise<Recurso | null> {
    try {
      // console.log('➕ Creando nuevo recurso:', recurso);

      const { data, error } = await supabase
        .from('recursos')
        .insert([recurso])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando recurso:', error);
        return null;
      }

      // console.log('✅ Recurso creado exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en createRecurso:', error);
      return null;
    }
  }

  async updateRecurso(id: number, recurso: Partial<Recurso>): Promise<Recurso | null> {
    try {
      // console.log('✏️ Actualizando recurso:', id, recurso);

      const { data, error } = await supabase
        .from('recursos')
        .update(recurso)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando recurso:', error);
        return null;
      }

      // console.log('✅ Recurso actualizado exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en updateRecurso:', error);
      return null;
    }
  }

  async deleteRecurso(id: number): Promise<boolean> {
    try {
      console.log('[deleteRecurso] Iniciando eliminación, id:', id);

      const { error, count } = await supabase
        .from('recursos')
        .delete({ count: 'exact' })
        .eq('id', id);

      console.log('[deleteRecurso] Resultado:', { error, count });

      if (error) {
        console.error('❌ Error eliminando recurso:', error);
        return false;
      }

      if (count === 0) {
        console.warn('⚠️ [deleteRecurso] No se eliminó ninguna fila. Posible problema de RLS.');
      }

      console.log('✅ Recurso eliminado, filas:', count);
      return count !== null && count > 0;
    } catch (error) {
      console.error('❌ Error en deleteRecurso:', error);
      return false;
    }
  }

  async getRecursoById(id: number): Promise<Recurso | null> {
    try {
      // console.log('🔍 Obteniendo recurso por ID:', id);

      const { data, error } = await supabase
        .from('recursos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo recurso:', error);
        return null;
      }

      // console.log('✅ Recurso encontrado:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en getRecursoById:', error);
      return null;
    }
  }


}