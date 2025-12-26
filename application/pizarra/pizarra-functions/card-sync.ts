/**
 * card-sync.ts
 *
 * Funciones para sincronizar tarjetas desde Supabase hacia el estado local de la pizarra.
 * Maneja la carga de datos específicos para cada tipo de tarjeta.
 */

import { Card, MisionData, ActivityData, UsuarioData, TodoItem } from '../types';
import { mapCardDBToCard } from '../utils/cardMapper';
import { CardDB } from '@/domain/entities/Card';

/**
 * Tipo para el objeto Usuario con los datos necesarios
 */
interface Usuario {
  getNombreCompleto?: () => string;
  nombre?: string;
  profile?: {
    marco?: string;
  };
  [key: string]: any; // Permitir propiedades adicionales
}

/**
 * Parámetros para la sincronización de cards
 */
export interface SyncCardsParams {
  cardsDB: CardDB[];
  usuario: Usuario | null;
  isViewingOtherUser: boolean;
  onUpdatePastedImages?: (cardId: string, imageUrl: string) => void;
}

/**
 * Parámetros para verificar si debe sincronizar
 */
export interface ShouldSyncParams {
  pizarra: any;
  cardsDB: CardDB[] | null;
  cardsLocal: Card[];
  isViewingOtherUser: boolean;
  isInitialized: boolean;
}

/**
 * Carga datos específicos de una tarjeta tipo "mision"
 *
 * @param cardDB - Tarjeta desde la base de datos
 * @param card - Tarjeta local a actualizar
 *
 * Proceso:
 * 1. Obtiene la relación card-mision desde card_mision
 * 2. Obtiene los datos completos de la misión
 * 3. Actualiza el objeto card.misionData con toda la información
 */
async function loadMisionData(cardDB: CardDB, card: Card): Promise<void> {
  try {
    console.log('🔍 [CARD-SYNC] Cargando misionData para card:', cardDB.card_id, '(UUID:', cardDB.id, ')');
    const { SupabaseCardMisionRepository } = await import('@/infrastructure/datasource/SupabaseCardMisionRepository');
    const { SupabaseMisionRepository } = await import('@/infrastructure/datasource/SupabaseMisionRepository');

    const cardMisionRepo = new SupabaseCardMisionRepository();
    const misionRepo = new SupabaseMisionRepository();

    const cardMision = await cardMisionRepo.getByCardId(cardDB.id); // ✅ FIX: Usar UUID en lugar de card_id
    console.log('🔍 [CARD-SYNC] cardMision obtenido:', cardMision);

    if (cardMision) {
      const mision = await misionRepo.getMisionById(cardMision.id_mision);
      console.log('🔍 [CARD-SYNC] mision obtenida:', mision);

      if (mision) {
        card.misionData = {
          title: mision.nombre || card.title,
          hours: mision.horas || 1,
          description: mision.descripcion || card.content,
          idCreador: mision.id_creador,
          isRunning: cardMision.is_running,
          lastCaptureUrl: cardMision.last_capture_url,
          id_mision: cardMision.id_mision,
          id_usuario: mision.id_usuario?.toString()
        };
        console.log('✅ [CARD-SYNC] misionData cargado exitosamente:', card.misionData);
      } else {
        console.warn('⚠️ [CARD-SYNC] No se encontró misión con id:', cardMision.id_mision);
      }
    } else {
      console.warn('⚠️ [CARD-SYNC] No se encontró cardMision para card:', cardDB.card_id);
    }
  } catch (error) {
    console.error('❌ [CARD-SYNC] Error cargando datos de misión para card:', cardDB.card_id, error);
  }
}

/**
 * Carga datos específicos de una tarjeta tipo "actividad"
 *
 * @param cardDB - Tarjeta desde la base de datos
 * @param card - Tarjeta local a actualizar
 * @param usuario - Usuario actual para crear participante
 *
 * Proceso:
 * 1. Obtiene datos de card_actividad
 * 2. Crea objeto de participante con datos del usuario actual
 * 3. Actualiza card.activityData con toda la información
 */
