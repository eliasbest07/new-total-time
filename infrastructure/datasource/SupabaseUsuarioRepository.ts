import { supabase } from "@/infrastructure/services/SupabaseClient";
import { UsuarioRepository } from "@/infrastructure/repositories/UsuarioRepository";
import { Usuario } from "@/domain/entities/Usuario";
import { Rol } from "@/domain/enums/Rol";
import { InfoUsuario } from "@/domain/entities/InfoUsuario";
import { Permiso } from "@/domain/enums/Permiso";

export class SupabaseUsuarioRepository implements UsuarioRepository {

  async getUsuariosByOrganizacion(organizacionId: string): Promise<Usuario[]> {
    try {
      console.log('👥 Obteniendo usuarios para organización:', organizacionId);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout en getUsuariosByOrganizacion')), 5000);
      });

      // Asumiendo que tienes una tabla 'usuarios' en Supabase
      const queryPromise = supabase
        .from('usuario')
        .select(`
          *
        `)
        .eq('id_organizacion', organizacionId)
        .order('created_at', { ascending: false });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.error('❌ Error obteniendo usuarios:', error);
        return [];
      }

      const usuarios = (data || []).map((item) => this.mapToUsuario(item));
      console.log('✅ Usuarios encontrados:', usuarios.length);
      return usuarios;
    } catch (error) {
      console.error('❌ Error en getUsuariosByOrganizacion:', error);
      return [];
    }
  }

  async getUsuarioById(id: string): Promise<Usuario | null> {
    try {
      console.log('🔍 Obteniendo usuario por ID:', id);

      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          info_usuarios (*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo usuario:', error);
        return null;
      }

      console.log('✅ Usuario encontrado:', data);
      return this.mapToUsuario(data);
    } catch (error) {
      console.error('❌ Error en getUsuarioById:', error);
      return null;
    }
  }

  async updateUsuario(id: string, usuario: Partial<Usuario>): Promise<Usuario | null> {
    try {
      console.log('✏️ Actualizando usuario:', id, usuario);

      const { data, error } = await supabase
        .from('usuarios')
        .update({
          ultima_actividad: usuario.ultimaActividad?.toISOString(),
          barra_salud: usuario.barraSalud,
          ultima_captura: usuario.ultimaCaptura
        })
        .eq('id', id)
        .select(`
          *,
          info_usuarios (*)
        `)
        .single();

      if (error) {
        console.error('❌ Error actualizando usuario:', error);
        return null;
      }

      console.log('✅ Usuario actualizado exitosamente:', data);
      return this.mapToUsuario(data);
    } catch (error) {
      console.error('❌ Error en updateUsuario:', error);
      return null;
    }
  }

  private mapToUsuario(data: any): Usuario {
    // Mapear los datos de Supabase a la entidad Usuario
    const infoUsuario: InfoUsuario = {
      nombre: data.info_usuarios?.nombre || 'Sin nombre',
      apellido: data.info_usuarios?.apellido || '',
      avatar: data.info_usuarios?.foto_perfil || '',
      nivel: data.info_usuarios?.nivel || 0,
      fecha_nacimiento: data.info_usuarios?.fecha_nacimiento ? new Date(data.info_usuarios.fecha_nacimiento) : undefined,
      ubicacion: data.info_usuarios?.direccion || '',
      enlace_github: data.info_usuarios?.enlace_github || '',
      enlace_web: data.info_usuarios?.enlace_web || '',
      enlace_linkedin: data.info_usuarios?.enlace_linkedin || '',
      idea: data.info_usuarios?.idea || '',
      marco: data.info_usuarios?.marco || '',
      bio: data.info_usuarios?.bio || '',
      username: data.info_usuarios?.username || data.email || '',
      correo: data.email || '',
      nombreOrganizacion: data.info_usuarios?.nombreOrganizacion || ''
    };

    return new Usuario(
      data.id,
      data.email || '',
      this.mapRol(data.role || data.rol || null),
      infoUsuario,
      data.barra_salud || 100,
      data.user_auth || data.id,
      data.admin || false,
      data.id_organizacion,
      this.mapPermisos(data.permisos),
      data.ultima_actividad ? new Date(data.ultima_actividad) : new Date(),
      data.ultima_captura || '',
      data.solicitud_nivel
    );
  }

  private mapRol(role: string | null): Rol {
    switch (role?.toLowerCase()) {
      case 'admin':
        return Rol.ADMIN;
      case 'miembro':
        return Rol.MIEMBRO;
      default:
        return Rol.MIEMBRO;
    }
  }

  private mapPermisos(permisos: string[] | null): Permiso[] {
    if (!permisos) return [];
    
    return permisos.map(permiso => {
      switch (permiso.toLowerCase()) {
        case 'leer':
          return Permiso.LEER;
        case 'escribir':
          return Permiso.ESCRIBIR;
        case 'eliminar':
          return Permiso.ELIMINAR;
        default:
          return Permiso.LEER;
      }
    });
  }
}