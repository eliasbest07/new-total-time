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
   * Obtener misiÃ³n activa por tipo, referencia y usuario
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
        console.error('âŒ Error obteniendo misiÃ³n activa:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('âŒ Error en getByTipoAndReferencia:', error);
      return null;
    }
  }

  /**
   * Obtener misiÃ³n activa solo por tipo y referencia (cualquier usuario)
   */
  async getByTipoAndReferenciaOnly(
    tipo: 'mision' | 'actividad',
    idReferencia: number
  ): Promise<MisionActiva | null> {
    try {
      console.log('ðŸ” [SUPABASE] Buscando misiÃ³n activa:', { tipo, id_referencia: idReferencia });

      // Usar .limit(1) en lugar de .maybeSingle() para evitar problemas con RLS
      const { data, error } = await supabase
        .from('misiones_activas')
        .select('*')
        .eq('tipo', tipo)
        .eq('id_referencia', idReferencia)
        .limit(1);

      if (error) {
        console.error('âŒ [SUPABASE] Error obteniendo misiÃ³n activa:', error);
        console.error('ðŸ’¡ Posible problema de RLS (Row Level Security)');
        return null;
      }

      // data es un array con .limit(1)
      const mision = data && data.length > 0 ? data[0] : null;

      if (mision) {
        console.log('âœ… [SUPABASE] MisiÃ³n activa encontrada:', {
          id: mision.id,
          estado: mision.estado,
          is_running: mision.is_running,
          id_usuario_asignado: mision.id_usuario_asignado,
          id_referencia: mision.id_referencia
        });
      } else {
        console.log('â„¹ï¸ [SUPABASE] No se encontrÃ³ misiÃ³n activa para id_referencia:', idReferencia);
        console.log('ðŸ’¡ Esto puede ser por: 1) No existe, 2) RLS estÃ¡ bloqueando el acceso');
      }

      return mision;
    } catch (error) {
      console.error('âŒ Error en getByTipoAndReferenciaOnly:', error);
      return null;
    }
  }

  /**
   * Crear nueva misiÃ³n activa (solo INSERT)
   */
  async create(dto: CreateMisionActivaDTO): Promise<MisionActiva | null> {
    try {
      console.log('ðŸ“ [CREATE] Creando nueva misiÃ³n activa:', {
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
        console.error('âŒ Error creando misiÃ³n activa:', error);
        return null;
      }

      console.log('âœ… [CREATE] MisiÃ³n activa creada:', data.id);
      return data;
    } catch (error) {
      console.error('âŒ Error en create:', error);
      return null;
    }
  }

  /**
   * Actualizar misiÃ³n activa existente (resetear a estado inicial)
   */
  async resetMisionActiva(
    idMisionActiva: string,
    nuevoUsuarioAsignado: string
  ): Promise<MisionActiva | null> {
    try {
      console.log('ðŸ”„ [RESET] Reseteando misiÃ³n activa:', {
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
        console.error('âŒ Error reseteando misiÃ³n activa:', error);
        return null;
      }

      console.log('âœ… [RESET] MisiÃ³n activa reseteada:', data.id);
      return data;
    } catch (error) {
      console.error('âŒ Error en resetMisionActiva:', error);
      return null;
    }
  }

  /**
   * Actualizar estado de ejecuciÃ³n (play/pause) por ID de misiÃ³n activa
   */
  async updateRunningState(
    idMisionActiva: string,
    dto: UpdateRunningStateDTO
  ): Promise<MisionActiva | null> {
    try {
      // console.log('â–¶ï¸ Actualizando estado de ejecuciÃ³n:', dto.is_running ? 'PLAY' : 'PAUSE');

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

      // Si se estÃ¡ iniciando (PLAY)
      if (dto.is_running && dto.fecha_inicio) {
        updateData.fecha_inicio = dto.fecha_inicio;
        updateData.estado = 'en_progreso';
      }

      // Si se estÃ¡ pausando
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
        console.error('âŒ Error actualizando estado:', error);
        return null;
      }

      // console.log('âœ… Estado actualizado');
      return data;
    } catch (error) {
      console.error('âŒ Error en updateRunningState:', error);
      return null;
    }
  }

  /**
   * Actualizar fecha de Ãºltima captura por ID de misiÃ³n activa
   * Nota: Las capturas se guardan en la tabla 'capture', no en misiones_activas
   */
  async addCaptureUrl(idMisionActiva: string, captureUrl: string): Promise<MisionActiva | null> {
    try {
      // console.log('ðŸ“¸ Actualizando fecha de Ãºltima captura');

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
        console.error('âŒ Error actualizando fecha de captura:', error);
        return null;
      }

      // console.log('âœ… Fecha de captura actualizada:', fechaActual);
      return data;
    } catch (error) {
      console.error('âŒ Error en addCaptureUrl:', error);
      return null;
    }
  }

  /**
   * Enviar entrega por ID de misiÃ³n activa
   * Crea/actualiza el entregable y actualiza el estado de la misiÃ³n activa
   * Nota: Las capturas se consultan desde la tabla 'capture', no se duplican en entregables
   */
  async submitEntrega(
    idMisionActiva: string,
    dto: SubmitEntregaDTO
  ): Promise<MisionActiva | null> {
    try {
      console.log('ðŸ“¦ Enviando entrega para misiÃ³n activa:', idMisionActiva);

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
        console.error('âŒ Error creando entregable:', entregableError);
        return null;
      }

      console.log('âœ… Entregable creado/actualizado:', entregable.id);

      // 2. Actualizar estado de la misiÃ³n activa
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
        console.error('âŒ Error actualizando misiÃ³n activa:', error);
        return null;
      }

      console.log('âœ… Entrega enviada correctamente');
      return data;
    } catch (error) {
      console.error('âŒ Error en submitEntrega:', error);
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
        console.error('âŒ Error obteniendo misiones del usuario:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('âŒ Error en getByUserId:', error);
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
        console.error('âŒ Error obteniendo misiones entregadas:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('âŒ Error en getEntregadasByUserId:', error);
      return [];
    }
  }

  /**
   * Actualizar la columna capture_now
   * Si el valor es una URL (captura recibida), tambiÃ©n actualiza fecha_ultimo_capture
   * para evitar que la misiÃ³n sea marcada como inactiva
   */
  async updateCaptureNow(idMisionActiva: string, value: string): Promise<MisionActiva | null> {
    try {
      console.log('ðŸ“¸ Actualizando capture_now a:', value);

      const fechaActual = new Date().toISOString();

      // Si es una URL de captura, tambiÃ©n actualizar fecha_ultimo_capture
      // Esto evita que la verificaciÃ³n de inactividad pause la misiÃ³n
      const updateData: any = {
        capture_now: value,
        updated_at: fechaActual
      };

      // Si el valor es una URL (empieza con http), es una captura recibida
      if (value.startsWith('http')) {
        updateData.fecha_ultimo_capture = fechaActual;
        console.log('ðŸ“¸ TambiÃ©n actualizando fecha_ultimo_capture (captura recibida)');
      }

      const { data, error } = await supabase
        .from('misiones_activas')
        .update(updateData)
        .eq('id', idMisionActiva)
        .select()
        .single();

      if (error) {
        console.error('âŒ Error actualizando capture_now:', error);
        return null;
      }

      console.log('âœ… capture_now actualizado');
      return data;
    } catch (error) {
      console.error('âŒ Error en updateCaptureNow:', error);
      return null;
    }
  }

  /**
   * Suscribirse a cambios en tiempo real de una misiÃ³n activa por ID
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
          console.log('ðŸ”” Cambio en misiÃ³n activa:', payload.new);
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

    console.log('ðŸ“¡ [REALTIME] SuscripciÃ³n creada:', { tipo, id_referencia: idReferencia });

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
            console.log('ðŸ“¡ [REALTIME] Cambio detectado:', {
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
          console.log('âœ… [REALTIME] SuscripciÃ³n activa para:', { tipo, id_referencia: idReferencia });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('âŒ [REALTIME] Error en suscripciÃ³n:', err);
        }
      });

    return channel;
  }

  /**
   * Verificar y pausar misiones en_progreso sin capturas en 10 min
   */
  async verificarYActualizarMisionesInactivas(): Promise<{
    total: number;
    desactivadas: number;
    activas: number;
  }> {
    const fmt = (iso: string) => new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

    try {
      // 1. LIMPIEZA DE ZOMBIES: Misiones que en la tabla principal dicen 'en_progreso' pero no están activas en misiones_activas
      console.log('[EN_PROCESO] Buscando misiones "zombies" (en_progreso en main, pero inactivas)...');
      const { data: misionesZombies, error: zombieError } = await supabase
        .from('misiones')
        .select('id, estado')
        .eq('estado', 'en_progreso');

      if (!zombieError && misionesZombies && misionesZombies.length > 0) {
        // Verificar cuáles NO están en misiones_activas con is_running=true
        const { data: activasReales } = await supabase
          .from('misiones_activas')
          .select('id_referencia')
          .eq('is_running', true)
          .in('id_referencia', misionesZombies.map(m => m.id));

        const idsReales = new Set(activasReales?.map(a => a.id_referencia) || []);
        const zombiesReales = misionesZombies.filter(m => !idsReales.has(m.id));

        if (zombiesReales.length > 0) {
          console.log(`[EN_PROCESO] 🧟 Encontrados ${zombiesReales.length} zombies. Corrigiendo a 'pausada'...`);
          const { error: updateZombieError } = await supabase
            .from('misiones')
            .update({ estado: 'pausada' })
            .in('id', zombiesReales.map(z => z.id));

          if (updateZombieError) console.error('[EN_PROCESO] ❌ Error corrigiendo zombies:', updateZombieError);
          else console.log('[EN_PROCESO] ✅ Zombies corregidos.');
        } else {
          console.log('[EN_PROCESO] No se encontraron zombies reales.');
        }
      }

      // 2. VERIFICACIÓN STANDARD: Misiones activas sin captura reciente
      const { data: misionesEnProgreso, error: queryError } = await supabase
        .from('misiones_activas')
        .select('id, tipo, id_referencia, estado, is_running, fecha_ultimo_capture, fecha_inicio, updated_at')
        .eq('estado', 'en_progreso');

      if (queryError) {
        console.error('[EN_PROCESO] ❌ Error en query:', queryError);
        return { total: 0, desactivadas: 0, activas: 0 };
      }

      if (!misionesEnProgreso || misionesEnProgreso.length === 0) {
        console.log('[EN_PROCESO] Sin misiones activas en_progreso');
        return { total: 0, desactivadas: 0, activas: 0 };
      }

      const ahora = new Date();
      const DIEZ_MINUTOS_MS = 10 * 60 * 1000;
      let misionesDesactivadas = 0;

      console.log(`[EN_PROCESO] ═══════════════════════════════════════`);
      console.log(`[EN_PROCESO] ${misionesEnProgreso.length} misión(es) activas verificando tiempo...`);

      for (const m of misionesEnProgreso) {
        const captura = m.fecha_ultimo_capture;
        const fallback = m.fecha_inicio || m.updated_at;
        const fechaUsada = (captura && typeof captura === 'string') ? captura : fallback;
        const origen = (captura && typeof captura === 'string') ? 'última captura' : 'fallback';

        if (!fechaUsada) { continue; }
        const ref = new Date(fechaUsada);
        if (isNaN(ref.getTime())) { continue; }

        const diffMs = ahora.getTime() - ref.getTime();
        const diffMin = (diffMs / 60000).toFixed(1);
        const pasa = diffMs > DIEZ_MINUTOS_MS;

        if (pasa) {
          console.log(`[EN_PROCESO] ⏰ Misión #${m.id_referencia} (${diffMin} min sin captura) → PAUSANDO...`);
          await this.desactivarMision(m.id);
          misionesDesactivadas++;
        }
      }

      if (misionesDesactivadas > 0) {
        console.log(`[EN_PROCESO] RESULTADO: ${misionesDesactivadas} pausadas automática(s).`);
      }
      console.log(`[EN_PROCESO] ═══════════════════════════════════════`);

      return {
        total: misionesEnProgreso.length,
        desactivadas: misionesDesactivadas,
        activas: misionesEnProgreso.length - misionesDesactivadas
      };
    } catch (error) {
      console.error('[EN_PROCESO] ❌ Excepción:', error);
      return { total: 0, desactivadas: 0, activas: 0 };
    }
  }

  private async desactivarMision(idMisionActiva: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('misiones_activas')
        .update({
          is_running: false,
          estado: 'pausada',
          fecha_pausa: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', idMisionActiva)
        .select();

      if (error) {
        console.error(`[EN_PROCESO] âŒ UPDATE fallÃ³ para ${idMisionActiva}:`, error.message);
      } else {
        console.log(`[EN_PROCESO] âœ… ${idMisionActiva} â†’ pausada OK`);
      }
    } catch (error) {
      console.error(`[EN_PROCESO] âŒ ExcepciÃ³n pausando ${idMisionActiva}:`, error);
    }
  }

}

// Exportar instancia singleton
export const misionActivaRepository = new SupabaseMisionActivaRepository();