async function loadActividadData(cardDB: CardDB, card: Card, usuario: Usuario | null): Promise<void> {
  if (!usuario) return;

  try {
    const { SupabaseCardActividadRepository } = await import('@/infrastructure/datasource/SupabaseCardActividadRepository');
    const cardActividadRepo = new SupabaseCardActividadRepository();

    const cardActividad = await cardActividadRepo.getByCardId(cardDB.id); // ✅ FIX: Usar UUID
    if (cardActividad) {
      const currentUserParticipant = {
        name: usuario.getNombreCompleto ? usuario.getNombreCompleto() : '',
        initial: usuario.getNombreCompleto ? usuario.getNombreCompleto().charAt(0).toUpperCase() : '',
        color: usuario.profile?.marco ?? '#3b82f6'
      };

      card.activityData = {
        subject: cardActividad.subject || '',
        participants: [currentUserParticipant],
        date: cardActividad.date || '',
        time: cardActividad.time || '',
        duration: cardActividad.duration || 0,
        isRunning: cardActividad.is_running || false,
        timeLeft: cardActividad.time_left || 0,
        id_actividad: cardDB.id
      };
    }
  } catch (error) {
    console.error('Error cargando datos de actividad:', error);
  }
}

/**
 * Carga datos específicos de una tarjeta tipo "usuario"
 *
 * @param cardDB - Tarjeta desde la base de datos
 * @param card - Tarjeta local a actualizar
 *
 * Proceso:
 * 1. Obtiene datos básicos de card_usuario
 * 2. Intenta parsear mensajes desde card.content (JSON)
 * 3. Convierte timestamps de string a Date
 * 4. Actualiza card.usuarioData con toda la información
 */
async function loadUsuarioData(cardDB: CardDB, card: Card): Promise<void> {
  try {
    const { SupabaseCardUsuarioRepository } = await import('@/infrastructure/datasource/SupabaseCardUsuarioRepository');
    const cardUsuarioRepo = new SupabaseCardUsuarioRepository();

    const cardUsuario = await cardUsuarioRepo.getByCardId(cardDB.id); // ✅ FIX: Usar UUID
    if (cardUsuario) {
      card.usuarioData = {
        userId: cardUsuario.user_id,
        name: cardUsuario.name || '',
        avatar: cardUsuario.avatar || '',
        color: cardUsuario.color || '#3b82f6',
        online: cardUsuario.online || false,
        messages: []
      };

      // Intentar parsear mensajes desde content
      if (card.content) {
        try {
          const parsedContent = JSON.parse(card.content);
          if (parsedContent.messages && Array.isArray(parsedContent.messages)) {
            card.usuarioData.messages = parsedContent.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }));
          }
        } catch (e) {
          console.log('No hay mensajes en formato JSON para esta card de usuario');
        }
      }
    }
  } catch (error) {
    console.error('Error cargando datos de usuario:', error);
  }
}

/**
 * Carga todos (tareas) de una tarjeta tipo "todo"
 *
 * @param cardDB - Tarjeta desde la base de datos
 * @param card - Tarjeta local a actualizar
 *
 * Proceso:
 * 1. Obtiene lista de todos desde card_todo
 * 2. Mapea a formato TodoItem
 * 3. Actualiza card.todos con el array
 */
async function loadTodoData(cardDB: CardDB, card: Card): Promise<void> {
  try {
    const { SupabaseCardTodoRepository } = await import('@/infrastructure/datasource/SupabaseCardTodoRepository');
    const cardTodoRepo = new SupabaseCardTodoRepository();

    const cardTodos = await cardTodoRepo.getByCardId(cardDB.id); // ✅ FIX: Usar UUID
    if (cardTodos && cardTodos.length > 0) {
      card.todos = cardTodos.map(todo => ({
        id: todo.todo_id,
        text: todo.text,
        completed: todo.completed
      }));
    }
  } catch (error) {
    console.error('Error cargando todos:', error);
  }
}

/**
 * Carga URL de imagen de una tarjeta tipo "image"
 *
 * @param cardDB - Tarjeta desde la base de datos
 * @param card - Tarjeta local a actualizar
 * @param onUpdatePastedImages - Callback para actualizar el estado de imágenes pegadas
 *
 * Proceso:
 * 1. Obtiene URL de imagen desde card_image
 * 2. Actualiza card.imageUrl
 * 3. Llama al callback para actualizar estado global de imágenes
 */
