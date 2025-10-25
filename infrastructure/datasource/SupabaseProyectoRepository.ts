import { supabase } from "@/infrastructure/services/SupabaseClient";
import { ProyectoRepository } from "@/infrastructure/repositories/ProyectoRepository";
import { Proyecto } from "@/domain/entities/Proyecto";
import { trackAuthCall } from "@/utils/authCallTracker";

// Cache para evitar múltiples llamadas a getSession()
let userOrgCache: { userId: string; organizacionId: string | null; timestamp: number } | null = null;
const USER_ORG_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Rate limiting para evitar demasiadas llamadas
let lastCallTimestamp = 0;
const MIN_CALL_INTERVAL = 1000; // 1 segundo mínimo entre llamadas

export class SupabaseProyectoRepository implements ProyectoRepository {

  async getProyectosByUsuario(userId: string): Promise<Proyecto[]> {
    try {
      // console.log('📁 Obteniendo proyectos para usuario:', userId);

      const { data, error } = await supabase
        .from('proyecto')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo proyectos:', error);
        return [];
      }

      const proyectos = data || [];
      // console.log('✅ Proyectos encontrados:', proyectos.length);
      return proyectos;
    } catch (error) {
      console.error('❌ Error en getProyectosByUsuario:', error);
      return [];
    }
  }

  async getProyectosByOrganizacion(organizacionId: string): Promise<Proyecto[]> {
    try {
      // console.log('📁 Obteniendo proyectos para organización:', organizacionId);

      // Primero obtener la organización para conseguir el array de proyectos
      const { data: organizacionData, error: organizacionError } = await supabase
        .from('organizacion')
        .select('proyectos')
        .eq('id', organizacionId)
        .maybeSingle();

      if (organizacionError) {
        console.error('❌ Error obteniendo organización:', organizacionError);
        return [];
      }

      if (!organizacionData) {
        // console.log('⚠️ No se encontró la organización con ID:', organizacionId);
        return [];
      }

      const proyectosIds = organizacionData?.proyectos || [];

      if (proyectosIds.length === 0) {
        // console.log('✅ No hay proyectos en esta organización');
        return [];
      }

      // Ahora obtener los proyectos usando los IDs
      const { data, error } = await supabase
        .from('proyecto')
        .select('*')
        .in('id', proyectosIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo proyectos por organización:', error);
        return [];
      }

      const proyectos = data || [];
      // console.log('✅ Proyectos de organización encontrados:', proyectos.length);
      return proyectos;
    } catch (error) {
      console.error('❌ Error en getProyectosByOrganizacion:', error);
      return [];
    }
  }

  async getProyectosByCurrentUser(): Promise<Proyecto[]> {
    try {
      // console.log('📁 Obteniendo proyectos del usuario autenticado');

      // Obtener la organización del usuario actual
      const organizacionId = await this.getUserOrganizationId();
      
      if (!organizacionId) {
        // console.log('⚠️ Usuario no tiene organización asignada');
        return [];
      }

      // Usar el método existente para obtener proyectos por organización
      return await this.getProyectosByOrganizacion(organizacionId);
    } catch (error) {
      console.error('❌ Error en getProyectosByCurrentUser:', error);
      return [];
    }
  }

  async getUserOrganizationId(): Promise<string | null> {
    try {
      trackAuthCall('SupabaseProyectoRepository.getUserOrganizationId', 'getSession');
      
      // console.log('👤 Obteniendo organización del usuario autenticado');

      // Rate limiting: evitar llamadas muy frecuentes
      const now = Date.now();
      if (now - lastCallTimestamp < MIN_CALL_INTERVAL) {
        // Si hay cache disponible, usarlo
        if (userOrgCache && (now - userOrgCache.timestamp) < USER_ORG_CACHE_TTL) {
          return userOrgCache.organizacionId;
        }
        // Si no hay cache, esperar un poco antes de hacer la llamada
        await new Promise(resolve => setTimeout(resolve, MIN_CALL_INTERVAL - (now - lastCallTimestamp)));
      }
      lastCallTimestamp = Date.now();

      // Usar getSession() en lugar de getUser() para evitar rate limiting
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (authError || !session?.user) {
        // Solo loggear error si realmente hay un error, no si simplemente no hay sesión
        if (authError) {
          console.error('❌ Error obteniendo sesión del usuario:', authError);
        }
        return null;
      }

      const user = session.user;
      // console.log('👤 Usuario autenticado ID:', user.id);

      // Verificar cache primero
      if (userOrgCache &&
          userOrgCache.userId === user.id &&
          (Date.now() - userOrgCache.timestamp) < USER_ORG_CACHE_TTL) {
        // console.log('🎯 Usando organización desde cache:', userOrgCache.organizacionId);
        return userOrgCache.organizacionId;
      }

      // Obtener la organización del usuario desde la tabla usuario
      const { data: userData, error: userError } = await supabase
        .from('usuario')
        .select('id_organizacion')
        .eq('id_usuario', user.id)
        .maybeSingle();

      if (userError) {
        console.error('❌ Error obteniendo datos del usuario:', userError);
        return null;
      }

      if (!userData) {
        // console.log('⚠️ No se encontró el usuario en la tabla usuario');
        return null;
      }

      const organizacionId = userData.id_organizacion;
      // console.log('✅ ID de organización obtenido:', organizacionId);

      // Guardar en cache
      userOrgCache = {
        userId: user.id,
        organizacionId,
        timestamp: Date.now()
      };

      return organizacionId;
    } catch (error) {
      console.error('❌ Error en getUserOrganizationId:', error);
      
      // Si es un error de rate limiting, intentar usar cache aunque esté expirado
      if (error instanceof Error && error.message.includes('429')) {
        console.warn('⚠️ Rate limit detectado, usando cache expirado si está disponible');
        if (userOrgCache) {
          return userOrgCache.organizacionId;
        }
      }
      
      return null;
    }
  }

  async createProyecto(proyecto: Omit<Proyecto, 'id' | 'created_at'>): Promise<Proyecto | null> {
    try {
      // console.log('➕ Creando nuevo proyecto:', proyecto);

      const { data, error } = await supabase
        .from('proyecto')
        .insert([proyecto])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando proyecto:', error);
        return null;
      }

      // console.log('✅ Proyecto creado exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en createProyecto:', error);
      return null;
    }
  }

  async updateProyecto(id: number, proyecto: Partial<Proyecto>): Promise<Proyecto | null> {
    try {
      // console.log('✏️ Actualizando proyecto:', id, proyecto);

      const { data, error } = await supabase
        .from('proyecto')
        .update(proyecto)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando proyecto:', error);
        return null;
      }

      // console.log('✅ Proyecto actualizado exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en updateProyecto:', error);
      return null;
    }
  }

  async deleteProyecto(id: number): Promise<boolean> {
    try {
      // console.log('🗑️ Eliminando proyecto:', id);

      const { error } = await supabase
        .from('proyecto')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error eliminando proyecto:', error);
        return false;
      }

      // console.log('✅ Proyecto eliminado exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error en deleteProyecto:', error);
      return false;
    }
  }

  async getProyectoById(id: number): Promise<Proyecto | null> {
    try {
      // console.log('🔍 Obteniendo proyecto por ID:', id);

      const { data, error } = await supabase
        .from('proyecto')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo proyecto:', error);
        return null;
      }

      // console.log('✅ Proyecto encontrado:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en getProyectoById:', error);
      return null;
    }
  }
}