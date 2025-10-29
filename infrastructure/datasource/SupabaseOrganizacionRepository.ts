import { supabase } from "@/infrastructure/services/SupabaseClient";
import { OrganizacionRepository } from "@/infrastructure/repositories/OrganizacionRepository";
import { Organizacion } from "@/domain/entities/Organizacion";

export class SupabaseOrganizacionRepository implements OrganizacionRepository {

  async getByUsuarioId(userId: string): Promise<Organizacion | null> {
    try {
      if (!userId) {
        return null;
      }

      // Intentar primero con user_auth
      let { data: usuariosData, error: userError } = await supabase
        .from('usuario')
        .select('id, id_organizacion')
        .eq('user_auth', userId);

      // Si no encuentra nada, intentar con id_usuario
      if ((!usuariosData || usuariosData.length === 0) && !userError) {
        const { data: usuariosData2, error: userError2 } = await supabase
          .from('usuario')
          .select('id, id_organizacion')
          .eq('id_usuario', userId);

        usuariosData = usuariosData2;
        userError = userError2;
      }

      if (userError) {
        console.error('❌ Error obteniendo usuario:', userError);
        return null;
      }

      if (!usuariosData || usuariosData.length === 0) {
        return null;
      }

      const userData = usuariosData[0];

      // Si tiene id_organizacion directo, usarlo
      if (userData.id_organizacion) {
        return await this.getById(userData.id_organizacion);
      }

      // Si no, buscar en el array de usuarios de la organización
      const { data: organizaciones, error: orgError } = await supabase
        .from('organizacion')
        .select('*')
        .contains('usuarios', [userData.id]);

      if (orgError) {
        console.error('❌ Error buscando organización:', orgError);
        return null;
      }

      if (!organizaciones || organizaciones.length === 0) {
        return null;
      }

      // Tomar la primera organización encontrada
      const data = organizaciones[0];

      // Mapear los datos a la interfaz Organizacion
      const organizacion: Organizacion = {
        id: data.id,
        created_at: data.created_at,
        nombre: data.nombre ?? 'Sin nombre',
        sector: data.sector ?? 'Sin tipo definido',
        configuracion: data.configuracion,
        isActive: data.isActive ?? true,
        idAdmin: data.idAdmin,
        usuarios: data.usuarios,
        nivelDeSuscripcion: data.nivelDeSuscripcion || 'free',
        id_recursos: data.id_recursos,
        id_salas: data.id_salas,
        proyectos: data.proyectos ?? [],
        img_profile: data.img_profile
      };

      return organizacion;
    } catch (error) {
      console.error('❌ Error en getByUsuarioId:', error);
      return null;
    }
  }

  async getById(id: string): Promise<Organizacion | null> {
    try {
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
        nombre: data.nombre ?? 'Sin nombre',
        sector: data.sector ?? 'Sin tipo definido',
        configuracion: data.configuracion,
        isActive: data.isActive ?? true,
        idAdmin: data.idAdmin,
        usuarios: data.usuarios,
        nivelDeSuscripcion: data.nivelDeSuscripcion || 'free',
        id_recursos: data.id_recursos,
        id_salas: data.id_salas,
        proyectos: data.proyectos ?? [],
        img_profile: data.img_profile
      };

      // console.log('✅ Organización encontrada:', organizacion.nombre);
      return organizacion;
    } catch (error) {
      console.error('❌ Error en getById:', error);
      return null;
    }
  }
}