async function loadImageData(
  cardDB: CardDB,
  card: Card,
  onUpdatePastedImages?: (cardId: string, imageUrl: string) => void
): Promise<void> {
  try {
    const { SupabaseCardImageRepository } = await import('@/infrastructure/datasource/SupabaseCardImageRepository');
    const cardImageRepo = new SupabaseCardImageRepository();

    const cardImage = await cardImageRepo.getByCardId(cardDB.id); // ✅ FIX: Usar UUID
    if (cardImage) {
      card.imageUrl = cardImage.image_url;
      if (onUpdatePastedImages) {
        onUpdatePastedImages(card.id, cardImage.image_url);
      }
    }
  } catch (error) {
    console.error('Error cargando imagen:', error);
  }
}

/**
 * Carga datos de proyecto y notas asociadas a una tarjeta tipo "proyecto" o "proyecto-organizacion"
 *
 * @param cardDB - Tarjeta desde la base de datos
 * @param card - Tarjeta local a actualizar
 *
 * Proceso:
 * 1. Obtiene la relación card-proyecto desde card_proyectos
 * 2. Obtiene los datos completos del proyecto desde la tabla proyectos
 * 3. Obtiene notas asociadas desde card_proyecto_nota
 * 4. Actualiza el objeto card.proyectoData con toda la información
 */
