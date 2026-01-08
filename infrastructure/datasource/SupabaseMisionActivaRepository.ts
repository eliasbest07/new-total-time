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
   * Obtener misión activa solo por tipo y referencia (cualquier usuario)
   */
  async getByTipoAndReferenciaOnly(
    tipo: 'mision' | 'actividad',
    idReferencia: number
  ): Promise<MisionActiva | null> {
    try {
      console.log('🔍 [SUPABASE] Buscando misión activa:', { tipo, id_referencia: idReferencia });

      // Usar .limit(1) en lugar de .maybeSingle() para evitar problemas con RLS
      const { data, error } = await supabase
        .from('misiones_activas')
        .select('*')
        .eq('tipo', tipo)
        .eq('id_referencia', idReferencia)
        .limit(1);

      if (error) {
        console.error('❌ [SUPABASE] Error obteniendo misión activa:', error);
        console.error('💡 Posible problema de RLS (Row Level Security)');
        return null;
      }

      // data es un array con .limit(1)
      const mision = data && data.length > 0 ? data[0] : null;

      if (mision) {
        console.log('✅ [SUPABASE] Misión activa encontrada:', {
          id: mision.id,
          estado: mision.estado,
          is_running: mision.is_running,
          id_usuario_asignado: mision.id_usuario_asignado,
          id_referencia: mision.id_referencia
        });
      } else {
        console.log('ℹ️ [SUPABASE] No se encontró misión activa para id_referencia:', idReferencia);
        console.log('💡 Esto puede ser por: 1) No existe, 2) RLS está bloqueando el acceso');
      }

      return mision;
    } catch (error) {
      console.error('❌ Error en getByTipoAndReferenciaOnly:', error);
      return null;
    }
  }

  /**
   * Crear nueva misión activa (solo INSERT)
   */
  async create(dto: CreateMisionActivaDTO): Promise<MisionActiva | null> {
    try {
      console.log('📝 [CREATE] Creando nueva misión activa:', {
        tipo: dto.tipo,
        id_referencia: dto.id_referencia,
        id_usuario_asignado: dto.id_usuario_asignado
      });

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

      console.log('✅ [CREATE] Misión activa creada:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error en create:', error);
      return null;
    }
  }

  /**
   * Actualizar misión activa existente (resetear a estado inicial)
   */
  async resetMisionActiva(
    idMisionActiva: string,
    nuevoUsuarioAsignado: string
  ): Promise<MisionActiva | null> {
    try {
      console.log('🔄 [RESET] Reseteando misión activa:', {
        id: idMisionActiva,
        nuevo_usuario: nuevoUsuarioAsignado
      });

      const { data, error } = await supabase
        .from('misiones_activas')
        .update({
          id_usuario_asignado: nuevoUsuarioAsignado,
          estado: 'pendiente',
          is_running: false,
          tiempo_total_segundos: 0,
          fecha_inicio: null,
          fecha_pausa: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', idMisionActiva)
        .select()
        .single();

      if (error) {
        console.error('❌ Error reseteando misión activa:', error);
        return null;
      }

      console.log('✅ [RESET] Misión activa reseteada:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error en resetMisionActiva:', error);
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
   * Actualizar fecha de última captura por ID de misión activa
   * Nota: Las capturas se guardan en la tabla 'capture', no en misiones_activas
   */
  async addCaptureUrl(idMisionActiva: string, captureUrl: string): Promise<MisionActiva | null> {
    try {
      // console.log('📸 Actualizando fecha de última captura');

      const fechaActual = new Date().toISOString();

      const { data, error } = await supabase
        .from('misiones_activas')
        .update({
          fecha_ultimo_capture: fechaActual,
          updated_at: fechaActual
        })
        .eq('id', idMisionActiva)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando fecha de captura:', error);
        return null;
      }

      // console.log('✅ Fecha de captura actualizada:', fechaActual);
      return data;
    } catch (error) {
      console.error('❌ Error en addCaptureUrl:', error);
      return null;
    }
  }

  /**
   * Enviar entrega por ID de misión activa
   * Crea/actualiza el entregable y actualiza el estado de la misión activa
   * Nota: Las capturas se consultan desde la tabla 'capture', no se duplican en entregables
   */
  async submitEntrega(
    idMisionActiva: string,
    dto: SubmitEntregaDTO
  ): Promise<MisionActiva | null> {
    try {
      console.log('📦 Enviando entrega para misión activa:', idMisionActiva);

      // 1. Crear o actualizar entregable (sin capturas_urls)
      const { data: entregable, error: entregableError } = await supabase
        .from('entregables')
        .upsert({
          id_mision_activa: idMisionActiva,
          titulo: dto.titulo || 'Entrega',
          comentario: dto.entrega_descripcion,
          tiempo_transcurrido_segundos: dto.tiempo_total_segundos,
          imagenes_urls: dto.entrega_imagen_url || [],
          archivos_urls: dto.entrega_archivos_urls || [],
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id_mision_activa'
        })
        .select()
        .single();

      if (entregableError) {
        console.error('❌ Error creando entregable:', entregableError);
        return null;
      }

      console.log('✅ Entregable creado/actualizado:', entregable.id);

      // 2. Actualizar estado de la misión activa
      const { data, error } = await supabase
        .from('misiones_activas')
        .update({
          estado: 'entregada',
          is_running: false,
          entrega_descripcion: dto.entrega_descripcion,
          entrega_imagen_url: dto.entrega_imagen_url || [],
          entrega_archivos_urls: dto.entrega_archivos_urls || [],
          tiempo_total_segundos: dto.tiempo_total_segundos,
          id_entregable: entregable.id,
          fecha_entrega: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', idMisionActiva)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando misión activa:', error);
        return null;
      }

      console.log('✅ Entrega enviada correctamente');
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

  /**
   * Actualizar la columna capture_now
   * Si el valor es una URL (captura recibida), también actualiza fecha_ultimo_capture
   * para evitar que la misión sea marcada como inactiva
   */
  async updateCaptureNow(idMisionActiva: string, value: string): Promise<MisionActiva | null> {
    try {
      console.log('📸 Actualizando capture_now a:', value);

      const fechaActual = new Date().toISOString();

      // Si es una URL de captura, también actualizar fecha_ultimo_capture
      // Esto evita que la verificación de inactividad pause la misión
      const updateData: any = {
        capture_now: value,
        updated_at: fechaActual
      };

      // Si el valor es una URL (empieza con http), es una captura recibida
      if (value.startsWith('http')) {
        updateData.fecha_ultimo_capture = fechaActual;
        console.log('📸 También actualizando fecha_ultimo_capture (captura recibida)');
      }

      const { data, error } = await supabase
        .from('misiones_activas')
        .update(updateData)
        .eq('id', idMisionActiva)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando capture_now:', error);
        return null;
      }

      console.log('✅ capture_now actualizado');
      return data;
    } catch (error) {
      console.error('❌ Error en updateCaptureNow:', error);
      return null;
    }
  }

  /**
   * Suscribirse a cambios en tiempo real de una misión activa por ID
   */
  subscribeToMisionActiva(
    idMisionActiva: string,
    onUpdate: (misionActiva: MisionActiva) => void
  ) {
    const channel = supabase
      .channel(`mision-activa-${idMisionActiva}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'misiones_activas',
          filter: `id=eq.${idMisionActiva}`
        },
        (payload) => {
          console.log('🔔 Cambio en misión activa:', payload.new);
          onUpdate(payload.new as MisionActiva);
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Suscribirse a cambios en tiempo real por tipo y referencia
   * NOTA: El filtro se hace manualmente porque los filtros de Supabase Realtime
   * no funcionan correctamente en algunos casos
   */
  subscribeToMisionActivaByReferencia(
    tipo: 'mision' | 'actividad',
    idReferencia: number,
    onUpdate: (misionActiva: MisionActiva | null) => void
  ) {
    const channelName = `mision-activa-${tipo}-${idReferencia}-${Date.now()}`;

    console.log('📡 [REALTIME] Suscripción creada:', { tipo, id_referencia: idReferencia });

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: '' }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'misiones_activas'
          // Sin filtro server-side, se filtra manualmente en el callback
        },
        (payload) => {
          // Filtrar manualmente por tipo e id_referencia
          const eventoTipo = (payload.new as any)?.tipo;
          const eventoIdReferencia = (payload.new as any)?.id_referencia;

          // Solo procesar eventos que coincidan
          if (eventoTipo === tipo && eventoIdReferencia === idReferencia) {
            console.log('📡 [REALTIME] Cambio detectado:', {
              tipo: eventoTipo,
              id_referencia: eventoIdReferencia,
              estado: (payload.new as any)?.estado,
              is_running: (payload.new as any)?.is_running
            });

            if (payload.eventType === 'DELETE') {
              onUpdate(null);
            } else {
              onUpdate(payload.new as MisionActiva);
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [REALTIME] Suscripción activa para:', { tipo, id_referencia: idReferencia });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ [REALTIME] Error en suscripción:', err);
        }
      });

    return channel;
  }

  /**
   * Verificar y actualizar el estado de misiones que aparentan estar activas
   * pero no han tenido capturas en más de 5 minutos 30 segundos
   * (5 minutos de intervalo + 30 segundos de margen de tolerancia)
   * Retorna un objeto con información sobre las misiones verificadas
   */
  async verificarYActualizarMisionesInactivas(): Promise<{
    total: number;
    desactivadas: number;
    activas: number;
  }> {
    // 🚫 TEMPORALMENTE DESACTIVADO - Testing capturas
    console.log('🚫 [VERIFICAR] Función DESACTIVADA temporalmente');
    return { total: 0, desactivadas: 0, activas: 0 };

    try {
      console.log('🔍 [VERIFICAR] Buscando misiones con is_running = true');

      // 1. Obtener todas las misiones que aparentan estar activas
      const { data: misionesActivas, error: queryError } = await supabase
        .from('misiones_activas')
        .select('*')
        .eq('is_running', true);

      if (queryError) {
        console.error('❌ Error consultando misiones activas:', queryError);
        return { total: 0, desactivadas: 0, activas: 0 };
      }

      if (!misionesActivas) {
        console.log('ℹ️ [VERIFICAR] No hay misiones con is_running = true');
        return { total: 0, desactivadas: 0, activas: 0 };
      }

      if (misionesActivas!.length === 0) {
        console.log('ℹ️ [VERIFICAR] No hay misiones con is_running = true');
        return { total: 0, desactivadas: 0, activas: 0 };
      }

      const totalMisiones = misionesActivas!.length;

      console.log(`📊 [VERIFICAR] Encontradas ${totalMisiones} misiones con is_running = true`);

      const ahora = new Date();
      // 15 minutos (tiempo más generoso) + 30 segundos (margen de tolerancia)
      const QUINCE_MIN_30_SEG_MS = (15 * 60 * 1000) + (30 * 1000); // 930,000 ms
      let misionesDesactivadas = 0;

      // 2. Verificar cada misión
      for (const mision of misionesActivas!) {
        // Si no tiene fecha_ultimo_capture, verificar cuánto tiempo lleva en estado is_running
        if (!mision.fecha_ultimo_capture) {
          // Usar fecha_inicio o updated_at como referencia
          const fechaReferencia = mision.fecha_inicio || mision.updated_at;
          if (!fechaReferencia) {
            console.warn('⚠️ [VERIFICAR] Misión sin fechas de referencia, saltando:', mision.id);
            continue;
          }

          const tiempoTranscurrido = ahora.getTime() - new Date(fechaReferencia).getTime();

          if (tiempoTranscurrido > QUINCE_MIN_30_SEG_MS) {
            console.log(`⏰ [VERIFICAR] Misión ${mision.id} (${mision.tipo} #${mision.id_referencia}) sin capturas y más de 15:30 min desde inicio`);
            await this.desactivarMision(mision.id);
            misionesDesactivadas++;
          }
          continue;
        }

        // 3. Calcular tiempo desde último capture
        const fechaUltimoCapture = new Date(mision.fecha_ultimo_capture);
        const tiempoDesdeUltimoCapture = ahora.getTime() - fechaUltimoCapture.getTime();

        // 4. Si pasaron más de 15 minutos 30 segundos, actualizar a inactiva
        if (tiempoDesdeUltimoCapture > QUINCE_MIN_30_SEG_MS) {
          console.log(`⏰ [VERIFICAR] Misión ${mision.id} (${mision.tipo} #${mision.id_referencia}) inactiva detectada:`, {
            ultimo_capture: mision.fecha_ultimo_capture,
            tiempo_transcurrido_seg: Math.round(tiempoDesdeUltimoCapture / 1000),
            limite_seg: Math.round(QUINCE_MIN_30_SEG_MS / 1000)
          });

          await this.desactivarMision(mision.id);
          misionesDesactivadas++;
        }
      }

      const misionesQuePermanenActivas = totalMisiones - misionesDesactivadas;

      if (misionesDesactivadas > 0) {
        console.log(`✅ [VERIFICAR] ${misionesDesactivadas} misiones desactivadas, ${misionesQuePermanenActivas} siguen activas`);
      } else {
        console.log('✅ [VERIFICAR] Todas las misiones activas están capturando correctamente');
      }

      return {
        total: totalMisiones,
        desactivadas: misionesDesactivadas,
        activas: misionesQuePermanenActivas
      };
    } catch (error) {
      console.error('❌ Error en verificarYActualizarMisionesInactivas:', error);
      return { total: 0, desactivadas: 0, activas: 0 };
    }
  }

  /**
   * Desactivar una misión (poner is_running = false)
   */
  private async desactivarMision(idMisionActiva: string): Promise<void> {
    // 🚫 COMPLETAMENTE DESACTIVADO - No pausar nunca
    console.log('🚫 [DESACTIVAR] Función DESACTIVADA - NO pausar misión:', idMisionActiva);
    return;
    
    try {
      // Código desactivado...
    } catch (error) {
      console.error('❌ Error en desactivarMision:', error);
    }
  }

}

// Exportar instancia singleton
export const misionActivaRepository = new SupabaseMisionActivaRepository();
