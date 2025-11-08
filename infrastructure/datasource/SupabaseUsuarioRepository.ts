import { supabase } from "@/infrastructure/services/SupabaseClient";
import { UsuarioRepository } from "@/infrastructure/repositories/UsuarioRepository";
import { Usuario } from "@/domain/entities/Usuario";
import { Rol } from "@/domain/enums/Rol";
import { InfoUsuario } from "@/domain/entities/InfoUsuario";
import { Permiso } from "@/domain/enums/Permiso";

export class SupabaseUsuarioRepository implements UsuarioRepository {

  async getUsuariosByOrganizacion(organizacionId: string): Promise<Usuario[]> {
    try {
      // console.log('👥 Obteniendo usuarios para organización:', organizacionId);

      // Asumiendo que tienes una tabla 'usuarios' en Supabase
      const { data, error } = await supabase
        .from('usuario')
        .select(`
          *
        `)
        .eq('id_organizacion', organizacionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo usuarios:', error);
        return [];
      }

      const usuarios = (data || []).map((item) => this.mapToUsuario(item));
      // console.log('✅ Usuarios encontrados:', usuarios.length);
      return usuarios;
    } catch (error) {
      console.error('❌ Error en getUsuariosByOrganizacion:', error);
      return [];
    }
  }

  async getUsuarioById(id: string): Promise<Usuario | null> {
    try {
      // console.log('🔍 Obteniendo usuario por ID:', id);

      const { data, error } = await supabase
        .from('usuario')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo usuario:', error);
        return null;
      }

      // console.log('✅ Usuario encontrado:', data);
      return this.mapToUsuario(data);
    } catch (error) {
      console.error('❌ Error en getUsuarioById:', error);
      return null;
    }
  }

  async getUsuarioByAuthId(authId: string): Promise<Usuario | null> {
    try {
      const { data, error } = await supabase
        .from('usuario')
        .select('*')
        .eq('id_usuario', authId)
        .single();

      if (error) {
        console.error('❌ Error obteniendo usuario por authId:', error);
        return null;
      }

      return this.mapToUsuario(data);
    } catch (error) {
      console.error('❌ Error en getUsuarioByAuthId:', error);
      return null;
    }
  }

  async updateUsuario(id: string, usuario: Partial<Usuario>): Promise<Usuario | null> {
    try {
      // console.log('✏️ Actualizando usuario:', id, usuario);

      const { data, error } = await supabase
        .from('usuario')
        .update({
          ultima_actividad: usuario.ultimaActividad?.toISOString(),
          barra_salud: usuario.barraSalud,
          ultima_captura: usuario.ultimaCaptura
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error actualizando usuario:', error);
        return null;
      }

      // console.log('✅ Usuario actualizado exitosamente:', data);
      return this.mapToUsuario(data);
    } catch (error) {
      console.error('❌ Error en updateUsuario:', error);
      return null;
    }
  }

  private mapToUsuario(data: any): Usuario {
    // Mapear los datos de Supabase a la entidad Usuario
    const infoUsuario: InfoUsuario = {
      nombre: data.nombre || 'Sin nombre',
      apellido: '', // No existe en la tabla
      avatar: data.avatar || '',
      nivel: data.nivel || 0,
      fecha_nacimiento: data.fecha_nacimiento ? new Date(data.fecha_nacimiento) : undefined,
      ubicacion: data.ubicacion || '',
      enlace_github: data.enlace_github || '',
      enlace_web: data.enlace_web || '',
      enlace_linkedin: data.enlace_linkedin || '',
      idea: data.idea || '',
      marco: data.marco || '',
      bio: data.bio || '',
      username: data.username || data.correo || '',
      correo: data.correo || '',
      nombreOrganizacion: '' // No existe directamente, requiere JOIN si se necesita
    };

    return new Usuario(
      data.id,
      data.correo || '',
      this.mapRol(data.role),
      infoUsuario,
      data.barra_salud || 100,
      data.user_auth || data.id_usuario,
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
        case 'ver_capturas_usuario':
          return Permiso.VER_CAPTURAS_USUARIO;
        case 'escribir':
        case 'publicar_en_sala':
          return Permiso.PUBLICAR_EN_SALA;
        case 'eliminar':
        case 'eliminar_usuario':
          return Permiso.ELIMINAR_USUARIO;
        case 'crear_sala':
          return Permiso.CREAR_SALA;
        case 'modificar_sala':
          return Permiso.MODIFICAR_SALA;
        case 'publicar_en_pizarra':
          return Permiso.PUBLICAR_EN_PIZARRA;
        case 'tomar_de_pizarra':
          return Permiso.TOMAR_DE_PIZARRA;
        default:
          return Permiso.VER_CAPTURAS_USUARIO;
      }
    });
  }
}