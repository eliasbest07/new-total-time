import { supabase } from "@/infrastructure/services/SupabaseClient";
import { OrganizacionRepository } from "@/infrastructure/repositories/OrganizacionRepository";
import { Organizacion } from "@/domain/entities/Organizacion";

export class SupabaseOrganizacionRepository implements OrganizacionRepository {

  async getByUsuarioId(userId: string): Promise<Organizacion | null> {
    try {
      console.log('🏢 Obteniendo organización para usuario:', userId);

      // Primero obtenemos el usuario para obtener su id_organizacion
      const { data: userData, error: userError } = await supabase
        .from('usuario')
        .select('id_organizacion')
        .eq('id_usuario', userId)
        .single();

      if (userError || !userData?.id_organizacion) {
        console.error('❌ Error obteniendo usuario o sin organización:', userError);
        return null;
      }

      // Ahora obtenemos la organización por su ID
      const { data, error } = await supabase
        .from('organizacion')
        .select('*')
        .eq('id', userData.id_organizacion)
        .single();

      if (error) {
        console.error('❌ Error obteniendo organización:', error);
        return null;
      }

      console.log('✅ Organización encontrada:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en getByUsuarioId:', error);
      return null;
    }
  }

  async getById(id: string): Promise<Organizacion | null> {
    try {
      // console.log('🏢 Obteniendo organización por ID:', id);

      const { data, error } = await supabase
        .from('organizacion')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // console.error('❌ Error obteniendo organización:', error);
        return null;
      }

      // console.log('✅ Organización encontrada:', data);
      return data;
    } catch (error) {
      // console.error('❌ Error en getById:', error);
      return null;
    }
  }
}