async function loadProyectoData(cardDB: CardDB, card: Card): Promise<void> {
  try {
    console.log('🔍 [CARD-SYNC] Cargando proyectoData para card:', cardDB.card_id, '(UUID:', cardDB.id, ')');

    const { SupabaseCardProyectoRepository } = await import('@/infrastructure/datasource/SupabaseCardProyectoRepository');
    const { SupabaseProyectoRepository } = await import('@/infrastructure/datasource/SupabaseProyectoRepository');
    // const { SupabaseCardProyectoNotaRepository } = await import('@/infrastructure/datasource/SupabaseCardProyectoNotaRepository');

    const cardProyectoRepo = new SupabaseCardProyectoRepository();
    const proyectoRepo = new SupabaseProyectoRepository();
    // const cardProyectoNotaRepo = new SupabaseCardProyectoNotaRepository();

    // 1. Obtener la relación card-proyecto
    const cardProyecto = await cardProyectoRepo.getByCardId(cardDB.id); // ✅ FIX: Usar UUID
    console.log('🔍 [CARD-SYNC] cardProyecto obtenido:', cardProyecto);

    if (cardProyecto) {
      // 2. Obtener los datos completos del proyecto
      const proyecto = await proyectoRepo.getProyectoById(cardProyecto.id_proyecto);
      console.log('🔍 [CARD-SYNC] proyecto obtenido:', proyecto);

      if (proyecto) {
        // 3. Obtener notas asociadas (COMENTADO - tabla no existe)
        // const proyectoNotas = await cardProyectoNotaRepo.getByCardProyectoId(cardDB.id);
        // const notasIds = proyectoNotas ? proyectoNotas.map(nota => nota.id_card_nota) : [];
        const notasIds: string[] = [];

        // Parsear colors de forma segura
        let parsedColors = null;
        if (proyecto.colors && typeof proyecto.colors === 'string' && proyecto.colors.trim()) {
          try {
            parsedColors = JSON.parse(proyecto.colors);
          } catch { /* ignorar error de parsing */ }
        }

        // 4. Actualizar proyectoData
        card.proyectoData = {
          id: proyecto.id,
          nombre: proyecto.nombre || card.title,
          descripcion: proyecto.descripcion || null,
          icono: proyecto.icono || null,
          id_organizacion: proyecto.id_organizacion || null,
          colors: parsedColors,
          created_at: proyecto.created_at,
          notas: notasIds
        };
        console.log('✅ [CARD-SYNC] proyectoData cargado exitosamente:', {
          proyectoId: card.proyectoData.id,
          proyectoIdType: typeof card.proyectoData.id,
          nombre: card.proyectoData.nombre,
          cardId: cardDB.card_id
        });
      } else {
        console.warn('⚠️ [CARD-SYNC] No se encontró proyecto con id:', cardProyecto.id_proyecto);
      }
    } else {
      console.warn('⚠️ [CARD-SYNC] No se encontró cardProyecto para card:', cardDB.card_id);

      // Fallback: intentar leer proyectoId del campo content (guardado como JSON)
      let proyectoIdFromContent: number | null = null;
      if (cardDB.content) {
        try {
          const contentData = JSON.parse(cardDB.content);
          if (contentData.proyectoId) {
            proyectoIdFromContent = contentData.proyectoId;
            console.log('🔄 [CARD-SYNC] proyectoId encontrado en content:', proyectoIdFromContent);
          }
        } catch {
          // No es JSON válido, ignorar
        }
      }

      if (proyectoIdFromContent) {
        // Cargar proyecto usando el ID del content
        const proyecto = await proyectoRepo.getProyectoById(proyectoIdFromContent);
        if (proyecto) {
          // COMENTADO - tabla card_proyecto_notas no existe
          // const proyectoNotas = await cardProyectoNotaRepo.getByCardProyectoId(cardDB.id);
          // const notasIds = proyectoNotas ? proyectoNotas.map(nota => nota.id_card_nota) : [];
          const notasIds: string[] = [];

          // Parsear colors de forma segura
          let parsedColors = null;
          if (proyecto.colors && typeof proyecto.colors === 'string' && proyecto.colors.trim()) {
            try {
              parsedColors = JSON.parse(proyecto.colors);
            } catch { /* ignorar error de parsing */ }
          }

          card.proyectoData = {
            id: proyecto.id,
            nombre: proyecto.nombre || card.title,
            descripcion: proyecto.descripcion || null,
            icono: proyecto.icono || null,
            id_organizacion: proyecto.id_organizacion || null,
            colors: parsedColors,
            created_at: proyecto.created_at,
            notas: notasIds
          };
          console.log('✅ [CARD-SYNC] proyectoData cargado desde content:', {
            proyectoId: card.proyectoData.id,
            nombre: card.proyectoData.nombre
          });

          // Crear la relación card_proyectos para futuras cargas
          try {
            await cardProyectoRepo.create({
              id_card: cardDB.id,
              id_proyecto: proyectoIdFromContent
            });
            console.log('✅ [CARD-SYNC] Relación card_proyectos creada automáticamente');
          } catch (e) {
            // Puede fallar si ya existe, ignorar
          }
        }
      } else {
        // Fallback: intentar cargar solo las notas asociadas
        // COMENTADO - tabla card_proyecto_notas no existe
        // const proyectoNotas = await cardProyectoNotaRepo.getByCardProyectoId(cardDB.id);
        // if (proyectoNotas && proyectoNotas.length > 0 && card.proyectoData) {
        //   card.proyectoData.notas = proyectoNotas.map(nota => nota.id_card_nota);
        //   console.log('ℹ️ [CARD-SYNC] Solo se cargaron notas del proyecto (sin datos de proyecto)');
        // }
      }
    }
  } catch (error) {
    console.error('❌ [CARD-SYNC] Error cargando datos de proyecto para card:', cardDB.card_id, error);
  }
}

/**
 * Sincroniza todas las tarjetas desde la base de datos hacia el estado local
 *
 * @param params - Parámetros de sincronización
 * @returns Array de tarjetas mapeadas y enriquecidas con datos específicos
 *
 * @example
 * const mappedCards = await syncCardsFromDB({
 *   cardsDB,
 *   usuario,
 *   isViewingOtherUser: false,
 *   onUpdatePastedImages: (cardId, url) => setPastedImages(prev => ({...prev, [cardId]: url}))
 * });
 *
 * Proceso principal:
 * 1. Itera sobre cada card de la BD
 * 2. Mapea la estructura base con mapCardDBToCard
 * 3. Según el tipo, carga datos específicos:
 *    - mision: loadMisionData
 *    - actividad: loadActividadData
 *    - usuario: loadUsuarioData
 *    - todo: loadTodoData
 *    - image: loadImageData
 *    - proyecto/proyecto-organizacion: loadProyectoData
 * 4. Retorna array completo de cards enriquecidas
 */
