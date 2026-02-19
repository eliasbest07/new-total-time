import { supabase } from "@/infrastructure/services/SupabaseClient";
import { PizarraOrganizacion } from "@/domain/entities/PizarraOrganizacion";
import { PizarraOrganizacionPermiso } from "@/domain/entities/PizarraOrganizacionPermiso";

/**
 * Repositorio para manejar operaciones de la pizarra de organización
 * y sus permisos en Supabase.
 */
export class SupabasePizarraOrganizacionRepository {

  /**
   * Obtiene la pizarra de una organización.
   * Si no existe, la crea automáticamente.
   */
  async getPizarraByOrganizacion(idOrganizacion: string): Promise<PizarraOrganizacion | null> {
    try {
      console.log('🎨 [PizarraOrg] Obteniendo pizarra para organización:', {
        idOrganizacion,
        tipo: typeof idOrganizacion,
        esValido: !!idOrganizacion
      });

      // Buscar pizarra existente (pizarra libre, sin proyecto asociado)
      const { data, error } = await supabase
        .from('pizarras')
        .select('*')
        .eq('id_organizacion', idOrganizacion)
        .is('id_proyecto', null)
        .maybeSingle();

      if (error) {
        console.error('❌ [PizarraOrg] Error obteniendo pizarra:', error);
        return null;
      }

      // Si existe, retornarla mapeada
      if (data) {
        console.log('✅ [PizarraOrg] Pizarra encontrada:', {
          id: data.id,
          id_organizacion: data.id_organizacion,
          id_usuario: data.id_usuario
        });
        return this.mapToDomain(data);
      }

      // Si no existe, crear una nueva
      console.log('📝 [PizarraOrg] No existe pizarra con id_organizacion:', idOrganizacion, '- creando una nueva...');
      return await this.createPizarra(idOrganizacion);

    } catch (error) {
      console.error('❌ [PizarraOrg] Error en getPizarraByOrganizacion:', error);
      return null;
    }
  }

  /**
   * Obtiene la pizarra de un proyecto específico.
   * Si no existe, la crea automáticamente.
   */
  async getPizarraByProyecto(idOrganizacion: string, idProyecto: number): Promise<PizarraOrganizacion | null> {
    try {
      console.log('🎨 [PizarraOrg] Obteniendo pizarra para proyecto:', { idOrganizacion, idProyecto });

      const { data, error } = await supabase
        .from('pizarras')
        .select('*')
        .eq('id_organizacion', idOrganizacion)
        .eq('id_proyecto', idProyecto)
        .maybeSingle();

      if (error) {
        console.error('❌ [PizarraOrg] Error obteniendo pizarra de proyecto:', error);
        return null;
      }

      if (data) {
        console.log('✅ [PizarraOrg] Pizarra de proyecto encontrada:', data.id);
        return this.mapToDomain(data);
      }

      console.log('📝 [PizarraOrg] Creando pizarra para proyecto:', idProyecto);
      return await this.createPizarra(idOrganizacion, idProyecto);

    } catch (error) {
      console.error('❌ [PizarraOrg] Error en getPizarraByProyecto:', error);
      return null;
    }
  }

