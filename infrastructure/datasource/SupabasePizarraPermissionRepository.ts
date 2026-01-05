import { supabase } from '@/infrastructure/services/SupabaseClient';
import { PizarraPermissionRepository } from '../repositories/PizarraPermissionRepository';
import { PizarraPermission, CreatePizarraPermissionDTO, UpdatePizarraPermissionDTO } from '@/domain/entities/PizarraPermission';

export class SupabasePizarraPermissionRepository implements PizarraPermissionRepository {
  /**
   * Obtiene el permiso entre dos usuarios
   */
  async getPermission(ownerId: number, editorId: number): Promise<PizarraPermission | null> {
    try {
      const { data, error } = await supabase
        .from('pizarra_permissions')
        .select('*')
        .eq('id_usuario_owner', ownerId)
        .eq('id_usuario_editor', editorId)
        .single();

      if (error) {
        // Si no existe, no es un error crítico
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('❌ Error obteniendo permiso:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Error en getPermission:', error);
      return null;
    }
  }

  /**
   * Crea una solicitud de permiso
   */
  async createRequest(dto: CreatePizarraPermissionDTO): Promise<PizarraPermission | null> {
    try {
      console.log('📝 Creando solicitud de permiso:', {
        owner: dto.id_usuario_owner,
        editor: dto.id_usuario_editor,
        granted: dto.granted || false
      });

      const { data, error } = await supabase
        .from('pizarra_permissions')
        .insert([{
          id_usuario_owner: dto.id_usuario_owner,
          id_usuario_editor: dto.id_usuario_editor,
          granted: dto.granted || false,
          requested_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando solicitud de permiso:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: error
        });
        return null;
      }

      console.log('✅ Solicitud de permiso creada');
      return data;
    } catch (error) {
      console.error('❌ Error en createRequest:', error);
      return null;
    }
  }

  /**
   * Actualiza el estado del permiso (otorgar o revocar)
   */
  async updatePermission(ownerId: number, editorId: number, dto: UpdatePizarraPermissionDTO): Promise<PizarraPermission | null> {
    try {
      const updateData: any = {
        ...dto,
        updated_at: new Date().toISOString()
      };

      // Si se otorga el permiso, agregar timestamp
      if (dto.granted === true && !dto.granted_at) {
        updateData.granted_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('pizarra_permissions')
        .update(updateData)
        .eq('id_usuario_owner', ownerId)
        .eq('id_usuario_editor', editorId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando permiso:', error);
        return null;
      }

      console.log('✅ Permiso actualizado');
      return data;
    } catch (error) {
      console.error('❌ Error en updatePermission:', error);
      return null;
    }
  }

  /**
   * Obtiene todas las solicitudes pendientes para un dueño
   */
  async getPendingRequests(ownerId: number): Promise<PizarraPermission[]> {
    try {
      console.log('🔍 [SupabasePizarraPermissionRepository] getPendingRequests para ownerId:', ownerId);
      
      const { data, error } = await supabase
        .from('pizarra_permissions')
        .select('*')
        .eq('id_usuario_owner', ownerId)
        .eq('granted', false)
        .order('requested_at', { ascending: false });

      console.log('📊 [SupabasePizarraPermissionRepository] Resultado query:', {
        data: data?.length || 0,
        error: error?.message,
        fullData: data
      });

      if (error) {
        console.error('❌ Error obteniendo solicitudes pendientes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error en getPendingRequests:', error);
      return [];
    }
  }

  /**
   * Obtiene todos los permisos otorgados por un dueño
   */
  async getGrantedPermissions(ownerId: number): Promise<PizarraPermission[]> {
    try {
      const { data, error } = await supabase
        .from('pizarra_permissions')
        .select('*')
        .eq('id_usuario_owner', ownerId)
        .eq('granted', true)
        .order('granted_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo permisos otorgados:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error en getGrantedPermissions:', error);
      return [];
    }
  }
}