export async function syncCardsFromDB(params: SyncCardsParams): Promise<Card[]> {
  const { cardsDB, usuario, onUpdatePastedImages } = params;

  const mappedCards: Card[] = [];

  console.log('🔄 [CARD-SYNC] Procesando', cardsDB.length, 'cards desde Supabase');

  for (const cardDB of cardsDB) {
    console.log(`📝 [CARD-SYNC] Procesando card tipo="${cardDB.type}" id="${cardDB.id}" card_id="${cardDB.card_id}"`);

    const card = mapCardDBToCard(cardDB);

    // Cargar datos específicos según el tipo de card
    switch (cardDB.type) {
      case 'mision':
        console.log('🎯 [CARD-SYNC] Entrando a case mision para card:', cardDB.card_id);
        await loadMisionData(cardDB, card);
        break;

      case 'mision-organizacion':
        console.log('🏢 [CARD-SYNC] Entrando a case mision-organizacion para card:', cardDB.card_id);
        await loadMisionData(cardDB, card);
        break;

      case 'actividad':
        await loadActividadData(cardDB, card, usuario);
        break;

      case 'usuario':
        await loadUsuarioData(cardDB, card);
        break;

      case 'todo':
        await loadTodoData(cardDB, card);
        break;

      case 'image':
        await loadImageData(cardDB, card, onUpdatePastedImages);
        break;

      case 'proyecto':
      case 'proyecto-organizacion':
        await loadProyectoData(cardDB, card);
        break;
    }

    mappedCards.push(card);
  }

  console.log('✅ [CARD-SYNC] Total cards mapeadas:', mappedCards.length);
  return mappedCards;
}

/**
 * Determina si se debe sincronizar desde Supabase
 *
 * @param params - Parámetros de verificación
 * @returns true si debe sincronizar, false si no
 *
 * Lógica:
 * - Si no hay pizarra → NO sincronizar
 * - Si no hay cards en DB → NO sincronizar
 * - Si es pizarra de OTRO usuario → SIEMPRE sincronizar
 * - Si NO está inicializado → SÍ sincronizar (primera carga desde Supabase)
 * - Si es pizarra PROPIA y localStorage tiene datos Y ya está inicializado → NO sincronizar
 * - Si es pizarra PROPIA y localStorage vacío → SÍ sincronizar
 */
export function shouldSyncFromDB(params: ShouldSyncParams): boolean {
  const { pizarra, cardsDB, cardsLocal, isViewingOtherUser, isInitialized } = params;

  console.log('🔍 [shouldSyncFromDB] Verificando condiciones:', {
    hasPizarra: !!pizarra,
    cardsDBLength: cardsDB?.length || 0,
    cardsLocalLength: cardsLocal.length,
    isViewingOtherUser,
    isInitialized
  });

  if (!pizarra) {
    console.log('❌ [shouldSyncFromDB] No hay pizarra → NO sincronizar');
    return false;
  }

  if (!cardsDB || cardsDB.length === 0) {
    console.log('📭 [shouldSyncFromDB] No hay cards en Supabase para cargar → NO sincronizar');
    return false;
  }

  // Para la pizarra propia: Solo cargar desde Supabase al inicio (cuando no está inicializado)
  if (!isViewingOtherUser) {
    // Si NO está inicializado, SIEMPRE sincronizar desde Supabase (primera carga o reload)
    if (!isInitialized) {
      console.log('🆕 [shouldSyncFromDB] Primera carga o reload, sincronizando desde Supabase:', cardsDB.length, 'cards → SÍ sincronizar');
      return true;
    }

    // Si ya está inicializado PERO no hay cards locales y SÍ hay en Supabase, sincronizar
    if (cardsLocal.length === 0 && cardsDB.length > 0) {
      console.log('🔄 [shouldSyncFromDB] Hay cards en Supabase pero pizarra local vacía, sincronizando:', cardsDB.length, 'cards → SÍ sincronizar');
      return true;
    }

    // Si ya está inicializado y hay cards locales, NO sincronizar (para evitar sobrescribir cambios locales)
    console.log('✅ [shouldSyncFromDB] Pizarra ya inicializada con', cardsLocal.length, 'cards locales → NO sincronizar');
    return false;
  } else {
    // Para pizarras compartidas, SIEMPRE sincronizar
    console.log('🔄 [shouldSyncFromDB] Pizarra compartida, sincronizando cards desde Supabase:', cardsDB.length, '→ SÍ sincronizar');
  }

  return true;
}
