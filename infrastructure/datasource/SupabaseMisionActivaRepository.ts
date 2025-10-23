import { supabase } from "@/infrastructure/services/SupabaseClient";

import {
  MisionActiva,
  CreateMisionActivaDTO,
  UpdateRunningStateDTO,
  SubmitEntregaDTO
} from '../../domain/entities/MisionActiva';

/**
 * Repositorio para gestionar misiones activas en Supabase
 */
export class SupabaseMisionActivaRepository {


  /**
   * Obtener misión activa por tipo, referencia y usuario
   */
  async getByTipoAndReferencia(
    tipo: 'mision' | 'actividad',
    idReferencia: number,
    idUsuario: string
  ): Promise<MisionActiva | null> {
    try {
      const { data, error } = await supabase
        .from('misiones_activas')
        .select('*')
        .eq('tipo', tipo)
        .eq('id_referencia', idReferencia)
        .eq('id_usuario_asignado', idUsuario)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No existe registro
          return null;
        }
        console.error('❌ Error obteniendo misión activa:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Error en getByTipoAndReferencia:', error);
      return null;
    }
  }

  /**
   * Crear nueva misión activa
   */
  async create(dto: CreateMisionActivaDTO): Promise<MisionActiva | null> {
    try {
      // console.log('📝 Creando nueva misión activa:', dto);

      const { data, error } = await supabase
        .from('misiones_activas')
        .insert({
          tipo: dto.tipo,
          id_referencia: dto.id_referencia,
          id_usuario_asignado: dto.id_usuario_asignado,
          id_creador: dto.id_creador || dto.id_usuario_asignado,
          estado: 'pendiente',
          is_running: false,
          tiempo_total_segundos: 0
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando misión activa:', error);
        return null;
      }

      // console.log('✅ Misión activa creada:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error en create:', error);
      return null;
    }
  }

  /**
   * Actualizar estado de ejecución (play/pause) por ID de misión activa
   */
  async updateRunningState(
    idMisionActiva: string,
    dto: UpdateRunningStateDTO
  ): Promise<MisionActiva | null> {
    try {
      // console.log('▶️ Actualizando estado de ejecución:', dto.is_running ? 'PLAY' : 'PAUSE');

      const updateData: any = {
        is_running: dto.is_running,
        updated_at: new Date().toISOString()
      };

      // Si se especifica un estado, actualizarlo
      if (dto.estado) {
        updateData.estado = dto.estado;
      }

      // Si se especifica tiempo total, actualizarlo
      if (dto.tiempo_total_segundos !== undefined) {
        updateData.tiempo_total_segundos = dto.tiempo_total_segundos;
      }

      // Si se está iniciando (PLAY)
      if (dto.is_running && dto.fecha_inicio) {
        updateData.fecha_inicio = dto.fecha_inicio;
        updateData.estado = 'en_progreso';
      }

      // Si se está pausando
      if (!dto.is_running && dto.fecha_pausa) {
        updateData.fecha_pausa = dto.fecha_pausa;
        updateData.estado = 'pausada';
      }

      const { data, error } = await supabase
        .from('misiones_activas')
        .update(updateData)
        .eq('id', idMisionActiva)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando estado:', error);
        return null;
      }

      // console.log('✅ Estado actualizado');
      return data;
    } catch (error) {
      console.error('❌ Error en updateRunningState:', error);
      return null;
    }
  }

  /**
   * Agregar URL de captura al array de capturas por ID de misión activa
   */
  async addCaptureUrl(idMisionActiva: string, captureUrl: string): Promise<MisionActiva | null> {
    try {
      // console.log('📸 Agregando captura:', captureUrl);

      // Primero obtenemos el registro actual
      const { data: current, error: fetchError } = await supabase
        .from('misiones_activas')
        .select('capturas_urls')
        .eq('id', idMisionActiva)
        .single();

      if (fetchError || !current) {
        console.error('❌ No se encontró la misión activa');
        return null;
      }

      // Agregamos la nueva captura al array
      const updatedCapturas = [...(current.capturas_urls || []), captureUrl];
      const fechaActual = new Date().toISOString();

      const { data, error } = await supabase
        .from('misiones_activas')
        .update({
          capturas_urls: updatedCapturas,
          fecha_ultimo_capture: fechaActual,
          updated_at: fechaActual
        })
        .eq('id', idMisionActiva)
        .select()
        .single();

      if (error) {
        console.error('❌ Error agregando captura:', error);
        return null;
      }

      // console.log('✅ Captura agregada con fecha:', fechaActual);
      return data;
    } catch (error) {
      console.error('❌ Error en addCaptureUrl:', error);
      return null;
    }
  }

  /**
   * Enviar entrega por ID de misión activa
   */
  async submitEntrega(
    idMisionActiva: string,
    dto: SubmitEntregaDTO
  ): Promise<MisionActiva | null> {
    try {
      // console.log('📦 Enviando entrega para misión activa:', idMisionActiva);

      const { data, error } = await supabase
        .from('misiones_activas')
        .update({
          estado: 'entregada',
          is_running: false,
          entrega_descripcion: dto.entrega_descripcion,
          entrega_imagen_url: dto.entrega_imagen_url || [],
          entrega_archivos_urls: dto.entrega_archivos_urls || [],
          tiempo_total_segundos: dto.tiempo_total_segundos,
          capturas_urls: dto.capturas_urls || [],
          fecha_entrega: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', idMisionActiva)
        .select()
        .single();

      if (error) {
        console.error('❌ Error enviando entrega:', error);
        return null;
      }

      // console.log('✅ Entrega enviada correctamente');
      return data;
    } catch (error) {
      console.error('❌ Error en submitEntrega:', error);
      return null;
    }
  }

  /**
   * Obtener todas las misiones activas de un usuario
   */
  async getByUserId(userId: string): Promise<MisionActiva[]> {
    try {
      const { data, error } = await supabase
        .from('misiones_activas')
        .select('*')
        .eq('id_usuario_asignado', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo misiones del usuario:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error en getByUserId:', error);
      return [];
    }
  }

  /**
   * Obtener misiones entregadas de un usuario
   */
  async getEntregadasByUserId(userId: string): Promise<MisionActiva[]> {
    try {
      const { data, error } = await supabase
        .from('misiones_activas')
        .select('*')
        .eq('id_usuario_asignado', userId)
        .eq('estado', 'entregada')
        .order('fecha_entrega', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo misiones entregadas:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error en getEntregadasByUserId:', error);
      return [];
    }
  }

}

// Exportar instancia singleton
export const misionActivaRepository = new SupabaseMisionActivaRepository();
