/**
 * play-pause-handlers.ts
 *
 * Funciones para manejar el estado play/pause de actividades y misiones.
 * Gestiona captura de pantalla, permisos del navegador y sincronización con Supabase.
 */

import { Card } from '../types';

/**
 * Tipo de entidad que puede tener play/pause
 */
export type PlayPauseType = 'actividad' | 'mision';

/**
 * Usuario con datos necesarios para captura
 */
export interface Usuario {
  id?: string;
  userAuth?: string;
  email?: string;
  getNombreCompleto?: () => string;
  profile?: any;
}

/**
 * Parámetros para solicitar permiso de pantalla
 */
export interface ScreenPermissionOptions {
  cursor?: boolean;
  audio?: boolean;
}

/**
 * Resultado de solicitar permiso de pantalla
 */
export interface ScreenPermissionResult {
  granted: boolean;
  mediaStream?: MediaStream;
  error?: Error;
}

/**
 * Solicita permiso de captura de pantalla al usuario
 *
 * @param options - Opciones de captura (cursor, audio)
 * @returns Resultado con el MediaStream si se concede permiso
 *
 * @example
 * const result = await requestScreenPermission({ cursor: true, audio: false });
 * if (result.granted && result.mediaStream) {
 *   // Usar mediaStream
 * }
 *
 * Importante:
 * - DEBE llamarse durante un "user gesture" (click, keypress, etc.)
 * - El navegador mostrará un diálogo de selección de pantalla
 * - Si el usuario cancela, granted será false
 */
export async function requestScreenPermission(
  options: ScreenPermissionOptions = { cursor: true, audio: false }
): Promise<ScreenPermissionResult> {
  try {
    console.log('🎥 Solicitando permiso de pantalla...');

    const mediaStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: options.cursor ? ("always" as any) : undefined
      },
      audio: options.audio
    } as DisplayMediaStreamOptions);

    console.log('✅ Permiso de pantalla concedido');
    return { granted: true, mediaStream };
  } catch (error) {
    console.error('❌ Usuario canceló el permiso de pantalla:', error);
    return { granted: false, error: error as Error };
  }
}

/**
 * Parámetros para iniciar una sesión de captura
 */
export interface StartCaptureParams {
  userId: string;
  userEmail: string;
  entityId: string;
  entityName: string;
  mediaStream: MediaStream;
  totalTrabajadoHoy?: string;
  tiempoTareaActual?: string;
  onCaptureUpdate?: (url: string) => void;
  startCapturing: (params: any) => Promise<void>;
}

/**
 * Inicia una sesión de captura de pantalla
 *
 * @param params - Parámetros de captura
 *
 * Proceso:
 * 1. Llama a startCapturing con los parámetros configurados
 * 2. Registra el callback de actualización de captura
 */
export async function startCaptureSession(params: StartCaptureParams): Promise<void> {
  const {
    userId,
    userEmail,
    entityId,
    entityName,
    mediaStream,
    totalTrabajadoHoy,
    tiempoTareaActual,
    onCaptureUpdate,
    startCapturing
  } = params;

  await startCapturing({
    userId,
    userEmail,
    actividadId: entityId,
    misionActividad: entityName,
    totalTrabajadoHoy,
    tiempoTareaActual,
    mediaStream,
    onCaptureUpdate
  });

  console.log('✅ Sesión de captura iniciada exitosamente');
}

/**
 * Datos de la misión/actividad activa
 */
export interface MisionActiva {
  id: string;
  tipo: PlayPauseType;
  id_referencia: number;
  id_usuario_asignado: string;
  id_creador: string | null;
}

/**
 * Parámetros para crear/obtener una entidad activa
 */
export interface GetOrCreateParams {
  tipo: PlayPauseType;
  id_referencia: number;
  id_usuario_asignado: string;
  id_creador?: string;
}

/**
 * Parámetros para manejar play/pause genérico
 */
export interface HandlePlayPauseParams {
  cardId: string;
  currentIsRunning: boolean;
  tipo: PlayPauseType;
  cards: Card[];
  isCapturing: boolean;
  usuario: Usuario | null;
  startCapturing: (params: any) => Promise<void>;
  stopCapturing: () => void;
  getOrCreateMisionActiva: (params: GetOrCreateParams) => Promise<MisionActiva | null>;
  updateRunningState: (id: string, updates: any) => Promise<MisionActiva | null>;
  addCaptureUrl: (id: string, url: string) => Promise<MisionActiva | null>;
  onUpdateCard: (cardId: string, updates: any) => void;
}

