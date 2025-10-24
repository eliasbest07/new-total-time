import { supabase } from "@/infrastructure/services/SupabaseClient";
import { OrganizacionRepository } from "@/infrastructure/repositories/OrganizacionRepository";
import { Organizacion } from "@/domain/entities/Organizacion";

export class SupabaseOrganizacionRepository implements OrganizacionRepository {

  async getByUsuarioId(userId: string): Promise<Organizacion | null> {
    try {
      // console.log('🏢 Obteniendo organización para usuario:', userId);

      // Primero obtener el id_organizacion del usuario
      const { data: userData, error: userError } = await supabase
        .from('usuario')
        .select('id_organizacion')
        .eq('user_auth', userId)
        .single();

      if (userError) {
        console.error('❌ Error obteniendo usuario:', userError);
        return null;
      }

      if (!userData?.id_organizacion) {
        // console.log('⚠️ Usuario no tiene organización asignada');
        return null;
      }

      // Obtener la organización
      return await this.getById(userData.id_organizacion);
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
        console.error('❌ Error obteniendo organización:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      // Mapear los datos a la interfaz Organizacion
      const organizacion: Organizacion = {
        id: data.id,
        created_at: data.created_at,
        nombre: data.nombre,
        sector: data.sector,
        configuracion: data.configuracion,
        isActive: data.isActive ?? true,
        idAdmin: data.idAdmin,
        usuarios: data.usuarios,
        nivelDeSuscripcion: data.nivelDeSuscripcion || 'free',
        id_recursos: data.id_recursos,
        id_salas: data.id_salas,
        id_proyectos: data.id_proyectos
      };

      // console.log('✅ Organización encontrada:', organizacion.nombre);
      return organizacion;
    } catch (error) {
      console.error('❌ Error en getById:', error);
      return null;
    }
  }
}
