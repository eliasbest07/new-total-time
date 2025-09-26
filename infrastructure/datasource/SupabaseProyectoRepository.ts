import { supabase } from "@/infrastructure/services/SupabaseClient";
import { ProyectoRepository } from "@/infrastructure/repositories/ProyectoRepository";
import { Proyecto } from "@/domain/entities/Proyecto";

export class SupabaseProyectoRepository implements ProyectoRepository {

  async getProyectosByUsuario(userId: string): Promise<Proyecto[]> {
    try {
      console.log('📁 Obteniendo proyectos para usuario:', userId);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout en getProyectosByUsuario')), 5000);
      });

      const queryPromise = supabase
        .from('proyectos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.error('❌ Error obteniendo proyectos:', error);
        return [];
      }

      const proyectos = data || [];
      console.log('✅ Proyectos encontrados:', proyectos.length);
      return proyectos;
    } catch (error) {
      console.error('❌ Error en getProyectosByUsuario:', error);
      return [];
    }
  }

  async createProyecto(proyecto: Omit<Proyecto, 'id' | 'created_at'>): Promise<Proyecto | null> {
    try {
      console.log('➕ Creando nuevo proyecto:', proyecto);

      const { data, error } = await supabase
        .from('proyectos')
        .insert([proyecto])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando proyecto:', error);
        return null;
      }

      console.log('✅ Proyecto creado exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en createProyecto:', error);
      return null;
    }
  }

  async updateProyecto(id: number, proyecto: Partial<Proyecto>): Promise<Proyecto | null> {
    try {
      console.log('✏️ Actualizando proyecto:', id, proyecto);

      const { data, error } = await supabase
        .from('proyectos')
        .update(proyecto)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando proyecto:', error);
        return null;
      }

      console.log('✅ Proyecto actualizado exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en updateProyecto:', error);
      return null;
    }
  }

  async deleteProyecto(id: number): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando proyecto:', id);

      const { error } = await supabase
        .from('proyectos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error eliminando proyecto:', error);
        return false;
      }

      console.log('✅ Proyecto eliminado exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error en deleteProyecto:', error);
      return false;
    }
  }

  async getProyectoById(id: number): Promise<Proyecto | null> {
    try {
      console.log('🔍 Obteniendo proyecto por ID:', id);

      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo proyecto:', error);
        return null;
      }

      console.log('✅ Proyecto encontrado:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en getProyectoById:', error);
      return null;
    }
  }
}