/**
 * Maneja el play/pause de una actividad o misión de forma genérica
 *
 * @param params - Parámetros completos para manejar play/pause
 *
 * Flujo de PLAY (iniciar):
 * 1. Solicita permiso de pantalla (PRIMERO - user gesture)
 * 2. Crea/obtiene entidad activa en Supabase
 * 3. Inicia captura con MediaStream obtenido
 * 4. Actualiza estado a "en_progreso" en BD
 * 5. Actualiza estado local de la card
 *
 * Flujo de PAUSE (detener):
 * 1. Actualiza estado a "pausada" en Supabase
 * 2. Actualiza estado local de la card
 * 3. Detiene captura de pantalla
 *
 * Manejo de errores:
 * - Si usuario cancela permiso → No se inicia nada
 * - Si falla BD → Se detiene MediaStream
 * - Todos los errores se loggean detalladamente
 */
export async function handlePlayPause(params: HandlePlayPauseParams): Promise<void> {
  const {
    cardId,
    currentIsRunning,
    tipo,
    cards,
    isCapturing,
    usuario,
    startCapturing,
    stopCapturing,
    getOrCreateMisionActiva,
    updateRunningState,
    addCaptureUrl,
    onUpdateCard
  } = params;

  const newRunningState = !currentIsRunning;
  const tipoLabel = tipo === 'actividad' ? 'ACTIVIDAD' : 'MISION';

  console.log(`🎮 [PLAY DEBUG] *** FUNCIÓN LLAMADA ***`, {
    cardId,
    currentIsRunning,
    newRunningState,
    isCapturing,
    tipo
  });

  // ========================================
  // PLAY - Iniciar captura
  // ========================================
  if (newRunningState) {
    console.log(`▶️ [PLAY DEBUG] Iniciando ${tipo}...`);

    try {
      // Si ya estaba capturando, detener primero
      if (isCapturing) {
        console.log('🛑 [PLAY] Ya estaba capturando, deteniendo stream anterior...');
        stopCapturing();
        // Esperar un momento para que se limpie el stream
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const card = cards.find(c => c.id === cardId);
      if (!card) {
        console.error('❌ No se encontró la card');
        throw new Error('CARD_NOT_FOUND');
      }

      // Obtener datos según el tipo
      const data = tipo === 'actividad' ? card.activityData : card.misionData;
      if (!data) {
        console.error(`❌ [${tipoLabel}] Card no tiene ${tipo}Data. Tipo de card:`, card.type);
        console.error(`❌ [${tipoLabel}] Card completa:`, card);
        console.error(`⚠️ [${tipoLabel}] Posible causa: La card no se sincronizó correctamente desde Supabase`);
        alert(`Error: Esta tarjeta de ${tipo} no tiene datos. Por favor, recarga la página o verifica que la ${tipo} existe en la base de datos.`);
        throw new Error('MISSING_DATA');
      }

      // Extraer ID y nombre de la entidad
      const entityId = tipo === 'actividad'
        ? (card.activityData?.id_actividad || cardId.split('-')[1] || '1')
        : String(card.misionData?.id_mision || cardId.split('-')[1] || '1');

      const entityName = tipo === 'actividad'
        ? (card.activityData?.subject || card.title || 'Actividad sin nombre')
        : (card.misionData?.title || card.misionData?.description || card.title || 'Misión sin nombre');

      // Obtener userId (para actividades usar userAuth UUID, para misiones usar id)
      const userId = tipo === 'actividad'
        ? (usuario?.userAuth || 'usuario-desconocido')
        : (usuario?.id || card.misionData?.id_usuario || 'usuario-desconocido');

      console.log(`📤 [PLAY DEBUG] Datos:`, { entityId, userId, entityName });

      // 1. PRIMERO: Solicitar permiso de pantalla (debe estar en user gesture)
      const permissionResult = await requestScreenPermission({ cursor: true, audio: false });
      if (!permissionResult.granted || !permissionResult.mediaStream) {
        console.log('⚠️ Usuario canceló o no se concedió permiso');
        throw new Error('PERMISSION_CANCELLED');
      }

      const mediaStream = permissionResult.mediaStream;

      // 2. SEGUNDO: Crear/obtener entidad activa en Supabase
      console.log('💾 [MISION ACTIVA] Creando/obteniendo entidad activa en Supabase...');
      const misionActiva = await getOrCreateMisionActiva({
        tipo,
        id_referencia: parseInt(entityId),
        id_usuario_asignado: userId,
        id_creador: userId
      });

      if (!misionActiva) {
        console.error('❌ No se pudo crear/obtener la entidad activa');
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      console.log('✅ [MISION ACTIVA] Entidad activa obtenida:', misionActiva.id);

      // 3. TERCERO: Iniciar captura con el stream ya obtenido
      await startCaptureSession({
        userId,
        userEmail: usuario?.email || '',
        entityId,
        entityName,
        mediaStream,
        totalTrabajadoHoy: tipo === 'actividad'
          ? card.activityData?.duration?.toString()
          : card.misionData?.hours?.toString(),
        tiempoTareaActual: tipo === 'actividad'
          ? card.activityData?.timeLeft?.toString()
          : undefined,
        startCapturing,
        onCaptureUpdate: async (url: string) => {
          console.log('📸 [MISION ACTIVA] Guardando captura en Supabase:', url);
          await addCaptureUrl(misionActiva.id, url);
          console.log('✅ [MISION ACTIVA] Captura guardada en misiones_activas');

          // Para misiones, también actualizar lastCaptureUrl en el card
          // IMPORTANTE: Obtener datos actuales del card para no borrar nada
          if (tipo === 'mision') {
            const currentCard = cards.find(c => c.id === cardId);
            onUpdateCard(cardId, {
              misionData: {
                ...currentCard?.misionData,
                lastCaptureUrl: url
              }
            });
          }
        }
      });

      console.log(`✅ [PLAY DEBUG] Captura iniciada exitosamente`);

      // 4. Actualizar estado en Supabase a "en_progreso"
      console.log('💾 [MISION ACTIVA] Actualizando estado a en_progreso en Supabase...');
      await updateRunningState(misionActiva.id, {
        is_running: true,
        estado: 'en_progreso',
        fecha_inicio: new Date().toISOString()
      });
      console.log('✅ [MISION ACTIVA] Estado en_progreso guardado en Supabase');

      // 5. Actualizar estado local
      // IMPORTANTE: Obtener datos actuales del card para no borrar nada
      const currentCard = cards.find(c => c.id === cardId);
      const updateKey = tipo === 'actividad' ? 'activityData' : 'misionData';
      const currentData = tipo === 'actividad' ? currentCard?.activityData : currentCard?.misionData;

      onUpdateCard(cardId, {
        [updateKey]: {
          ...currentData,
          isRunning: true,
          misionActivaId: misionActiva.id
        }
      });

      console.log(`✅ [PLAY DEBUG] Estado actualizado, contador activado`);
    } catch (error) {
      console.error(`❌ Error iniciando captura de ${tipo}:`, error);
    }
  }
  // ========================================
  // PAUSE - Detener captura
  // ========================================
  else if (!newRunningState) {  // ✅ Siempre permitir pausar
    console.log(`⏸️ [PLAY DEBUG] Pausando ${tipo}...`);
    console.log(`⏸️ [PLAY DEBUG] isCapturing actual: ${isCapturing}`);

    try {
      const card = cards.find(c => c.id === cardId);
      if (!card) {
        console.error('❌ No se encontró la card');
        return;
      }

      // Obtener misionActivaId del card
      const data = tipo === 'actividad' ? card.activityData : card.misionData;
      const misionActivaId = data?.misionActivaId;

      if (misionActivaId) {
        // 1. Actualizar estado en Supabase a "pausada"
        console.log('💾 [PLAY DEBUG] Actualizando estado a pausada en Supabase...');
        await updateRunningState(misionActivaId, {
          is_running: false,
          estado: 'pausada',
          fecha_fin: new Date().toISOString()
        });
        console.log('✅ [PLAY DEBUG] Estado pausada guardado en Supabase');
      }

      // 2. Actualizar estado local
      const currentCard = cards.find(c => c.id === cardId);
      const updateKey = tipo === 'actividad' ? 'activityData' : 'misionData';
      const currentData = tipo === 'actividad' ? currentCard?.activityData : currentCard?.misionData;

      onUpdateCard(cardId, {
        [updateKey]: {
          ...currentData,
          isRunning: false
        }
      });
      console.log('✅ [PLAY DEBUG] Estado local actualizado a isRunning: false');

      // 3. Detener captura de pantalla SOLO si está capturando
      if (isCapturing) {
        console.log('🛑 [PLAY DEBUG] Deteniendo captura de pantalla...');
        stopCapturing();
        console.log('✅ [PLAY DEBUG] Captura de pantalla detenida');
      } else {
        console.log('ℹ️ [PLAY DEBUG] No hay captura activa para detener (página recargada)');
      }

      console.log(`✅ [PLAY DEBUG] ${tipo} pausada exitosamente`);
    } catch (error) {
      console.error(`❌ Error pausando ${tipo}:`, error);
    }
  }
}

/**
 * Wrapper para manejar play/pause de actividades
 */
export async function handleActivityPlayPause(
  params: Omit<HandlePlayPauseParams, 'tipo'>
): Promise<void> {
  return handlePlayPause({ ...params, tipo: 'actividad' });
}

/**
 * Wrapper para manejar play/pause de misiones
 */
export async function handleMisionPlayPause(
  params: Omit<HandlePlayPauseParams, 'tipo'>
): Promise<void> {
  return handlePlayPause({ ...params, tipo: 'mision' });
}