  /**
   * Crea una nueva pizarra para una organización
   */
  async createPizarra(idOrganizacion: string, idProyecto?: number): Promise<PizarraOrganizacion | null> {
    try {
      console.log('📝 [PizarraOrg] Creando pizarra para organización:', {
        idOrganizacion,
        tipo: typeof idOrganizacion,
        esValido: !!idOrganizacion
      });

      const insertData: any = {
        id_usuario: 'f14a1ce3-ee6c-493c-a1df-fb31ba82c3d4',
        id_organizacion: idOrganizacion,
        pan_offset_x: 0,
        pan_offset_y: 0,
      };

      if (idProyecto !== undefined) {
        insertData.id_proyecto = idProyecto;
      }

      console.log('📝 [PizarraOrg] Datos a insertar:', insertData);

      const { data, error } = await supabase
        .from('pizarras')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ [PizarraOrg] Error creando pizarra:', error);
        return null;
      }

      console.log('✅ [PizarraOrg] Pizarra creada:', {
        id: data.id,
        id_organizacion: data.id_organizacion,
        id_usuario: data.id_usuario
      });
      return this.mapToDomain(data);

    } catch (error) {
      console.error('❌ [PizarraOrg] Error en createPizarra:', error);
      return null;
    }
  }

  /**
   * Actualiza el pan offset y zoom de la pizarra
   */
  async updatePanOffset(
    id: string,
    panOffsetX: number,
    panOffsetY: number,
    zoomLevel?: number
  ): Promise<PizarraOrganizacion | null> {
    try {
      console.log('📝 [PizarraOrg] Actualizando pan offset:', { id, panOffsetX, panOffsetY });

      const updateData: any = {
        pan_offset_x: panOffsetX,
        pan_offset_y: panOffsetY,
        updated_at: new Date().toISOString()
      };

      if (zoomLevel !== undefined) {
        updateData.zoom_level = zoomLevel;
      }

      const { data, error } = await supabase
        .from('pizarras')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('❌ [PizarraOrg] Error actualizando pan offset:', error);
        return null;
      }

      if (!data) {
        console.error('❌ [PizarraOrg] Pizarra no encontrada');
        return null;
      }

      console.log('✅ [PizarraOrg] Pan offset actualizado');
      return this.mapToDomain(data);

    } catch (error) {
      console.error('❌ [PizarraOrg] Error en updatePanOffset:', error);
      return null;
    }
  }

  /**
   * Obtiene la pizarra por ID
   */
  async getPizarraById(id: string): Promise<PizarraOrganizacion | null> {
    try {
      const { data, error } = await supabase
        .from('pizarras')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('❌ [PizarraOrg] Error obteniendo pizarra por ID:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return this.mapToDomain(data);

    } catch (error) {
      console.error('❌ [PizarraOrg] Error en getPizarraById:', error);
      return null;
    }
  }

  /**
   * Elimina una pizarra de organización (solo admins)
   */
  async deletePizarra(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pizarras')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ [PizarraOrg] Error eliminando pizarra:', error);
        return false;
      }

      console.log('✅ [PizarraOrg] Pizarra eliminada:', id);
      return true;

    } catch (error) {
      console.error('❌ [PizarraOrg] Error en deletePizarra:', error);
      return false;
    }
  }

  // =========================================================================
  // PERMISOS
  // =========================================================================

  /**
   * Obtiene el permiso de un usuario para una organización
   */
  async getPermiso(
    idOrganizacion: string,
    idUsuario: number
  ): Promise<PizarraOrganizacionPermiso | null> {
    try {
      const { data, error } = await supabase
        .from('pizarra_organizacion_permisos')
        .select('*')
        .eq('id_organizacion', idOrganizacion)
        .eq('id_usuario', idUsuario)
        .maybeSingle();

      if (error) {
        console.error('❌ [PizarraOrg] Error obteniendo permiso:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return this.mapPermisoToDomain(data);

    } catch (error) {
      console.error('❌ [PizarraOrg] Error en getPermiso:', error);
      return null;
    }
  }

  /**
   * Crea o actualiza un permiso para un usuario
   */
  async setPermiso(
    idOrganizacion: string,
    idUsuario: number,
    puedeEditar: boolean,
    otorgadoPor: number
  ): Promise<PizarraOrganizacionPermiso | null> {
    try {
      console.log('📝 [PizarraOrg] Configurando permiso:', {
        idOrganizacion,
        idUsuario,
        puedeEditar
      });

      // Intentar insertar o actualizar (upsert)
      const { data, error } = await supabase
        .from('pizarra_organizacion_permisos')
        .upsert({
          id_organizacion: idOrganizacion,
          id_usuario: idUsuario,
          puede_editar: puedeEditar,
          otorgado_por: otorgadoPor,
          otorgado_at: puedeEditar ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id_organizacion,id_usuario'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [PizarraOrg] Error configurando permiso:', error);
        return null;
      }

      console.log('✅ [PizarraOrg] Permiso configurado:', data.id);
      return this.mapPermisoToDomain(data);

    } catch (error) {
      console.error('❌ [PizarraOrg] Error en setPermiso:', error);
      return null;
    }
  }

  /**
   * Obtiene todos los permisos de una organización
   */
  async getPermisosByOrganizacion(
    idOrganizacion: string
  ): Promise<PizarraOrganizacionPermiso[]> {
    try {
      const { data, error } = await supabase
        .from('pizarra_organizacion_permisos')
        .select('*')
        .eq('id_organizacion', idOrganizacion)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [PizarraOrg] Error obteniendo permisos:', error);
        return [];
      }

      return data.map(this.mapPermisoToDomain);

    } catch (error) {
      console.error('❌ [PizarraOrg] Error en getPermisosByOrganizacion:', error);
      return [];
    }
  }

  /**
   * Obtiene todos los usuarios con permiso de edición
   */
  async getUsuariosConPermisoEdicion(
    idOrganizacion: string
  ): Promise<PizarraOrganizacionPermiso[]> {
    try {
      const { data, error } = await supabase
        .from('pizarra_organizacion_permisos')
        .select('*')
        .eq('id_organizacion', idOrganizacion)
        .eq('puede_editar', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [PizarraOrg] Error obteniendo editores:', error);
        return [];
      }

      return data.map(this.mapPermisoToDomain);

    } catch (error) {
      console.error('❌ [PizarraOrg] Error en getUsuariosConPermisoEdicion:', error);
      return [];
    }
  }

  /**
   * Revoca el permiso de edición de un usuario
   */
  async revocarPermiso(
    idOrganizacion: string,
    idUsuario: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pizarra_organizacion_permisos')
        .delete()
        .eq('id_organizacion', idOrganizacion)
        .eq('id_usuario', idUsuario);

      if (error) {
        console.error('❌ [PizarraOrg] Error revocando permiso:', error);
        return false;
      }

      console.log('✅ [PizarraOrg] Permiso revocado para usuario:', idUsuario);
      return true;

    } catch (error) {
      console.error('❌ [PizarraOrg] Error en revocarPermiso:', error);
      return false;
    }
  }

  /**
   * Verifica si un usuario puede editar la pizarra de la organización
   */
  async puedeEditar(
    idOrganizacion: string,
    idUsuario: number
  ): Promise<boolean> {
    try {
      // Primero verificar si es el admin de la organización
      const { data: orgData, error: orgError } = await supabase
        .from('organizacion')
        .select('idAdmin')
        .eq('id', idOrganizacion)
        .single();

      if (orgError) {
        console.error('❌ [PizarraOrg] Error verificando admin:', orgError);
        return false;
      }

      // Obtener el UUID del usuario
      const { data: userData, error: userError } = await supabase
        .from('usuario')
        .select('user_auth')
        .eq('id', idUsuario)
        .single();

      if (userError) {
        console.error('❌ [PizarraOrg] Error obteniendo usuario:', userError);
        return false;
      }

      // Si es el admin, puede editar
      if (orgData.idAdmin === userData.user_auth) {
        return true;
      }

      // Si no es admin, verificar permisos
      const permiso = await this.getPermiso(idOrganizacion, idUsuario);
      return permiso?.puedeEditar ?? false;

    } catch (error) {
      console.error('❌ [PizarraOrg] Error en puedeEditar:', error);
      return false;
    }
  }

  // =========================================================================
  // MAPPERS
  // =========================================================================

  /**
   * Mapea datos de BD a entidad de dominio
   */
  private mapToDomain(data: any): PizarraOrganizacion {
    return {
      id: data.id,
      idOrganizacion: data.id_organizacion,
      idProyecto: data.id_proyecto ?? null,
      panOffsetX: data.pan_offset_x,
      panOffsetY: data.pan_offset_y,
      zoomLevel: data.zoom_level,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Mapea datos de permiso de BD a entidad de dominio
   */
  private mapPermisoToDomain(data: any): PizarraOrganizacionPermiso {
    return {
      id: data.id,
      idOrganizacion: data.id_organizacion,
      idUsuario: data.id_usuario,
      puedeEditar: data.puede_editar,
      otorgadoPor: data.otorgado_por,
      otorgadoAt: data.otorgado_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}
