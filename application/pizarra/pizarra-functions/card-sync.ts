/**
 * card-sync.ts
 *
 * Funciones para sincronizar tarjetas desde Supabase hacia el estado local de la pizarra.
 * Maneja la carga de datos específicos para cada tipo de tarjeta.
 * Incluye sistema de caché en localStorage para reducir peticiones a BD.
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
 * Helpers para el sistema de caché
 * No usamos el hook useCardDataCache porque estas son funciones puras
 */
const getTodayDate = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const isCacheValid = (savedDate: string | null): boolean => {
  if (!savedDate) return false;
  return savedDate === getTodayDate();
};

const saveCardDataToCache = (cardId: string, data: any, storagePrefix: string = 'real') => {
  try {
    const storageKey = `pizarra-${storagePrefix}-card-data-${cardId}-v1`;
    const cacheData = {
      ...data,
      cachedAt: new Date().toISOString(),
      date: getTodayDate()
    };
    localStorage.setItem(storageKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error('❌ [CARD-CACHE] Error guardando datos:', error);
  }
};

const loadCardDataFromCache = (cardId: string, storagePrefix: string = 'real'): any | null => {
  try {
    const storageKey = `pizarra-${storagePrefix}-card-data-${cardId}-v1`;
    const savedData = localStorage.getItem(storageKey);

    if (!savedData) return null;

    const parsed = JSON.parse(savedData);

    if (!isCacheValid(parsed.date)) {
      localStorage.removeItem(storageKey);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('❌ [CARD-CACHE] Error cargando datos:', error);
    return null;
  }
};

/**
 * Parámetros para la sincronización de cards
 */
export interface SyncCardsParams {
  cardsDB: CardDB[];
  usuario: Usuario | null;
  isViewingOtherUser: boolean;
  onUpdatePastedImages?: (cardId: string, imageUrl: string) => void;
  onCardReady?: (card: Card) => void; // Callback para carga progresiva
  storagePrefix?: string; // Prefijo para localStorage (default: 'real')
  useCache?: boolean; // Si debe usar caché (default: true para pizarras propias)
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
 * @param storagePrefix - Prefijo para localStorage
 * @param useCache - Si debe usar caché (false para pizarras compartidas)
 *
 * Proceso:
 * 1. Intenta cargar desde caché si useCache=true
 * 2. Si no hay caché, obtiene datos de Supabase
 * 3. Guarda en caché para futuras cargas
 */
async function loadMisionData(cardDB: CardDB, card: Card, storagePrefix: string = 'real', useCache: boolean = true): Promise<void> {
  try {
    // 1. Intentar cargar desde caché primero (solo para pizarras propias)
    if (useCache) {
      const cachedData = loadCardDataFromCache(cardDB.card_id, storagePrefix);
      if (cachedData && cachedData.misionData) {
        card.misionData = cachedData.misionData;
        console.log('✅ [CARD-CACHE] misionData cargado desde caché para card:', cardDB.card_id);
        return;
      }
    }

    // 2. Si no hay caché, cargar desde Supabase
    console.log('🔍 [CARD-SYNC] Cargando misionData desde BD para card:', cardDB.card_id, '(UUID:', cardDB.id, ')');
    const { SupabaseCardMisionRepository } = await import('@/infrastructure/datasource/SupabaseCardMisionRepository');
    const { SupabaseMisionRepository } = await import('@/infrastructure/datasource/SupabaseMisionRepository');

    const cardMisionRepo = new SupabaseCardMisionRepository();
    const misionRepo = new SupabaseMisionRepository();

    const cardMision = await cardMisionRepo.getByCardId(cardDB.id);
    console.log('🔍 [CARD-SYNC] cardMision obtenido:', cardMision);

    if (cardMision) {
      const mision = await misionRepo.getMisionById(cardMision.id_mision);
      console.log('🔍 [CARD-SYNC] mision obtenida:', mision);

      if (mision) {
        // Cargar información del usuario asignado si existe
        let usuarioAsignadoNombre: string | null = null;
        let usuarioAsignadoAvatar: string | null = null;

        if (mision.id_usuario) {
          try {
            const { supabase } = await import('@/infrastructure/services/SupabaseClient');
            const { data: usuarioData } = await supabase
              .from('usuario')
              .select('id, nombre, avatar')
              .eq('id', mision.id_usuario)
              .single();

            if (usuarioData) {
              usuarioAsignadoNombre = usuarioData.nombre || 'Sin nombre';
              usuarioAsignadoAvatar = usuarioData.avatar || null;
            }
          } catch (e) {
            // Silenciar error
          }
        }

        card.misionData = {
          title: mision.nombre || card.title,
          hours: mision.horas || 1,
          description: mision.descripcion || card.content,
          idCreador: mision.id_creador,
          isRunning: cardMision.is_running,
          lastCaptureUrl: cardMision.last_capture_url,
          id_mision: cardMision.id_mision,
          id_usuario: mision.id_usuario?.toString(),
          id_usuario_asignado: mision.id_usuario || undefined,
          usuario_asignado_nombre: usuarioAsignadoNombre || undefined,
          usuario_asignado_avatar: usuarioAsignadoAvatar || undefined
        };
        console.log('✅ [CARD-SYNC] misionData cargado exitosamente:', card.misionData);

        // 3. Guardar en caché para próximas cargas (solo para pizarras propias)
        if (useCache) {
          saveCardDataToCache(cardDB.card_id, { misionData: card.misionData }, storagePrefix);
        }
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
async function loadActividadData(cardDB: CardDB, card: Card, usuario: Usuario | null, storagePrefix: string = 'real', useCache: boolean = true): Promise<void> {
  if (!usuario) return;

  try {
    // 1. Intentar cargar desde caché
    if (useCache) {
      const cachedData = loadCardDataFromCache(cardDB.card_id, storagePrefix);
      if (cachedData && cachedData.activityData) {
        card.activityData = cachedData.activityData;
        console.log('✅ [CARD-CACHE] activityData cargado desde caché para card:', cardDB.card_id);
        return;
      }
    }

    // 2. Cargar desde Supabase
    const { SupabaseCardActividadRepository } = await import('@/infrastructure/datasource/SupabaseCardActividadRepository');
    const cardActividadRepo = new SupabaseCardActividadRepository();

    const cardActividad = await cardActividadRepo.getByCardId(cardDB.id);
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

      // 3. Guardar en caché
      if (useCache) {
        saveCardDataToCache(cardDB.card_id, { activityData: card.activityData }, storagePrefix);
      }
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
async function loadUsuarioData(cardDB: CardDB, card: Card, storagePrefix: string = 'real', useCache: boolean = true): Promise<void> {
  try {
    // 1. Intentar cargar desde caché
    if (useCache) {
      const cachedData = loadCardDataFromCache(cardDB.card_id, storagePrefix);
      if (cachedData && cachedData.usuarioData) {
        card.usuarioData = cachedData.usuarioData;
        // Restaurar Date objects en messages
        if (card.usuarioData && card.usuarioData.messages) {
          card.usuarioData.messages = card.usuarioData.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        }
        console.log('✅ [CARD-CACHE] usuarioData cargado desde caché para card:', cardDB.card_id);
        return;
      }
    }

    // 2. Cargar desde Supabase
    const { SupabaseCardUsuarioRepository } = await import('@/infrastructure/datasource/SupabaseCardUsuarioRepository');
    const cardUsuarioRepo = new SupabaseCardUsuarioRepository();

    const cardUsuario = await cardUsuarioRepo.getByCardId(cardDB.id);
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

      // 3. Guardar en caché
      if (useCache) {
        saveCardDataToCache(cardDB.card_id, { usuarioData: card.usuarioData }, storagePrefix);
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
async function loadTodoData(cardDB: CardDB, card: Card, storagePrefix: string = 'real', useCache: boolean = true): Promise<void> {
  try {
    // 1. Intentar cargar desde caché
    if (useCache) {
      const cachedData = loadCardDataFromCache(cardDB.card_id, storagePrefix);
      if (cachedData && cachedData.todos) {
        card.todos = cachedData.todos;
        console.log('✅ [CARD-CACHE] todos cargados desde caché para card:', cardDB.card_id, '(', card.todos?.length || 0, 'items )');
        return;
      }
    }

    // 2. Cargar desde Supabase
    console.log('🔍 DEBUG TD [loadTodoData] Cargando todos desde BD para card:', cardDB.card_id);

    const { SupabaseCardTodoRepository } = await import('@/infrastructure/datasource/SupabaseCardTodoRepository');
    const cardTodoRepo = new SupabaseCardTodoRepository();

    const cardTodos = await cardTodoRepo.getByCardId(cardDB.id);

    if (cardTodos && cardTodos.length > 0) {
      card.todos = cardTodos.map(todo => ({
        id: todo.todo_id,
        text: todo.text,
        completed: todo.completed
      }));
      console.log('✅ DEBUG TD [loadTodoData] Todos asignados a card.todos:', card.todos.length, 'items');

      // 3. Guardar en caché
      if (useCache) {
        saveCardDataToCache(cardDB.card_id, { todos: card.todos }, storagePrefix);
      }
    } else {
      console.warn('⚠️ DEBUG TD [loadTodoData] NO se encontraron todos en la BD para esta card');
    }
  } catch (error) {
    console.error('❌ DEBUG TD [loadTodoData] Error cargando todos:', error);
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
  onUpdatePastedImages?: (cardId: string, imageUrl: string) => void,
  storagePrefix: string = 'real',
  useCache: boolean = true
): Promise<void> {
  try {
    // 1. Intentar cargar desde caché
    if (useCache) {
      const cachedData = loadCardDataFromCache(cardDB.card_id, storagePrefix);
      if (cachedData && cachedData.imageUrl) {
        card.imageUrl = cachedData.imageUrl;
        if (onUpdatePastedImages) {
          onUpdatePastedImages(card.id, cachedData.imageUrl);
        }
        console.log('✅ [CARD-CACHE] imageUrl cargado desde caché para card:', cardDB.card_id);
        return;
      }
    }

    // 2. Cargar desde Supabase
    const { SupabaseCardImageRepository } = await import('@/infrastructure/datasource/SupabaseCardImageRepository');
    const cardImageRepo = new SupabaseCardImageRepository();

    const cardImage = await cardImageRepo.getByCardId(cardDB.id);
    if (cardImage) {
      card.imageUrl = cardImage.image_url;
      if (onUpdatePastedImages) {
        onUpdatePastedImages(card.id, cardImage.image_url);
      }

      // 3. Guardar en caché
      if (useCache) {
        saveCardDataToCache(cardDB.card_id, { imageUrl: card.imageUrl }, storagePrefix);
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
 * @param storagePrefix - Prefijo para localStorage
 * @param useCache - Si debe usar caché
 *
 * Proceso:
 * 1. Intenta cargar desde caché si useCache=true
 * 2. Si no hay caché, obtiene datos de Supabase
 * 3. Guarda en caché para futuras cargas
 */
async function loadProyectoData(cardDB: CardDB, card: Card, storagePrefix: string = 'real', useCache: boolean = true): Promise<void> {
  try {
    // 1. Intentar cargar desde caché
    if (useCache) {
      const cachedData = loadCardDataFromCache(cardDB.card_id, storagePrefix);
      if (cachedData && cachedData.proyectoData) {
        card.proyectoData = cachedData.proyectoData;
        console.log('✅ [CARD-CACHE] proyectoData cargado desde caché para card:', cardDB.card_id);
        return;
      }
    }

    // 2. Cargar desde Supabase
    console.log('🔍 [CARD-SYNC] Cargando proyectoData desde BD para card:', cardDB.card_id, '(UUID:', cardDB.id, ')');

    const { SupabaseCardProyectoRepository } = await import('@/infrastructure/datasource/SupabaseCardProyectoRepository');
    const { SupabaseProyectoRepository } = await import('@/infrastructure/datasource/SupabaseProyectoRepository');

    const cardProyectoRepo = new SupabaseCardProyectoRepository();
    const proyectoRepo = new SupabaseProyectoRepository();

    // Obtener la relación card-proyecto
    const cardProyecto = await cardProyectoRepo.getByCardId(cardDB.id);
    console.log('🔍 [CARD-SYNC] cardProyecto obtenido:', cardProyecto);

    if (cardProyecto) {
      // Obtener los datos completos del proyecto
      const proyecto = await proyectoRepo.getProyectoById(cardProyecto.id_proyecto);
      console.log('🔍 [CARD-SYNC] proyecto obtenido:', proyecto);

      if (proyecto) {
        const notasIds: string[] = [];

        // Parsear colors de forma segura
        let parsedColors = null;
        if (proyecto.colors && typeof proyecto.colors === 'string' && (proyecto.colors as string).trim()) {
          try {
            parsedColors = JSON.parse(proyecto.colors as string);
          } catch { /* ignorar error de parsing */ }
        }

        // Actualizar proyectoData
        card.proyectoData = {
          id: proyecto.id,
          nombre: proyecto.nombre || card.title,
          descripcion: proyecto.descripcion || null,
          icono: proyecto.icono || null,
          id_organizacion: proyecto.id_organizacion || null,
          colors: parsedColors,
          created_at: proyecto.created_at,
          github_url: proyecto.github_url || null,
          sitio_web_url: proyecto.sitio_web_url || null,
          tecnologias: proyecto.tecnologias || null,
          notas: notasIds
        };
        console.log('✅ [CARD-SYNC] proyectoData cargado exitosamente:', {
          proyectoId: card.proyectoData!.id,
          nombre: card.proyectoData!.nombre
        });

        // 3. Guardar en caché
        if (useCache) {
          saveCardDataToCache(cardDB.card_id, { proyectoData: card.proyectoData! }, storagePrefix);
        }
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
          const notasIds: string[] = [];

          // Parsear colors de forma segura
          let parsedColors = null;
          if (proyecto.colors && typeof proyecto.colors === 'string' && (proyecto.colors as string).trim()) {
            try {
              parsedColors = JSON.parse(proyecto.colors as string);
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
            github_url: proyecto.github_url || null,
            sitio_web_url: proyecto.sitio_web_url || null,
            tecnologias: proyecto.tecnologias || null,
            notas: notasIds
          };
          console.log('✅ [CARD-SYNC] proyectoData cargado desde content:', {
            proyectoId: card.proyectoData!.id,
            nombre: card.proyectoData!.nombre
          });

          // 3. Guardar en caché
          if (useCache) {
            saveCardDataToCache(cardDB.card_id, { proyectoData: card.proyectoData! }, storagePrefix);
          }

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
  const { cardsDB, usuario, onUpdatePastedImages, onCardReady, storagePrefix = 'real', useCache = true } = params;

  console.log('🔄 [CARD-SYNC] Procesando', cardsDB.length, 'cards desde Supabase (carga progresiva)', useCache ? '(con caché)' : '(sin caché)');

  // FASE 1: Mapear todos los cards básicos inmediatamente
  const basicCards: Card[] = cardsDB.map(cardDB => mapCardDBToCard(cardDB));

  // Si hay callback de carga progresiva, notificar todos los cards básicos
  if (onCardReady) {
    basicCards.forEach(card => onCardReady(card));
  }

  // FASE 2: Cargar datos específicos en paralelo (en background)
  const loadPromises = cardsDB.map(async (cardDB, index) => {
    const card = basicCards[index];

    try {
      // Cargar datos específicos según el tipo de card
      switch (cardDB.type) {
        case 'mision':
        case 'mision-organizacion':
          await loadMisionData(cardDB, card, storagePrefix, useCache);
          break;

        case 'actividad':
          await loadActividadData(cardDB, card, usuario, storagePrefix, useCache);
          break;

        case 'usuario':
          await loadUsuarioData(cardDB, card, storagePrefix, useCache);
          break;

        case 'todo':
          await loadTodoData(cardDB, card, storagePrefix, useCache);
          break;

        case 'image':
          await loadImageData(cardDB, card, onUpdatePastedImages, storagePrefix, useCache);
          break;

        case 'proyecto':
        case 'proyecto-organizacion':
          await loadProyectoData(cardDB, card, storagePrefix, useCache);
          break;
      }

      // Notificar card actualizado con datos completos
      if (onCardReady) {
        const clonedCard = cloneCard(card);
        onCardReady(clonedCard);
      }
    } catch (error) {
      console.error(`❌ [CARD-SYNC] Error cargando datos de card ${cardDB.card_id}:`, error);
    }

    return card;
  });

  // Esperar a que todas las cargas terminen
  await Promise.all(loadPromises);

  // Retornar cards con datos completos (clonados para React)
  const finalCards = basicCards.map(card => cloneCard(card));
  console.log('✅ [CARD-SYNC] Total cards cargadas:', finalCards.length);
  return finalCards;
}

/**
 * Clona un card para forzar que React detecte cambios
 */
function cloneCard(card: Card): Card {
  const clonedCard = { ...card };

  if (card.todos) {
    clonedCard.todos = [...card.todos];
  }
  if (card.misionData) {
    clonedCard.misionData = { ...card.misionData };
  }
  if (card.activityData) {
    clonedCard.activityData = { ...card.activityData };
  }
  if (card.usuarioData) {
    clonedCard.usuarioData = { ...card.usuarioData };
    if (card.usuarioData.messages) {
      clonedCard.usuarioData.messages = [...card.usuarioData.messages];
    }
  }
  if (card.proyectoData) {
    clonedCard.proyectoData = { ...card.proyectoData };
    if (card.proyectoData.notas) {
      clonedCard.proyectoData.notas = [...card.proyectoData.notas];
    }
  }

  return clonedCard;
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
