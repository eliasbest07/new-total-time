import { supabase } from "@/infrastructure/services/SupabaseClient";
import { ProyectoRepository } from "@/infrastructure/repositories/ProyectoRepository";
import { Proyecto } from "@/domain/entities/Proyecto";
import { Mision } from "@/domain/entities/Mision";
import { Actividad } from "@/domain/entities/Actividad";

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

  async getProyectosByOrganizacion(organizacionId: string): Promise<Proyecto[]> {
    try {
      console.log('📁 Obteniendo proyectos para organización:', organizacionId);

      // Primero obtenemos los IDs de proyectos de la organización
      const { data: orgData, error: orgError } = await supabase
        .from('organizacion')
        .select('id_proyectos')
        .eq('id', organizacionId)
        .single();

      if (orgError || !orgData?.id_proyectos || orgData.id_proyectos.length === 0) {
        console.log('ℹ️ No hay proyectos en esta organización');
        return [];
      }

      // Obtenemos los proyectos por sus IDs
      const { data: proyectosData, error: proyectosError } = await supabase
        .from('proyectos')
        .select('*')
        .in('id', orgData.id_proyectos)
        .order('created_at', { ascending: false });

      if (proyectosError) {
        console.error('❌ Error obteniendo proyectos:', proyectosError);
        return [];
      }

      const proyectos: Proyecto[] = proyectosData || [];

      // Populamos misiones y actividades para cada proyecto
      await Promise.all(proyectos.map(async (proyecto) => {
        // Cargar misiones
        if (proyecto.id_misiones && proyecto.id_misiones.length > 0) {
          const { data: misionesData } = await supabase
            .from('misiones')
            .select('*')
            .in('id', proyecto.id_misiones);
          proyecto.misiones = misionesData || [];
        } else {
          proyecto.misiones = [];
        }

        // Cargar actividades
        if (proyecto.id_actividades && proyecto.id_actividades.length > 0) {
          const { data: actividadesData } = await supabase
            .from('actividades')
            .select('*')
            .in('id', proyecto.id_actividades);
          proyecto.actividades = actividadesData || [];
        } else {
          proyecto.actividades = [];
        }
      }));

      console.log('✅ Proyectos con misiones y actividades cargados:', proyectos.length);
      return proyectos;
    } catch (error) {
      console.error('❌ Error en getProyectosByOrganizacion:', error);
      return [];
    }
  }
}