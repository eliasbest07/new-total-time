import { supabase } from "@/infrastructure/services/SupabaseClient";
import { PizarraRepository } from "@/infrastructure/repositories/PizarraRepository";
import { Pizarra } from "@/domain/entities/Pizarra";

export class SupabasePizarraRepository implements PizarraRepository {

  /**
   * Obtiene la pizarra del día para un usuario específico.
   * Si no existe, la crea automáticamente.
   */
  async getPizarraDelDia(idUsuario: string, fecha: Date): Promise<Pizarra | null> {
    try {
      console.log('🎨 Obteniendo pizarra del día para usuario:', idUsuario, 'fecha:', fecha);

      // Normalizar la fecha al inicio del día (00:00:00)
      const startOfDay = new Date(fecha);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(fecha);
      endOfDay.setHours(23, 59, 59, 999);

      // Buscar pizarra del día
      const { data, error } = await supabase
        .from('pizarras')
        .select('*')
        .eq('id_usuario', idUsuario)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Error obteniendo pizarra del día:', error);
        return null;
      }

      // Si existe, retornarla
      if (data) {
        console.log('✅ Pizarra del día encontrada:', data.id);
        return data;
      }

      // Si no existe, crear una nueva
      console.log('📝 No existe pizarra del día, creando una nueva...');
      return await this.createPizarra({
        id_usuario: idUsuario,
        pan_offset_x: 0,
        pan_offset_y: 0
      });

    } catch (error) {
      console.error('❌ Error en getPizarraDelDia:', error);
      return null;
    }
  }

  /**
   * Actualiza el pan offset de una pizarra
   */
  async updatePanOffset(id: string, panOffsetX: number, panOffsetY: number): Promise<Pizarra | null> {
    try {
      console.log('🎨 Actualizando pan offset de pizarra:', id);

      const { data, error } = await supabase
        .from('pizarras')
        .update({
          pan_offset_x: panOffsetX,
          pan_offset_y: panOffsetY,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando pan offset:', error);
        return null;
      }

      console.log('✅ Pan offset actualizado');
      return data;
    } catch (error) {
      console.error('❌ Error en updatePanOffset:', error);
      return null;
    }
  }

  /**
   * Obtiene una pizarra por su ID
   */
  async getPizarraById(id: string): Promise<Pizarra | null> {
    try {
      console.log('🎨 Obteniendo pizarra por ID:', id);

      const { data, error } = await supabase
        .from('pizarras')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo pizarra:', error);
        return null;
      }

      console.log('✅ Pizarra encontrada:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error en getPizarraById:', error);
      return null;
    }
  }

  /**
   * Crea una nueva pizarra
   */
  async createPizarra(pizarra: Omit<Pizarra, 'id' | 'created_at' | 'updated_at'>): Promise<Pizarra | null> {
    try {
      console.log('➕ Creando nueva pizarra para usuario:', pizarra.id_usuario);

      const { data, error } = await supabase
        .from('pizarras')
        .insert([pizarra])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando pizarra:', error);
        return null;
      }

      console.log('✅ Pizarra creada exitosamente:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error en createPizarra:', error);
      return null;
    }
  }
}
