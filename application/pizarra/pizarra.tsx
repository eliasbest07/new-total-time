import React, { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useScreenshots } from '@/hooks/useScreenshots';
import { useAuth } from '@/app/contexts/AuthContext';
import { useSettings } from '@/app/contexts/SettingsContext';
import { Card, PizarraRef, PizarraProps, TodoItem, ActivityData, MisionData, Connection } from './types';
import { usePizarra } from '@/hooks/usePizarra';
import { useCards } from '@/hooks/useCards';
import { useCardMision } from '@/hooks/useCardMision';
import { mapCardDBToCard, mapCardToCardDB } from './utils/cardMapper';
import { SupabaseCardMisionRepository } from '@/infrastructure/datasource/SupabaseCardMisionRepository';
import { SupabaseMisionRepository } from '@/infrastructure/datasource/SupabaseMisionRepository';
import { useMisionActiva } from '@/hooks/useMisionActiva';
import { generateUniqueId, generatePosition } from './utils/idGenerator';
import { useCardDrag } from './hooks/useCardDrag';
import { useCanvasPan } from './hooks/useCanvasPan';
import { useConnections } from './hooks/useConnections';
import { useCardResize } from './hooks/useCardResize';
import { usePasteImage } from './hooks/usePasteImage';
import { useDropHandler } from './hooks/useDropHandler';
import { usePizarraLocalStorage } from './hooks/usePizarraLocalStorage';
import { ConnectionLines } from './components/ui/ConnectionLines';
import { CardWrapperComponent } from './components/CardWrapper';
import Ventana from '@/app/demo/components/Ventana';
import { SupabaseRecursoRepository } from '@/infrastructure/datasource/SupabaseRecursoRepository';

const TestPizarra = forwardRef<PizarraRef, PizarraProps>(({ onShowScreenshots, storagePrefix = 'real', lightMode = false, fullMode = false, viewingUserId, onOpenUserChat, usuarios, currentUserId, onConnectionCreate, isOrganizacionPizarra = false, readOnly = false, pizarraOrganizacion }, ref) => {
  const { usuario } = useAuth();
  const { autoSave } = useSettings();

  // Estado para almacenar el ID numérico del usuario que se está viendo
  const [viewingUserNumericId, setViewingUserNumericId] = useState<number | null>(null);

  // Determinar qué usuario se está viendo (el actual o uno específico)
  const isViewingOtherUser = !!viewingUserId && viewingUserId !== usuario?.userAuth;
  // Para pizarra, siempre usamos UUID (id_usuario), no ID numérico
  const effectiveUserId = isViewingOtherUser ? viewingUserId : (usuario?.userAuth || null);

  // Convertir viewingUserId (user_auth UUID) a id numérico
  useEffect(() => {
    const loadViewingUserId = async () => {
      if (!viewingUserId) {
        setViewingUserNumericId(null);
        return;
      }

      try {
        console.log('🔍 [Pizarra] Buscando ID numérico para id_usuario:', viewingUserId);
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');
        const { data, error } = await supabase
          .from('usuario')
          .select('id, id_usuario, nombre, username')
          .eq('id_usuario', viewingUserId)
          .maybeSingle();

        if (error) {
          console.error('❌ [Pizarra] Error obteniendo ID de usuario:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            viewingUserId: viewingUserId
          });

          // Si no se encuentra el usuario, es un error esperado
          if (error.code === 'PGRST116') {
            console.warn('⚠️ [Pizarra] No se encontró usuario con id_usuario:', viewingUserId);
          }
          return;
        }

        if (data) {
          console.log('✅ [Pizarra] Usuario encontrado:', {
            id: data.id,
            id_usuario: data.id_usuario,
            nombre: data.nombre || data.username
          });
          setViewingUserNumericId(parseInt(data.id));
        } else {
          console.warn('⚠️ [Pizarra] No se encontró usuario con id_usuario:', viewingUserId);
        }
      } catch (error) {
        console.error('❌ Error en loadViewingUserId:', error);
      }
    };

    loadViewingUserId();
  }, [viewingUserId]);

  // Debug: Verificar que el usuario esté cargado
  useEffect(() => {
    console.log('👤 Usuario en Pizarra:', usuario?.id, usuario?.email);
    if (isViewingOtherUser) {
      console.log('👁️ Viendo pizarra de otro usuario:', viewingUserId, '(ID numérico:', viewingUserNumericId, ')');
    }
  }, [usuario, viewingUserId, isViewingOtherUser, viewingUserNumericId]);

  // Hooks de Supabase - Cargar pizarra del usuario automáticamente
  const { pizarra, loading: loadingPizarra, updatePanOffset, refetch: refetchPizarra } = usePizarra(effectiveUserId);
  const { cards: cardsDB, loading: loadingCards, createCard, updateCard, deleteCard: deleteCardDB } = useCards(
    pizarra?.id || null
  );

  // Hook para gestionar misiones activas
  const { getOrCreateMisionActiva, updateRunningState, addCaptureUrl } = useMisionActiva();
  // useSimpleTracking ya no se necesita aquí - ahora funciona automáticamente desde la tabla capture

  // Estado de inicialización
  const [isInitialized, setIsInitialized] = useState(false);

  // Estado para trackear misiones ya verificadas (evitar queries repetidas)
  const verifiedMisionesRef = useRef<Set<string>>(new Set());

  // Estado para trackear conexiones auto-creadas (evitar duplicados)
  const autoConnectionsRef = useRef<Set<string>>(new Set());

  const [cards, setCards] = useState<Card[]>([]);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [editingTodo, setEditingTodo] = useState<{ cardId: string, todoId: number } | null>(null);
  const [configOpenCard, setConfigOpenCard] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [cardZIndices, setCardZIndices] = useState<{ [cardId: string]: number }>({});
  const [maxZIndex, setMaxZIndex] = useState(1);

  const canvasRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

  const {
    screenshots,
    isCapturing,
    startCapturing,
    stopCapturing,
    captureNow,
  } = useScreenshots();

  // Estado para imágenes pegadas (debe estar antes del useEffect que lo usa)
  const [pastedImages, setPastedImages] = useState<{ [key: string]: string }>({});

  // Estado para ventanas de imágenes independientes
  const [imageWindows, setImageWindows] = useState<Array<{
    id: string;
    title: string;
    imageUrl: string;
    width: number;
    height: number;
  }>>([]);

  // Función para abrir una ventana de imagen
  const openImageWindow = useCallback((imageUrl: string, title: string) => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      const maxWidth = window.innerWidth * 0.9;
      const maxHeight = window.innerHeight * 0.9;

      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      // Reducir 25% el tamaño
      width = width * 0.75;
      height = height * 0.75;

      setImageWindows(prev => [...prev, {
        id: `img-${Date.now()}`,
        title,
        imageUrl,
        width,
        height
      }]);
    };
    img.src = imageUrl;
  }, []);

  // Función para cerrar una ventana de imagen
  const closeImageWindow = useCallback((id: string) => {
    setImageWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  // Efecto para bajar z-index de salas cuando hay ventanas de imagen abiertas
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (imageWindows.length > 0) {
      // Agregar clase al body para bajar z-index de salas
      document.body.classList.add('image-window-open');
    } else {
      // Remover clase cuando no hay ventanas de imagen
      document.body.classList.remove('image-window-open');
    }

    return () => {
      document.body.classList.remove('image-window-open');
    };
  }, [imageWindows.length]);

  // Exponer captureNow globalmente para el API endpoint
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).pizarraCaptureNow = captureNow;
      console.log('✅ captureNow expuesto globalmente en window.pizarraCaptureNow');
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).pizarraCaptureNow;
      }
    };
  }, [captureNow]);

  // Sincronizar cardsDB con cards
  useEffect(() => {
    const syncCardsFromDB = async () => {
      // Si estamos viendo la pizarra de OTRO usuario, siempre sincronizar
      // Si es NUESTRA pizarra, sincronizar SOLO si hay datos en Supabase Y localStorage está vacío
      if (!pizarra) {
        return;
      }

      if (!cardsDB || cardsDB.length === 0) {
        console.log('📭 [PIZARRA SYNC] No hay cards en Supabase para cargar');
        return;
      }

      // Para la pizarra propia: Solo cargar desde Supabase si localStorage está vacío
      if (!isViewingOtherUser) {
        if (cards.length > 0) {
          // Ya hay cards en localStorage, no sobreescribir
          console.log('📦 [PIZARRA SYNC] Cards ya cargadas desde localStorage, omitiendo sincronización desde Supabase');
          return;
        }
        console.log('🔄 [PIZARRA SYNC] LocalStorage vacío, cargando desde Supabase:', cardsDB.length, 'cards');
      } else {
        console.log('🔄 [PIZARRA COMPARTIDA] Sincronizando cards desde Supabase:', cardsDB.length);
      }

      // Mapear cardsDB a cards locales
      const { SupabaseCardMisionRepository } = await import('@/infrastructure/datasource/SupabaseCardMisionRepository');
      const { SupabaseMisionRepository } = await import('@/infrastructure/datasource/SupabaseMisionRepository');
      const { SupabaseCardActividadRepository } = await import('@/infrastructure/datasource/SupabaseCardActividadRepository');
      const { SupabaseCardUsuarioRepository } = await import('@/infrastructure/datasource/SupabaseCardUsuarioRepository');
      const { SupabaseCardTodoRepository } = await import('@/infrastructure/datasource/SupabaseCardTodoRepository');
      const { SupabaseCardImageRepository } = await import('@/infrastructure/datasource/SupabaseCardImageRepository');

      const cardMisionRepo = new SupabaseCardMisionRepository();
      const misionRepo = new SupabaseMisionRepository();
      const cardActividadRepo = new SupabaseCardActividadRepository();
      const cardUsuarioRepo = new SupabaseCardUsuarioRepository();
      const cardTodoRepo = new SupabaseCardTodoRepository();
      const cardImageRepo = new SupabaseCardImageRepository();

      const mappedCards: Card[] = [];

      for (const cardDB of cardsDB) {
        const card = mapCardDBToCard(cardDB);

        // Cargar datos específicos según el tipo de card
        if (cardDB.type === 'mision') {
          try {
            const cardMision = await cardMisionRepo.getByCardId(cardDB.id);
            if (cardMision) {
              const mision = await misionRepo.getMisionById(cardMision.id_mision);
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
              }
            }
          } catch (error) {
            console.error('Error cargando datos de misión para card:', cardDB.id, error);
          }
        }

        if (cardDB.type === 'actividad') {
          try {
            const cardActividad = await cardActividadRepo.getByCardId(cardDB.id);
            if (cardActividad && usuario) {
              const currentUserParticipant = {
                name: usuario.getNombreCompleto(),
                initial: usuario.getNombreCompleto().charAt(0).toUpperCase(),
                color: usuario.profile.marco || '#3b82f6'
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

        if (cardDB.type === 'usuario') {
          try {
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

        if (cardDB.type === 'todo') {
          try {
            const cardTodos = await cardTodoRepo.getByCardId(cardDB.id);
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

        if (cardDB.type === 'image') {
          try {
            const cardImage = await cardImageRepo.getByCardId(cardDB.id);
            if (cardImage) {
              card.imageUrl = cardImage.image_url;
              setPastedImages(prev => ({
                ...prev,
                [card.id]: cardImage.image_url
              }));
            }
          } catch (error) {
            console.error('Error cargando imagen:', error);
          }
        }

        if (cardDB.type === 'proyecto' || cardDB.type === 'proyecto-organizacion') {
          try {
            const { SupabaseCardProyectoNotaRepository } = await import('@/infrastructure/datasource/SupabaseCardProyectoNotaRepository');
            const cardProyectoNotaRepo = new SupabaseCardProyectoNotaRepository();

            const proyectoNotas = await cardProyectoNotaRepo.getByCardProyectoId(cardDB.id);
            if (proyectoNotas && proyectoNotas.length > 0) {
              // Guardar solo los IDs de las notas
              if (card.proyectoData) {
                card.proyectoData.notas = proyectoNotas.map(nota => nota.id_card_nota);
              }
            }
          } catch (error) {
            console.error('Error cargando notas del proyecto:', error);
          }
        }

        mappedCards.push(card);
      }

      const logPrefix = isViewingOtherUser ? '[PIZARRA COMPARTIDA]' : '[PIZARRA SYNC]';
      console.log(`✅ ${logPrefix} Cards sincronizadas desde Supabase:`, mappedCards.length);
      setCards(mappedCards);
    };

    syncCardsFromDB();
  }, [cardsDB, pizarra, usuario, setPastedImages, isViewingOtherUser, cards.length]);

  // Callback personalizado para detectar conexión nota-proyecto
  const handleInternalConnectionCreate = useCallback(async (connection: Connection, fromCard: Card, toCard: Card) => {
    console.log('🔗 Nueva conexión creada:', {
      from: fromCard.type,
      to: toCard.type,
      fromCard,
      toCard
    });

    // Detectar si se conectó una nota (type="text") con un proyecto
    const isNoteToProject =
      (fromCard.type === 'text' && (toCard.type === 'proyecto' || toCard.type === 'proyecto-organizacion')) ||
      ((fromCard.type === 'proyecto' || fromCard.type === 'proyecto-organizacion') && toCard.type === 'text');

    if (isNoteToProject) {
      const notaCard = fromCard.type === 'text' ? fromCard : toCard;
      const proyectoCard = (fromCard.type === 'proyecto' || fromCard.type === 'proyecto-organizacion') ? fromCard : toCard;

      console.log('📝 ✅ Detectada conexión Nota ↔️ Proyecto:', {
        nota: notaCard.title,
        notaId: notaCard.id,
        proyecto: proyectoCard.proyectoData?.nombre,
        proyectoCardId: proyectoCard.id
      });

      // ✅ Agregar el ID del card de nota a la lista de notas del proyecto
      try {
        console.log('📝 Agregando nota a la lista del proyecto...');

        // Actualizar el card de proyecto agregando la nota a su lista (evitar duplicados)
        setCards(prevCards => prevCards.map(card => {
          if (card.id === proyectoCard.id) {
            const notasActuales = card.proyectoData?.notas || [];

            // Evitar duplicados
            if (notasActuales.includes(notaCard.id)) {
              console.log('⚠️ La nota ya está en la lista del proyecto');
              return card;
            }

            return {
              ...card,
              proyectoData: {
                ...card.proyectoData!,
                notas: [...notasActuales, notaCard.id]
              }
            };
          }
          return card;
        }));

        console.log('✅ Nota agregada a la lista del proyecto:', notaCard.id);
      } catch (error) {
        console.error('❌ Error agregando nota al proyecto:', error);
      }
    }

    // Llamar al callback externo si existe
    if (onConnectionCreate) {
      onConnectionCreate(connection, fromCard, toCard);
    }
  }, [usuario, onConnectionCreate]);

  const {
    connections,
    setConnections,
    isConnecting,
    connectingFrom,
    mousePosition,
    handleConnectionPointClick: baseHandleConnectionPointClick,
    handleCardClick,
    updateMousePosition,
    deleteConnection: baseDeleteConnection
  } = useConnections({ cards, onConnectionCreate: handleInternalConnectionCreate });

  // Wrapper para deleteConnection que también limpia el tracking y actualiza notas del proyecto
  const deleteConnection = useCallback((connectionId: string) => {
    // Buscar la conexión que se va a eliminar
    const connection = connections.find(c => c.id === connectionId);

    if (connection) {
      // Buscar los cards involucrados
      const fromCard = cards.find(c => c.id === connection.from);
      const toCard = cards.find(c => c.id === connection.to);

      if (fromCard && toCard) {
        // Detectar si es una conexión nota-proyecto
        const isNoteToProject =
          (fromCard.type === 'text' && (toCard.type === 'proyecto' || toCard.type === 'proyecto-organizacion')) ||
          ((fromCard.type === 'proyecto' || fromCard.type === 'proyecto-organizacion') && toCard.type === 'text');

        if (isNoteToProject) {
          const notaCard = fromCard.type === 'text' ? fromCard : toCard;
          const proyectoCard = (fromCard.type === 'proyecto' || fromCard.type === 'proyecto-organizacion') ? fromCard : toCard;

          console.log('🗑️ Eliminando nota de la lista del proyecto:', {
            notaId: notaCard.id,
            proyectoId: proyectoCard.id
          });

          // Remover el ID de la nota de la lista del proyecto
          setCards(prevCards => prevCards.map(card => {
            if (card.id === proyectoCard.id && card.proyectoData?.notas) {
              return {
                ...card,
                proyectoData: {
                  ...card.proyectoData,
                  notas: card.proyectoData.notas.filter(notaId => notaId !== notaCard.id)
                }
              };
            }
            return card;
          }));

          console.log('✅ Nota removida de la lista del proyecto');
        }
      }
    }

    // Limpiar del tracking si es auto-creada
    if (connectionId.startsWith('auto-')) {
      autoConnectionsRef.current.delete(connectionId);
      console.log('🗑️ Conexión auto-creada eliminada del tracking:', connectionId);
    }

    // Llamar a la función original
    baseDeleteConnection(connectionId);
  }, [baseDeleteConnection, connections, cards]);

  // Cargar conexiones desde Supabase SOLO cuando se visualiza la pizarra de otro usuario
  useEffect(() => {
    const loadConnectionsFromDB = async () => {
      // IMPORTANTE: Solo cargar conexiones cuando estamos viendo la pizarra de OTRO usuario
      if (!isViewingOtherUser) {
        return; // Para la pizarra propia, usar LocalStorage normalmente
      }

      if (!pizarra) {
        return;
      }

      try {
        console.log('🔗 [PIZARRA COMPARTIDA] Cargando conexiones desde Supabase...');
        const { SupabaseCardConnectionRepository } = await import('@/infrastructure/datasource/SupabaseCardConnectionRepository');
        const cardConnectionRepo = new SupabaseCardConnectionRepository();

        const connectionesEnBD = await cardConnectionRepo.getByPizarraId(pizarra.id);

        const mappedConnections = connectionesEnBD.map(connDB => ({
          id: connDB.connection_id,
          from: connDB.from_card_id || undefined,
          to: connDB.to_card_id
        }));

        setConnections(mappedConnections);
        console.log('✅ [PIZARRA COMPARTIDA] Conexiones cargadas:', mappedConnections.length);
      } catch (error) {
        console.error('❌ Error cargando conexiones:', error);
      }
    };

    loadConnectionsFromDB();
  }, [pizarra, setConnections, isViewingOtherUser]);

  const {
    isPanning,
    panOffset,
    setPanOffset,
    handleCanvasMouseDown: baseHandleCanvasMouseDown,
    handleGlobalMouseMove: panGlobalMouseMove,
    handleMouseUp: panHandleMouseUp,
    setCanvasRef
  } = useCanvasPan();

  // Sincronizar panOffset SOLO cuando se carga la pizarra de otro usuario
  useEffect(() => {
    // IMPORTANTE: Solo sincronizar cuando estamos viendo la pizarra de OTRO usuario
    if (!isViewingOtherUser) {
      return; // Para la pizarra propia, usar LocalStorage normalmente
    }

    if (pizarra) {
      const newPanOffset = {
        x: Number(pizarra.pan_offset_x) || 0,
        y: Number(pizarra.pan_offset_y) || 0
      };

      // Solo actualizar si es diferente para evitar loops
      if (panOffset.x !== newPanOffset.x || panOffset.y !== newPanOffset.y) {
        console.log('🗺️ [PIZARRA COMPARTIDA] Sincronizando panOffset:', newPanOffset);
        setPanOffset(newPanOffset);
      }
    }
  }, [pizarra, isViewingOtherUser]); // No incluir panOffset ni setPanOffset para evitar loops

  // Connect canvas ref to edge panning hook
  useEffect(() => {
    if (canvasRef.current) {
      setCanvasRef(canvasRef.current);
    }
  }, [setCanvasRef]);

  // Hook para pegar imágenes - ahora usa panOffset y canvasRef para centrar
  usePasteImage(cards, setCards, panOffset, canvasRef, setPastedImages);

  // Función para auto-conectar una misión a su proyecto (llamada desde drop)
  const autoConnectMisionToProyecto = useCallback(async (misionCardId: string, misionId: number) => {
    try {
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');

      console.log('🔍 [AUTO-CONEXIÓN] Verificando misión:', { misionCardId, misionId });

      // Obtener id_proyecto de la misión desde Supabase
      const { data: misionData } = await supabase
        .from('misiones')
        .select('id_proyecto')
        .eq('id', misionId)
        .single();

      if (misionData?.id_proyecto) {
        // Buscar el proyecto correspondiente en las cards
        const proyectoCard = cards.find(card =>
          (card.type === 'proyecto-organizacion' || card.type === 'proyecto') &&
          (card.proyectoData as any)?.id === misionData.id_proyecto
        );

        if (proyectoCard) {
          // Crear ID único para esta conexión
          const connectionId = `auto-${misionCardId}-${proyectoCard.id}`;

          // Verificar si ya existe una conexión
          const connectionExists = connections.some(conn =>
            conn.from === misionCardId && conn.to === proyectoCard.id
          );

          if (!connectionExists) {
            console.log('🔗 [AUTO-CONEXIÓN] Creando conexión:', {
              mision: cards.find(c => c.id === misionCardId)?.title,
              proyecto: proyectoCard.title,
              id_proyecto: misionData.id_proyecto
            });

            // Marcar como creada
            autoConnectionsRef.current.add(connectionId);

            // Crear la conexión
            setConnections(prev => [...prev, {
              id: connectionId,
              from: misionCardId,
              to: proyectoCard.id
            }]);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error en auto-conexión:', error);
    }
  }, [cards, connections, setConnections]);

  // Función para conectar un proyecto con todas las misiones existentes que le pertenecen
  const autoConnectProyectoToMisiones = useCallback(async (proyectoCardId: string, proyectoId: number) => {
    try {
      console.log('🔍 [AUTO-CONEXIÓN] Verificando misiones del proyecto:', { proyectoCardId, proyectoId });

      // Buscar todas las cards de misión que ya están en la pizarra
      const misionCards = cards.filter(card =>
        (card.type === 'mision-organizacion' || card.type === 'mision') &&
        card.misionData?.id_mision
      );

      if (misionCards.length === 0) return;

      const { supabase } = await import('@/infrastructure/services/SupabaseClient');
      const newConnections: Array<{ id: string; from: string; to: string }> = [];

      // Verificar cada misión
      for (const misionCard of misionCards) {
        try {
          // Obtener id_proyecto de la misión
          const { data: misionData } = await supabase
            .from('misiones')
            .select('id_proyecto')
            .eq('id', misionCard.misionData!.id_mision)
            .single();

          if (misionData?.id_proyecto === proyectoId) {
            // Esta misión pertenece a este proyecto
            const connectionId = `auto-${misionCard.id}-${proyectoCardId}`;

            // Verificar si ya existe
            const connectionExists = connections.some(conn =>
              conn.from === misionCard.id && conn.to === proyectoCardId
            );

            if (!connectionExists && !autoConnectionsRef.current.has(connectionId)) {
              console.log('🔗 [AUTO-CONEXIÓN] Conectando misión existente al proyecto:', {
                mision: misionCard.title,
                proyecto: cards.find(c => c.id === proyectoCardId)?.title
              });

              autoConnectionsRef.current.add(connectionId);
              newConnections.push({
                id: connectionId,
                from: misionCard.id,
                to: proyectoCardId
              });
            }
          }
        } catch (error) {
          console.error('❌ Error verificando misión:', error);
        }
      }

      // Agregar las nuevas conexiones
      if (newConnections.length > 0) {
        setConnections(prev => [...prev, ...newConnections]);
      }
    } catch (error) {
      console.error('❌ Error en auto-conexión de proyecto:', error);
    }
  }, [cards, connections, setConnections]);

  const bringCardToFront = useCallback((cardId: string) => {
    const newZIndex = maxZIndex + 1;
    setCardZIndices(prev => ({ ...prev, [cardId]: newZIndex }));
    setMaxZIndex(newZIndex);
  }, [maxZIndex]);

  const navigateToCard = useCallback((cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const canvasCenterX = canvasRect.width / 2;
    const canvasCenterY = canvasRect.height / 2;

    const cardCenterX = card.x + card.width / 2;
    const cardCenterY = card.y + card.height / 2;

    const newPanX = canvasCenterX - cardCenterX;
    const newPanY = canvasCenterY - cardCenterY;

    setPanOffset({ x: newPanX, y: newPanY });

    // Also bring the card to front
    bringCardToFront(cardId);
  }, [cards, bringCardToFront, setPanOffset]);

  // Función para buscar un card por id_mision
  const findCardByMisionId = useCallback((misionId: number): string | null => {
    const card = cards.find(c =>
      (c.type === 'mision-organizacion' || c.type === 'mision') &&
      c.misionData?.id_mision === misionId
    );
    return card ? card.id : null;
  }, [cards]);

  // Estado para controlar la animación de navegación
  const animationFrameRef = useRef<number | null>(null);

  // Función para navegar al origen (0,0) con animación suave
  const navigateToOrigin = useCallback(() => {
    if (!canvasRef.current) return;

    // Cancelar cualquier animación en curso
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const canvasCenterX = canvasRect.width / 2;
    const canvasCenterY = canvasRect.height / 2;

    // Posición objetivo: centrar el punto (0,0) en el canvas
    const targetPanX = canvasCenterX;
    const targetPanY = canvasCenterY;

    const startPanX = panOffset.x;
    const startPanY = panOffset.y;

    const duration = 500; // Duración de la animación en ms
    const startTime = performance.now();

    // Función de easing (ease-in-out)
    const easeInOutCubic = (t: number): number => {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      const currentPanX = startPanX + (targetPanX - startPanX) * easedProgress;
      const currentPanY = startPanY + (targetPanY - startPanY) * easedProgress;

      setPanOffset({ x: currentPanX, y: currentPanY });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [panOffset, setPanOffset]);

  // Limpiar animación al desmontar
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const {
    draggedCard,
    handleCardMouseDown,
    handleGlobalMouseMove: dragGlobalMouseMove,
    handleMouseUp: dragHandleMouseUp
  } = useCardDrag(cards, setCards, panOffset, isConnecting, canvasRef);

  const {
    resizingCard,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd
  } = useCardResize(cards, setCards);

  const {
    isDragOver,
    isReceivingDrag,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop
  } = useDropHandler(
    setCards,
    panOffset,
    canvasRef,
    cards,
    storagePrefix === 'organizacion',
    autoConnectMisionToProyecto,
    autoConnectProyectoToMisiones,
    navigateToCard,
    findCardByMisionId
  );

  // LocalStorage para persistencia - SOLO para pizarra propia, NO para pizarras compartidas
  const localStorageHookResult = usePizarraLocalStorage(
    isViewingOtherUser ? [] : cards, // No guardar cards de otros usuarios
    isViewingOtherUser ? [] : connections, // No guardar conexiones de otros usuarios
    isViewingOtherUser ? { x: 0, y: 0 } : panOffset, // No guardar panOffset de otros usuarios
    isViewingOtherUser ? () => {} : setCards, // No setear cards si es otro usuario
    isViewingOtherUser ? () => {} : setConnections, // No setear conexiones si es otro usuario
    isViewingOtherUser ? () => {} : setPanOffset, // No setear panOffset si es otro usuario
    storagePrefix,
    isOrganizacionPizarra // Pasar la prop para pizarras de organización
  );

  // Solo usar funciones de LocalStorage si NO es otro usuario
  const {
    clearLocalStorage,
    exportToJSON,
    importFromJSON,
    saveHistorySnapshot,
    shouldLoadFromSupabase,
    markSupabaseLoaded
  } = localStorageHookResult;

  // Funciones para actividades
  const handleActivityPlayPause = useCallback(async (cardId: string, currentIsRunning: boolean) => {
    console.log('🎬 [ACTIVITY PLAY/PAUSE] Botón presionado en tarjeta:', cardId);
    console.log('👤 [ACTIVITY PLAY/PAUSE] Usuario logeado:', usuario);
    const newRunningState = !currentIsRunning;

    // Si va a iniciar (play)
    if (newRunningState && !isCapturing) {
      try {
        const card = cards.find(c => c.id === cardId);
        if (!card || !card.activityData) {
          console.error('❌ No se encontró la card o no tiene activityData');
          return;
        }

        const activityData = card.activityData;
        const actividadId = activityData.id_actividad || cardId.split('-')[1] || '1';
        // IMPORTANTE: Usar userAuth (UUID de Supabase Auth) para que coincida con las búsquedas
        const userId = usuario?.userAuth || 'usuario-desconocido';
        const misionActividad = activityData.subject || card.title || 'Actividad sin nombre';

        console.log('📤 [ACTIVITY PLAY/PAUSE] Iniciando captura con userId (userAuth):', userId);
        console.log('📤 [ACTIVITY PLAY/PAUSE] actividadId:', actividadId);
        console.log('🎥 [ACTIVITY PLAY/PAUSE] Solicitando permiso de pantalla PRIMERO...');

        // 1. PRIMERO: Solicitar permiso de pantalla (debe estar en el user gesture)
        let mediaStream: MediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              cursor: "always" as any
            },
            audio: false
          } as DisplayMediaStreamOptions);
          console.log('✅ [ACTIVITY PLAY/PAUSE] Permiso de pantalla concedido');
        } catch (permissionError) {
          console.error('❌ Usuario canceló el permiso de pantalla:', permissionError);
          return; // Salir si el usuario cancela
        }

        // 2. SEGUNDO: Ahora que tenemos el permiso, hacer las operaciones de BD
        console.log('💾 [MISION ACTIVA] Creando/obteniendo actividad activa en Supabase...');
        const misionActiva = await getOrCreateMisionActiva({
          tipo: 'actividad',
          id_referencia: parseInt(actividadId),
          id_usuario_asignado: userId,
          id_creador: userId
        });

        if (!misionActiva) {
          console.error('❌ No se pudo crear/obtener la actividad activa');
          // Detener el stream si falla la BD
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        console.log('✅ [MISION ACTIVA] Actividad activa obtenida:', misionActiva.id);

        // 3. TERCERO: Iniciar captura con el stream ya obtenido
        await startCapturing({
          userId: userId,
          userEmail: usuario?.email || '',
          actividadId: actividadId,
          misionActividad: misionActividad,
          totalTrabajadoHoy: activityData.duration?.toString(),
          tiempoTareaActual: activityData.timeLeft?.toString(),
          mediaStream: mediaStream, // Pasar el stream ya obtenido
          onCaptureUpdate: async (url: string) => {
            // Guardar captura en misiones_activas
            console.log('📸 [MISION ACTIVA] Guardando captura en Supabase:', url);
            await addCaptureUrl(misionActiva.id, url);
            console.log('✅ [MISION ACTIVA] Captura guardada en misiones_activas');
          }
        });

        console.log('✅ [ACTIVITY PLAY/PAUSE] Captura iniciada exitosamente');

        // 4. Actualizar estado en Supabase a "en_progreso" e is_running = true
        console.log('💾 [MISION ACTIVA] Actualizando estado a en_progreso en Supabase...');
        await updateRunningState(misionActiva.id, {
          is_running: true,
          estado: 'en_progreso',
          fecha_inicio: new Date().toISOString()
        });
        console.log('✅ [MISION ACTIVA] Estado en_progreso guardado en Supabase');

        // 5. Actualizar estado local (guardamos el ID de la misión activa para usarlo al pausar)
        setCards(prev => prev.map(c =>
          c.id === cardId && c.activityData
            ? { ...c, activityData: { ...c.activityData, isRunning: true, misionActivaId: misionActiva.id } }
            : c
        ));
      } catch (error) {
        console.error('❌ Error:', error);
      }
    } else if (!newRunningState && isCapturing) {
      // Si va a pausar
      console.log('⏸️ [ACTIVITY PLAY/PAUSE] Pausando actividad...');

      // Obtener el ID de la misión activa del card
      const card = cards.find(c => c.id === cardId);
      const misionActivaId = card?.activityData?.misionActivaId;

      if (misionActivaId) {
        // 1. Actualizar estado en Supabase
        console.log('💾 [MISION ACTIVA] Actualizando estado a pausada en Supabase...');
        await updateRunningState(misionActivaId, {
          is_running: false,
          estado: 'pausada',
          fecha_pausa: new Date().toISOString()
        });

        console.log('✅ [MISION ACTIVA] Estado pausada guardado en Supabase');
      }

      // 2. Actualizar estado local
      setCards(prev => prev.map(c =>
        c.id === cardId && c.activityData
          ? { ...c, activityData: { ...c.activityData, isRunning: false } }
          : c
      ));

      // 3. Detener captura
      stopCapturing();

      console.log('✅ [ACTIVITY PLAY/PAUSE] Actividad pausada exitosamente');
    }
  }, [cards, isCapturing, startCapturing, stopCapturing, usuario, getOrCreateMisionActiva, updateRunningState, addCaptureUrl]);

  // Funciones para misiones
  const handleMisionPlayPause = useCallback(async (cardId: string, currentIsRunning: boolean) => {
    console.log('🎯 [MISION PLAY/PAUSE] Botón presionado en tarjeta:', cardId);
    console.log('👤 [MISION PLAY/PAUSE] Usuario logeado:', usuario);
    console.log('📊 [MISION PLAY/PAUSE] Estado actual isCapturing:', isCapturing);
    console.log('📊 [MISION PLAY/PAUSE] Estado actual currentIsRunning:', currentIsRunning);

    const newRunningState = !currentIsRunning;

    // Si va a iniciar (play)
    if (newRunningState) {
      console.log('▶️ [MISION PLAY/PAUSE] Iniciando misión...');

      try {
        const card = cards.find(c => c.id === cardId);
        if (!card || !card.misionData) {
          console.error('❌ No se encontró la card o no tiene misionData');
          return;
        }

        const misionData = card.misionData;
        const misionId = misionData.id_mision || cardId.split('-')[1] || '1';
        // Usar el usuario logeado primero, luego el de la misión, y finalmente un fallback
        const userId = usuario?.id || misionData.id_usuario || 'usuario-desconocido';
        const misionActividad = misionData.title || misionData.description || card.title || 'Misión sin nombre';

        console.log('📤 [MISION PLAY/PAUSE] Iniciando captura con userId:', userId);
        console.log('📤 [MISION PLAY/PAUSE] misionId:', misionId);
        console.log('🎥 [MISION PLAY/PAUSE] Solicitando permiso de pantalla PRIMERO...');

        // 1. PRIMERO: Solicitar permiso de pantalla (debe estar en el user gesture)
        let mediaStream: MediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              cursor: "always" as any
            },
            audio: false
          } as DisplayMediaStreamOptions);
          console.log('✅ [MISION PLAY/PAUSE] Permiso de pantalla concedido');
        } catch (permissionError) {
          console.error('❌ Usuario canceló el permiso de pantalla:', permissionError);
          return; // Salir si el usuario cancela
        }

        // 2. SEGUNDO: Ahora que tenemos el permiso, hacer las operaciones de BD
        console.log('💾 [MISION ACTIVA] Creando/obteniendo misión activa en Supabase...');
        const misionActiva = await getOrCreateMisionActiva({
          tipo: 'mision',
          id_referencia: typeof misionId === 'string' ? parseInt(misionId) : misionId,
          id_usuario_asignado: userId,
          id_creador: userId
        });

        if (!misionActiva) {
          console.error('❌ No se pudo crear/obtener la misión activa');
          // Detener el stream si falla la BD
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        console.log('✅ [MISION ACTIVA] Misión activa obtenida:', misionActiva.id);

        // 3. TERCERO: Iniciar captura con el stream ya obtenido
        await startCapturing({
          userId: userId,
          userEmail: usuario?.email || '',
          actividadId: String(misionId),
          misionActividad: misionActividad,
          totalTrabajadoHoy: misionData.hours?.toString(),
          mediaStream: mediaStream, // Pasar el stream ya obtenido
          onCaptureUpdate: async (url: string) => {
            // Actualizar la última captura en la card
            setCards(prev => prev.map(c =>
              c.id === cardId && c.misionData
                ? { ...c, misionData: { ...c.misionData, lastCaptureUrl: url } }
                : c
            ));

            // Guardar captura en misiones_activas
            console.log('📸 [MISION ACTIVA] Guardando captura en Supabase:', url);
            await addCaptureUrl(misionActiva.id, url);
            console.log('✅ [MISION ACTIVA] Captura guardada en misiones_activas');
          }
        });

        console.log('✅ [MISION PLAY/PAUSE] Captura iniciada exitosamente, activando contador...');

        // 4. Actualizar estado en Supabase a "en_progreso" e is_running = true
        console.log('💾 [MISION ACTIVA] Actualizando estado a en_progreso en Supabase...');
        await updateRunningState(misionActiva.id, {
          is_running: true,
          estado: 'en_progreso',
          fecha_inicio: new Date().toISOString()
        });
        console.log('✅ [MISION ACTIVA] Estado en_progreso guardado en Supabase');

        // Nota: El tracking ahora se calcula automáticamente desde la tabla capture

        // 5. Actualizar estado local (guardamos el ID de la misión activa para usarlo al pausar)
        setCards(prev => {
          console.log('🔄 [MISION PLAY/PAUSE] Actualizando cards, buscando card:', cardId);
          const updatedCards = prev.map(c => {
            if (c.id === cardId && c.misionData) {
              console.log('✅ [MISION PLAY/PAUSE] Card encontrada, actualizando isRunning a true');
              return { ...c, misionData: { ...c.misionData, isRunning: true, misionActivaId: misionActiva.id } };
            }
            return c;
          });
          return updatedCards;
        });

        console.log('✅ [MISION PLAY/PAUSE] Contador activado, card debería estar en naranja');
      } catch (error) {
        console.error('❌ Error iniciando captura de misión:', error);
        console.log('⚠️ No se activó el contador porque el usuario canceló o hubo un error');
        // No actualizar isRunning si hubo error
      }
    } else if (!newRunningState) {
      // Si va a pausar, actualizar el estado y detener captura completamente
      console.log('⏸️ [MISION PLAY/PAUSE] Pausando misión...');

      // Obtener el ID de la misión activa del card
      const card = cards.find(c => c.id === cardId);
      const misionActivaId = card?.misionData?.misionActivaId;

      if (misionActivaId) {
        // 1. Actualizar estado en Supabase
        console.log('💾 [MISION ACTIVA] Actualizando estado a pausada en Supabase...');
        await updateRunningState(misionActivaId, {
          is_running: false,
          estado: 'pausada',
          fecha_pausa: new Date().toISOString()
        });

        console.log('✅ [MISION ACTIVA] Estado pausada guardado en Supabase');

        // Nota: El tracking ahora se calcula automáticamente desde la tabla capture
      }

      // 2. Actualizar estado local
      setCards(prev => prev.map(c =>
        c.id === cardId && c.misionData
          ? { ...c, misionData: { ...c.misionData, isRunning: false } }
          : c
      ));

      // 3. Detener captura y cerrar stream de pantalla
      console.log('⏹️ [MISION PLAY/PAUSE] Deteniendo captura de pantalla...');
      stopCapturing();

      console.log('✅ [MISION PLAY/PAUSE] Misión pausada exitosamente (captura detenida)');
    }
  }, [cards, isCapturing, startCapturing, stopCapturing, usuario, getOrCreateMisionActiva, updateRunningState, addCaptureUrl]);

  // Funciones para todos
  const toggleTodo = useCallback(async (cardId: string, todoId: number) => {
    // Actualizar estado local inmediatamente
    setCards(prev => prev.map(card =>
      card.id === cardId && card.todos
        ? {
          ...card, todos: card.todos.map(todo =>
            todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
          )
        }
        : card
    ));

    // Solo guardar en Supabase si la card ya está guardada (tiene formato UUID)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cardId);

    if (isUUID) {
      try {
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');
        const card = cards.find(c => c.id === cardId);
        const todo = card?.todos?.find(t => t.id === todoId);

        if (todo) {
          await supabase
            .from('card_todos')
            .update({
              completed: !todo.completed,
              updated_at: new Date().toISOString()
            })
            .eq('id_card', cardId)
            .eq('todo_id', todoId);
        }
      } catch (error) {
        console.error('❌ Error al actualizar todo en Supabase:', error);
      }
    }
  }, [cards]);

  const addTodoToCard = useCallback(async (cardId: string, text: string) => {
    const card = cards.find(c => c.id === cardId);
    const newTodoId = card?.todos && card.todos.length > 0 ? Math.max(...card.todos.map(t => t.id)) + 1 : 1;

    // Actualizar estado local inmediatamente
    setCards(prev => prev.map(card =>
      card.id === cardId && card.todos
        ? {
          ...card,
          todos: [...card.todos, {
            id: newTodoId,
            text,
            completed: false
          }]
        }
        : card
    ));

    // Solo guardar en Supabase si la card ya está guardada (tiene formato UUID)
    // Cards con IDs como "todo-1" aún no están en Supabase
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cardId);

    if (isUUID) {
      try {
        const { SupabaseCardTodoRepository } = await import('@/infrastructure/datasource/SupabaseCardTodoRepository');
        const cardTodoRepo = new SupabaseCardTodoRepository();

        await cardTodoRepo.create({
          id_card: cardId,
          todo_id: newTodoId,
          text,
          completed: false,
          position: newTodoId - 1
        });
      } catch (error) {
        console.error('❌ Error al crear todo en Supabase:', error);
      }
    } else {
      console.log('ℹ️ Card aún no guardada en Supabase, todo se guardará con la card');
    }
  }, [cards]);

  const deleteTodoFromCard = useCallback(async (cardId: string, todoId: number) => {
    // Actualizar estado local inmediatamente
    setCards(prev => prev.map(card =>
      card.id === cardId && card.todos
        ? { ...card, todos: card.todos.filter(todo => todo.id !== todoId) }
        : card
    ));

    // Solo eliminar de Supabase si la card ya está guardada (tiene formato UUID)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cardId);

    if (isUUID) {
      try {
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');
        await supabase
          .from('card_todos')
          .delete()
          .eq('id_card', cardId)
          .eq('todo_id', todoId);
      } catch (error) {
        console.error('❌ Error al eliminar todo de Supabase:', error);
      }
    }
  }, []);

  const updateTodoInCard = useCallback(async (cardId: string, todoId: number, newText: string) => {
    // Actualizar estado local inmediatamente
    setCards(prev => prev.map(card =>
      card.id === cardId && card.todos
        ? {
          ...card,
          todos: card.todos.map(todo =>
            todo.id === todoId ? { ...todo, text: newText } : todo
          )
        }
        : card
    ));
    setEditingTodo(null);

    // Solo actualizar en Supabase si la card ya está guardada (tiene formato UUID)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cardId);

    if (isUUID) {
      try {
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');
        await supabase
          .from('card_todos')
          .update({
            text: newText,
            updated_at: new Date().toISOString()
          })
          .eq('id_card', cardId)
          .eq('todo_id', todoId);
      } catch (error) {
        console.error('❌ Error al actualizar texto del todo en Supabase:', error);
      }
    }
  }, []);

  // Funciones para configuración de cards
  const changeFontSize = useCallback((cardId: string, increment: number) => {
    setCards(prev => prev.map(card => {
      if (card.id === cardId) {
        const currentSize = card.fontSize || 18;
        const newSize = Math.max(12, Math.min(32, currentSize + increment));

        let baseWidth, baseHeight;
        if (card.type === 'todo') {
          baseWidth = 250;
          baseHeight = 200;
        } else if (card.type === 'mision') {
          baseWidth = 280;
          baseHeight = 400;
        } else if (card.type === 'actividad') {
          baseWidth = 300;
          baseHeight = 250;
        } else if (card.type === 'proyecto') {
          baseWidth = 350;
          baseHeight = 420;
        } else if (card.type === 'usuario') {
          baseWidth = 280;
          baseHeight = 400;
        } else {
          baseWidth = 200;
          baseHeight = 120;
        }

        const sizeMultiplier = newSize / 18;
        const newWidth = Math.max(baseWidth, baseWidth * sizeMultiplier);
        const newHeight = Math.max(baseHeight, baseHeight * sizeMultiplier);

        return {
          ...card,
          fontSize: newSize,
          width: newWidth,
          height: newHeight
        };
      }
      return card;
    }));
  }, []);

  const updateCardTitle = useCallback(async (cardId: string, newTitle: string) => {
    // Actualizar solo localmente (no guardar en Supabase automáticamente)
    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, title: newTitle } : card
    ));

    setEditingTitle(null);
  }, []);

  const updateCardContent = useCallback(async (cardId: string, newContent: string) => {
    // Actualizar solo localmente (no guardar en Supabase automáticamente)
    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, content: newContent } : card
    ));
  }, []);

  const deleteCard = useCallback(async (cardId: string) => {
    if (pastedImages[cardId]) {
      URL.revokeObjectURL(pastedImages[cardId]);
      setPastedImages(prev => {
        const newImages = { ...prev };
        delete newImages[cardId];
        return newImages;
      });
    }

    // Limpiar del tracking de misiones verificadas y conexiones auto-creadas
    const cardToDelete = cards.find(c => c.id === cardId);
    if (cardToDelete?.misionData?.id_mision) {
      const misionKey = `${cardId}-${cardToDelete.misionData.id_mision}`;
      verifiedMisionesRef.current.delete(misionKey);
    }

    // Limpiar conexiones auto-creadas del tracking
    const connectionsToDelete = connections.filter(conn =>
      conn.from === cardId || conn.to === cardId
    );
    connectionsToDelete.forEach(conn => {
      if (conn.id.startsWith('auto-')) {
        autoConnectionsRef.current.delete(conn.id);
      }
    });

    // Eliminar conexiones asociadas a esta card
    setConnections(prev => prev.filter(conn =>
      conn.from !== cardId && conn.to !== cardId
    ));

    console.log('🗑️ Card eliminada junto con sus conexiones:', cardId);

    // Eliminar solo localmente (no eliminar de Supabase automáticamente)
    setCards(prev => prev.filter(card => card.id !== cardId));
    setConfirmDelete(null);
    setConfigOpenCard(null);
  }, [pastedImages, setPastedImages, cards, setConnections]);

  // Función para abrir ventana de chat desde UsuarioCard
  const handleOpenUserChat = useCallback((userData: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  }) => {
    console.log('👤 Abriendo chat con usuario desde pizarra:', userData);
    if (onOpenUserChat) {
      onOpenUserChat(userData);
    }
  }, [onOpenUserChat]);

  // Helper: Calcular el siguiente z-index para que el nuevo card aparezca encima de todos
  const getNextZIndex = useCallback(() => {
    // Combinar el maxZIndex del estado con los zIndex de los cards
    const cardsMaxZIndex = cards.length === 0 ? 0 : Math.max(...cards.map(card => card.zIndex || 0));
    const stateMaxZIndex = maxZIndex;
    const currentMax = Math.max(cardsMaxZIndex, stateMaxZIndex);
    const nextZIndex = currentMax + 1;

    // Actualizar el maxZIndex del estado
    setMaxZIndex(nextZIndex);

    return nextZIndex;
  }, [cards, maxZIndex]);

  // Funciones públicas expuestas via ref
  const addNoteCard = useCallback((text: string, position?: { x: number; y: number }) => {
    const existingIds = cards.map(card => card.id);

    let cardX, cardY;

    if (position) {
      // Usar posición específica si se proporciona
      cardX = position.x;
      cardY = position.y;
    } else {
      // Calcular el centro visible de la pizarra
      const canvasWidth = canvasRef.current?.clientWidth || 1000;
      const canvasHeight = canvasRef.current?.clientHeight || 800;
      const centerX = -panOffset.x + (canvasWidth / 2);
      const centerY = -panOffset.y + (canvasHeight / 2);

      // Agregar un pequeño offset aleatorio para que no se superpongan
      const randomOffset = () => (Math.random() - 0.5) * 100;

      cardX = centerX + randomOffset() - 100; // -100 para centrar la card (width/2)
      cardY = centerY + randomOffset() - 60;  // -60 para centrar la card (height/2)
    }

    const nextZIndex = getNextZIndex();
    const cardId = generateUniqueId('note', existingIds);

    const newCard = {
      id: cardId,
      type: 'text',
      title: 'Nota',
      content: text, // Guardar todo el texto sin cortar
      x: cardX,
      y: cardY,
      width: 200,
      height: 120,
      fontSize: 18,
      zIndex: nextZIndex // Nuevo card aparece encima de todos
    };

    // Actualizar cardZIndices para que se renderice correctamente
    setCardZIndices(prev => ({ ...prev, [cardId]: nextZIndex }));

    setCards(prev => [...prev, newCard]);

    return cardId; // ✅ Retornar el ID del card creado
  }, [cards, panOffset, canvasRef, getNextZIndex]);

  const addTodoCard = useCallback((text?: string) => {
    const existingIds = cards.map(card => card.id);

    // Calcular el centro visible de la pizarra
    const canvasWidth = canvasRef.current?.clientWidth || 1000;
    const canvasHeight = canvasRef.current?.clientHeight || 800;
    const centerX = -panOffset.x + (canvasWidth / 2);
    const centerY = -panOffset.y + (canvasHeight / 2);

    // Agregar un pequeño offset aleatorio para que no se superpongan
    const randomOffset = () => (Math.random() - 0.5) * 100;

    const nextZIndex = getNextZIndex();
    const newCardId = generateUniqueId('todo', existingIds);

    const newCard = {
      id: newCardId,
      type: 'todo',
      title: 'Lista de Tareas',
      content: text ? `Iniciado con: ${text}` : '',
      x: centerX + randomOffset() - 125, // -125 para centrar la card (width/2)
      y: centerY + randomOffset() - 100, // -100 para centrar la card (height/2)
      width: 250,
      height: 200,
      fontSize: 18,
      zIndex: nextZIndex, // Nuevo card aparece encima de todos
      todos: text ? [{ id: 1, text: text, completed: false }] : []
    };

    // Actualizar cardZIndices para que se renderice correctamente
    setCardZIndices(prev => ({ ...prev, [newCardId]: nextZIndex }));

    setCards(prev => [...prev, newCard]);
    return newCardId; // ✅ Retornar el ID del card creado
  }, [cards, panOffset, canvasRef, getNextZIndex]);

  const addUsuarioCard = useCallback((userData: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  }) => {
    const existingIds = cards.map(card => card.id);

    // Calcular el centro visible de la pizarra
    const canvasWidth = canvasRef.current?.clientWidth || 1000;
    const canvasHeight = canvasRef.current?.clientHeight || 800;
    const centerX = -panOffset.x + (canvasWidth / 2);
    const centerY = -panOffset.y + (canvasHeight / 2);

    // Agregar un pequeño offset aleatorio para que no se superpongan
    const randomOffset = () => (Math.random() - 0.5) * 100;

    const nextZIndex = getNextZIndex();
    const cardId = generateUniqueId('usuario', existingIds);

    const newCard = {
      id: cardId,
      type: 'usuario',
      title: userData.name || 'Usuario',
      content: `Usuario: ${userData.name}`,
      x: centerX + randomOffset() - 140, // -140 para centrar la card (width/2)
      y: centerY + randomOffset() - 200, // -200 para centrar la card (height/2)
      width: 280,
      height: 400,
      fontSize: 18,
      zIndex: nextZIndex, // Nuevo card aparece encima de todos
      usuarioData: {
        userId: userData.userId,
        name: userData.name || 'Usuario',
        avatar: userData.avatar || 'US',
        color: userData.color || 'bg-blue-500',
        online: userData.online || false,
        messages: []
      }
    };

    // Actualizar cardZIndices para que se renderice correctamente
    setCardZIndices(prev => ({ ...prev, [cardId]: nextZIndex }));

    setCards(prev => [...prev, newCard]);
  }, [cards, panOffset, canvasRef, getNextZIndex]);

  const addMisionCardOrganizacion = useCallback((misionData: {
    id_mision: number;
    title: string;
    description: string;
    hours: number;
    id_usuario_asignado?: number;
    usuario_asignado_nombre?: string;
    usuario_asignado_avatar?: string;
  }): string => {
    const existingIds = cards.map(card => card.id);

    // Calcular el centro visible de la pizarra
    const canvasWidth = canvasRef.current?.clientWidth || 1000;
    const canvasHeight = canvasRef.current?.clientHeight || 800;
    const centerX = -panOffset.x + (canvasWidth / 2);
    const centerY = -panOffset.y + (canvasHeight / 2);

    // Agregar un pequeño offset aleatorio para que no se superpongan
    const randomOffset = () => (Math.random() - 0.5) * 100;

    const nextZIndex = getNextZIndex();
    const newCardId = generateUniqueId('mision-org', existingIds);

    const newCard = {
      id: newCardId,
      type: 'mision-organizacion',
      title: misionData.title || 'Nuevo Ticket',
      content: misionData.description || '',
      x: centerX + randomOffset() - 175, // -175 para centrar la card (width/2)
      y: centerY + randomOffset() - 250, // -250 para centrar la card (height/2)
      width: 350,
      height: 500,
      fontSize: 14,
      zIndex: nextZIndex, // Nuevo card aparece encima de todos
      misionData: {
        title: misionData.title,
        hours: misionData.hours,
        description: misionData.description,
        id_mision: misionData.id_mision,
        id_pizarra: pizarra?.id || undefined,
        id_usuario_asignado: misionData.id_usuario_asignado,
        usuario_asignado_nombre: misionData.usuario_asignado_nombre,
        usuario_asignado_avatar: misionData.usuario_asignado_avatar,
        estado: 'pendiente' as const,
        subtareas: [],
        entregas: [],
        card_todos: []
      }
    };

    // Actualizar cardZIndices para que se renderice correctamente
    setCardZIndices(prev => ({ ...prev, [newCardId]: nextZIndex }));

    console.log('✅ Misión card creada en pizarra:', newCardId);
    setCards(prev => [...prev, newCard]);
    return newCardId; // Retornar el ID del card creado
  }, [cards, panOffset, canvasRef, pizarra, getNextZIndex]);

  const restoreCard = useCallback((cardData: any) => {
    console.log('🔧 restoreCard ejecutado con:', cardData);
    // Restaurar un card desde el historial
    const existingIds = cards.map(card => card.id);
    const restoredCard = {
      ...cardData,
      id: generateUniqueId(cardData.type || 'card', existingIds),
      x: cardData.x || generatePosition(),
      y: cardData.y || generatePosition(),
      z: Date.now() // Asegurar que aparezca en la parte superior
    };
    console.log('✅ Card restaurado creado:', restoredCard);
    console.log('📋 Cards actuales antes de agregar:', cards);
    setCards(prev => {
      const newCards = [...prev, restoredCard];
      console.log('📋 Cards después de agregar:', newCards);
      return newCards;
    });
  }, [cards]);

  // Función manual para guardar en Supabase
  const saveToSupabase = useCallback(async () => {
    if (!usuario) {
      console.error('❌ No hay usuario para guardar');
      alert('❌ Error: No se ha iniciado sesión.');
      return false;
    }

    if (!isInitialized) {
      console.error('❌ El sistema no está inicializado todavía');
      alert('❌ Error: El sistema aún se está inicializando. Espera un momento e intenta de nuevo.');
      return false;
    }

    try {
      console.log('💾 Guardando pizarra en Supabase...');
      console.log('   - ID Usuario (UUID):', usuario.userAuth);
      console.log('   - Cards a guardar:', cards.length);

      // 1. Verificar/Obtener la pizarra del día
      console.log('   - Obteniendo pizarra del día...');
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');
      const SupabasePizarraRepository = (await import('@/infrastructure/datasource/SupabasePizarraRepository')).SupabasePizarraRepository;
      const pizarraRepo = new SupabasePizarraRepository();

      // Obtener o crear la pizarra del día usando el UUID
      const pizarraActual = await pizarraRepo.getPizarraDelDia(usuario.userAuth, new Date());

      if (!pizarraActual) {
        console.error('❌ No se pudo obtener o crear la pizarra del día');
        alert('❌ Error: No se pudo crear la pizarra en la base de datos.');
        return false;
      }

      console.log('   ✅ Pizarra del día obtenida:', pizarraActual.id);

      // 2. Actualizar panOffset
      console.log('   - Actualizando panOffset:', panOffset);
      await pizarraRepo.updatePanOffset(pizarraActual.id, panOffset.x, panOffset.y);

      // 3. Obtener las cards actuales de Supabase para esta pizarra
      const { data: cardsEnBD, error: cardsError } = await supabase
        .from('cards')
        .select('id, card_id')
        .eq('id_pizarra', pizarraActual.id);

      if (cardsError) {
        console.error('❌ Error obteniendo cards de la BD:', cardsError);
        return false;
      }

      const currentCardsInDB = (cardsEnBD || []).map((c: any) => c.card_id);

      // Crear un mapa de card_id (frontend) → id (UUID de BD) para las operaciones relacionadas
      const cardIdToUUID = new Map<string, string>();
      (cardsEnBD || []).forEach((c: any) => {
        cardIdToUUID.set(c.card_id, c.id);
      });

      // 4. Eliminar cards que ya no existen localmente
      console.log('   - Eliminando cards obsoletas...');
      const cardsToDelete = currentCardsInDB.filter(dbCardId =>
        !cards.some(localCard => localCard.id === dbCardId)
      );

      for (const cardId of cardsToDelete) {
        const { error: deleteError } = await supabase
          .from('cards')
          .delete()
          .eq('id_pizarra', pizarraActual.id)
          .eq('card_id', cardId);

        if (deleteError) {
          console.error('❌ Error eliminando card:', cardId, deleteError);
        } else {
          console.log('🗑️ Card eliminada de Supabase:', cardId);
        }
      }

      // 5. Crear o actualizar las cards actuales
      console.log('   - Guardando', cards.length, 'cards...');
      for (const card of cards) {
        const cardExists = currentCardsInDB.includes(card.id);

        if (cardExists) {
          // Actualizar card existente
          const cardData = mapCardToCardDB(card, pizarraActual.id);
          const { error: updateError } = await supabase
            .from('cards')
            .update(cardData)
            .eq('id_pizarra', pizarraActual.id)
            .eq('card_id', card.id);

          if (updateError) {
            console.error('❌ Error actualizando card:', card.id, updateError);
          } else {
            console.log('   ✏️ Card actualizada:', card.id);
          }

          // Card existente - actualizar sus todos
          if (card.type === 'todo' && card.todos) {
            const { SupabaseCardTodoRepository } = await import('@/infrastructure/datasource/SupabaseCardTodoRepository');
            const cardTodoRepo = new SupabaseCardTodoRepository();

            // Obtener el UUID de la card en la BD
            const cardUUID = cardIdToUUID.get(card.id);
            if (!cardUUID) {
              console.error('❌ No se encontró UUID para card:', card.id);
              continue;
            }

            // Obtener todos existentes
            const todosExistentes = await cardTodoRepo.getByCardId(cardUUID);
            const todosExistentesIds = todosExistentes.map(t => t.todo_id);

            // Eliminar todos que ya no existen
            for (const todoExistente of todosExistentes) {
              if (!card.todos.some(t => t.id === todoExistente.todo_id)) {
                await supabase
                  .from('card_todos')
                  .delete()
                  .eq('id_card', cardUUID)
                  .eq('todo_id', todoExistente.todo_id);
              }
            }

            // Crear o actualizar todos actuales
            for (const todo of card.todos) {
              if (todosExistentesIds.includes(todo.id)) {
                // Actualizar todo existente
                await supabase
                  .from('card_todos')
                  .update({
                    text: todo.text,
                    completed: todo.completed,
                    position: todo.id - 1,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id_card', cardUUID)
                  .eq('todo_id', todo.id);
              } else {
                // Crear nuevo todo
                await cardTodoRepo.create({
                  id_card: cardUUID,
                  todo_id: todo.id,
                  text: todo.text,
                  completed: todo.completed,
                  position: todo.id - 1
                });
              }
            }
          }

          // Card existente - actualizar sus notas (para proyectos)
          if ((card.type === 'proyecto' || card.type === 'proyecto-organizacion') && card.proyectoData) {
            const { SupabaseCardProyectoNotaRepository } = await import('@/infrastructure/datasource/SupabaseCardProyectoNotaRepository');
            const cardProyectoNotaRepo = new SupabaseCardProyectoNotaRepository();

            // Obtener el UUID de la card en la BD
            const cardUUID = cardIdToUUID.get(card.id);
            if (!cardUUID) {
              console.error('❌ No se encontró UUID para card proyecto:', card.id);
              continue;
            }

            // Obtener notas existentes
            const notasExistentes = await cardProyectoNotaRepo.getByCardProyectoId(cardUUID);
            const notasExistentesIds = notasExistentes.map(n => n.id_card_nota);

            // Eliminar notas que ya no existen
            for (const notaExistente of notasExistentes) {
              if (!card.proyectoData.notas || !card.proyectoData.notas.includes(notaExistente.id_card_nota)) {
                await cardProyectoNotaRepo.delete(cardUUID, notaExistente.id_card_nota);
              }
            }

            // Crear nuevas notas
            if (card.proyectoData.notas && card.proyectoData.notas.length > 0) {
              for (let i = 0; i < card.proyectoData.notas.length; i++) {
                const notaCardId = card.proyectoData.notas[i];
                if (!notasExistentesIds.includes(notaCardId)) {
                  // Crear nueva relación
                  await cardProyectoNotaRepo.create({
                    id_card_proyecto: cardUUID,
                    id_card_nota: notaCardId,
                    position: i
                  });
                }
              }
            }
          }
        } else {
          // Crear nueva card
          const cardData = mapCardToCardDB(card, pizarraActual.id);
          console.log('📝 Intentando crear card:', {
            card_id: card.id,
            type: card.type,
            pizarraId: pizarraActual.id
          });

          const { data: createdCard, error: createError } = await supabase
            .from('cards')
            .insert([cardData])
            .select()
            .single();

          if (createError) {
            // Si es un error de duplicado (23505), intentar actualizar en lugar de insertar
            if (createError.code === '23505') {
              console.log('⚠️ Card ya existe, actualizando en lugar de crear:', card.id);
              const { error: updateError } = await supabase
                .from('cards')
                .update(cardData)
                .eq('id_pizarra', pizarraActual.id)
                .eq('card_id', card.id);

              if (updateError) {
                console.error('❌ Error actualizando card duplicada:', card.id, updateError);
                continue;
              } else {
                console.log('   ✏️ Card duplicada actualizada exitosamente:', card.id);
                // Continuar con el flujo normal, pero no crear relaciones adicionales
                continue;
              }
            } else {
              console.error('❌ Error creando card:', card.id);
              console.error('   Error completo:', JSON.stringify(createError, null, 2));
              console.error('   Datos enviados:', JSON.stringify(cardData, null, 2));
              // No continuar si hay error
              continue;
            }
          } else {
            console.log('   ➕ Card creada exitosamente:', card.id);

            // Si es una misión, crear también su entrada en card_misiones
            if (createdCard && card.type === 'mision' && card.misionData?.id_mision) {
              const cardMisionRepo = new SupabaseCardMisionRepository();
              await cardMisionRepo.create({
                id_card: createdCard.id,
                id_mision: typeof card.misionData.id_mision === 'string' ? parseInt(card.misionData.id_mision) : card.misionData.id_mision,
                is_running: card.misionData.isRunning || false,
                last_capture_url: card.misionData.lastCaptureUrl || null
              });
            }

            // Si es una actividad, crear también su entrada en card_actividades
            if (createdCard && card.type === 'actividad' && card.activityData) {
              const { SupabaseCardActividadRepository } = await import('@/infrastructure/datasource/SupabaseCardActividadRepository');
              const cardActividadRepo = new SupabaseCardActividadRepository();

              // Extraer solo la hora si es un timestamp completo
              let timeValue = card.activityData.time || null;
              if (timeValue && timeValue.includes('T')) {
                // Si es un timestamp ISO, extraer solo la hora (HH:MM:SS)
                const dateObj = new Date(timeValue);
                timeValue = dateObj.toTimeString().split(' ')[0]; // HH:MM:SS
              }

              await cardActividadRepo.create({
                id_card: createdCard.id,
                subject: card.activityData.subject || null,
                date: card.activityData.date || null,
                time: timeValue,
                duration: card.activityData.duration || null,
                is_running: card.activityData.isRunning || false,
                time_left: card.activityData.timeLeft || null
              });
            }

            // Si es un usuario, crear también su entrada en card_usuarios
            if (createdCard && card.type === 'usuario' && card.usuarioData) {
              const { SupabaseCardUsuarioRepository } = await import('@/infrastructure/datasource/SupabaseCardUsuarioRepository');
              const cardUsuarioRepo = new SupabaseCardUsuarioRepository();
              await cardUsuarioRepo.create({
                id_card: createdCard.id,
                user_id: card.usuarioData.userId,
                name: card.usuarioData.name || null,
                avatar: card.usuarioData.avatar || null,
                color: card.usuarioData.color || null,
                online: card.usuarioData.online || false
              });
            }

            // Si es una card de tipo todo, crear sus todos en card_todos
            if (createdCard && card.type === 'todo' && card.todos && card.todos.length > 0) {
              const { SupabaseCardTodoRepository } = await import('@/infrastructure/datasource/SupabaseCardTodoRepository');
              const cardTodoRepo = new SupabaseCardTodoRepository();

              for (const todo of card.todos) {
                await cardTodoRepo.create({
                  id_card: createdCard.id,
                  todo_id: todo.id,
                  text: todo.text,
                  completed: todo.completed,
                  position: todo.id - 1 // Usar id - 1 como position
                });
              }
            }

            // Si es una card de tipo image, crear su entrada en card_images
            if (createdCard && card.type === 'image' && card.imageUrl) {
              const { SupabaseCardImageRepository } = await import('@/infrastructure/datasource/SupabaseCardImageRepository');
              const cardImageRepo = new SupabaseCardImageRepository();

              // Extraer información del archivo desde la URL o usar valores por defecto
              const fileName = card.imageUrl.split('/').pop() || 'image.png';
              const mimeType = card.imageUrl.includes('.png') ? 'image/png' :
                card.imageUrl.includes('.jpg') || card.imageUrl.includes('.jpeg') ? 'image/jpeg' :
                  card.imageUrl.includes('.gif') ? 'image/gif' :
                    card.imageUrl.includes('.webp') ? 'image/webp' : 'image/png';

              await cardImageRepo.create({
                id_card: createdCard.id,
                id_pizarra: pizarraActual.id,
                image_url: card.imageUrl,
                file_name: fileName,
                file_size: null, // Se puede agregar más adelante si se necesita
                mime_type: mimeType
              });
            }

            // Si es una card de tipo proyecto, crear las relaciones con las notas
            if (createdCard && (card.type === 'proyecto' || card.type === 'proyecto-organizacion') && card.proyectoData?.notas && card.proyectoData.notas.length > 0) {
              const { SupabaseCardProyectoNotaRepository } = await import('@/infrastructure/datasource/SupabaseCardProyectoNotaRepository');
              const cardProyectoNotaRepo = new SupabaseCardProyectoNotaRepository();

              for (let i = 0; i < card.proyectoData.notas.length; i++) {
                const notaCardId = card.proyectoData.notas[i];
                await cardProyectoNotaRepo.create({
                  id_card_proyecto: createdCard.id,
                  id_card_nota: notaCardId,
                  position: i
                });
              }
            }
          }
        }
      }

      // 6. Guardar las conexiones
      console.log('   - Guardando', connections.length, 'conexiones...');
      const { SupabaseCardConnectionRepository } = await import('@/infrastructure/datasource/SupabaseCardConnectionRepository');
      const cardConnectionRepo = new SupabaseCardConnectionRepository();

      // Obtener las conexiones actuales de Supabase para esta pizarra
      const connectionesEnBD = await cardConnectionRepo.getByPizarraId(pizarraActual.id);
      const currentConnectionsInDB = connectionesEnBD.map(c => c.connection_id);

      // Eliminar conexiones que ya no existen localmente
      const connectionsToDelete = currentConnectionsInDB.filter(dbConnId =>
        !connections.some(localConn => localConn.id === dbConnId)
      );

      for (const connId of connectionsToDelete) {
        const deleted = await cardConnectionRepo.delete(pizarraActual.id, connId);
        if (deleted) {
          console.log('🗑️ Conexión eliminada de Supabase:', connId);
        }
      }

      // Crear o actualizar las conexiones actuales
      for (const connection of connections) {
        const connectionExists = currentConnectionsInDB.includes(connection.id);

        if (connectionExists) {
          // Actualizar conexión existente
          await cardConnectionRepo.update(pizarraActual.id, connection.id, {
            from_card_id: connection.from || null,
            to_card_id: connection.to
          });
          console.log('   ✏️ Conexión actualizada:', connection.id);
        } else {
          // Crear nueva conexión
          await cardConnectionRepo.create({
            id_pizarra: pizarraActual.id,
            connection_id: connection.id,
            from_card_id: connection.from || null,
            to_card_id: connection.to
          });
          console.log('   ➕ Conexión creada:', connection.id);
        }
      }

      // Guardar snapshot histórico del día
      const today = new Date();
      const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      if (cards.length > 0) {
        saveHistorySnapshot(todayDate, cards);
      }

      console.log('✅ Pizarra guardada exitosamente');
      console.log('   - ID Pizarra:', pizarraActual.id);
      console.log('   - Cards guardadas:', cards.length);
      console.log('   - Conexiones guardadas:', connections.length);
      return true;
    } catch (error) {
      console.error('❌ Error guardando en Supabase:', error);
      return false;
    }
  }, [pizarra, usuario, cards, cardsDB, panOffset, updatePanOffset, createCard, updateCard, deleteCardDB, isInitialized, refetchPizarra, connections, saveHistorySnapshot]);

  // Función para guardar pizarra de organización en Supabase
  const saveToSupabaseOrganizacion = useCallback(async (pizarraOrg: any) => {
    if (!usuario) {
      console.error('❌ No hay usuario para guardar');
      return false;
    }

    if (!pizarraOrg) {
      console.error('❌ No hay pizarra de organización');
      return false;
    }

    try {
      console.log('💾 [PIZARRA ORG] Guardando pizarra de organización en Supabase...');
      console.log('   - ID Pizarra Org:', pizarraOrg.id);
      console.log('   - Cards a guardar:', cards.length);

      const { supabase } = await import('@/infrastructure/services/SupabaseClient');
      const { SupabasePizarraOrganizacionRepository } = await import('@/infrastructure/datasource/SupabasePizarraOrganizacionRepository');
      const pizarraOrgRepo = new SupabasePizarraOrganizacionRepository();

      // 1. Actualizar panOffset de la pizarra de organización
      console.log('   - Actualizando panOffset:', panOffset);
      await pizarraOrgRepo.updatePanOffset(pizarraOrg.id, panOffset.x, panOffset.y);

      // 2. Obtener las cards actuales de Supabase para esta pizarra
      const { data: cardsEnBD, error: cardsError } = await supabase
        .from('cards')
        .select('id, card_id')
        .eq('id_pizarra', pizarraOrg.id);

      if (cardsError) {
        console.error('❌ Error obteniendo cards de la BD:', cardsError);
        return false;
      }

      const currentCardsInDB = (cardsEnBD || []).map((c: any) => c.card_id);

      // Crear un mapa de card_id (frontend) → id (UUID de BD)
      const cardIdToUUID = new Map<string, string>();
      (cardsEnBD || []).forEach((c: any) => {
        cardIdToUUID.set(c.card_id, c.id);
      });

      // 3. Eliminar cards que ya no existen localmente
      console.log('   - Eliminando cards obsoletas...');
      const cardsToDelete = currentCardsInDB.filter(dbCardId =>
        !cards.some(localCard => localCard.id === dbCardId)
      );

      for (const cardId of cardsToDelete) {
        const { error: deleteError } = await supabase
          .from('cards')
          .delete()
          .eq('id_pizarra', pizarraOrg.id)
          .eq('card_id', cardId);

        if (deleteError) {
          console.error('❌ Error eliminando card:', cardId, deleteError);
        } else {
          console.log('🗑️ Card eliminada de Supabase:', cardId);
        }
      }

      // 4. Crear o actualizar las cards actuales
      console.log('   - Guardando', cards.length, 'cards...');
      for (const card of cards) {
        const cardExists = currentCardsInDB.includes(card.id);

        if (cardExists) {
          // Actualizar card existente
          const cardData = mapCardToCardDB(card, pizarraOrg.id);
          const { error: updateError } = await supabase
            .from('cards')
            .update(cardData)
            .eq('id_pizarra', pizarraOrg.id)
            .eq('card_id', card.id);

          if (updateError) {
            console.error('❌ Error actualizando card:', card.id, updateError);
          } else {
            console.log('   ✏️ Card actualizada:', card.id);
          }

          // Actualizar todos si es card tipo todo
          if (card.type === 'todo' && card.todos) {
            const { SupabaseCardTodoRepository } = await import('@/infrastructure/datasource/SupabaseCardTodoRepository');
            const cardTodoRepo = new SupabaseCardTodoRepository();

            const cardUUID = cardIdToUUID.get(card.id);
            if (!cardUUID) {
              console.error('❌ No se encontró UUID para card:', card.id);
              continue;
            }

            const todosExistentes = await cardTodoRepo.getByCardId(cardUUID);
            const todosExistentesIds = todosExistentes.map(t => t.todo_id);

            // Eliminar todos que ya no existen
            for (const todoExistente of todosExistentes) {
              if (!card.todos.some(t => t.id === todoExistente.todo_id)) {
                await supabase
                  .from('card_todos')
                  .delete()
                  .eq('id_card', cardUUID)
                  .eq('todo_id', todoExistente.todo_id);
              }
            }

            // Crear o actualizar todos actuales
            for (const todo of card.todos) {
              if (todosExistentesIds.includes(todo.id)) {
                await supabase
                  .from('card_todos')
                  .update({
                    text: todo.text,
                    completed: todo.completed,
                    position: todo.id - 1,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id_card', cardUUID)
                  .eq('todo_id', todo.id);
              } else {
                await cardTodoRepo.create({
                  id_card: cardUUID,
                  todo_id: todo.id,
                  text: todo.text,
                  completed: todo.completed,
                  position: todo.id - 1
                });
              }
            }
          }
        } else {
          // Crear nueva card
          const cardData = mapCardToCardDB(card, pizarraOrg.id);
          const { data: insertedCard, error: insertError } = await supabase
            .from('cards')
            .insert(cardData)
            .select('id')
            .single();

          if (insertError) {
            console.error('❌ Error insertando card:', card.id, insertError);
          } else {
            console.log('   ➕ Card creada:', card.id);

            // Crear todos si es card tipo todo
            if (card.type === 'todo' && card.todos && insertedCard) {
              const { SupabaseCardTodoRepository } = await import('@/infrastructure/datasource/SupabaseCardTodoRepository');
              const cardTodoRepo = new SupabaseCardTodoRepository();

              for (const todo of card.todos) {
                await cardTodoRepo.create({
                  id_card: insertedCard.id,
                  todo_id: todo.id,
                  text: todo.text,
                  completed: todo.completed,
                  position: todo.id - 1
                });
              }
            }
          }
        }
      }

      // 5. Guardar conexiones
      console.log('   - Guardando conexiones...');
      const { error: deleteConnectionsError } = await supabase
        .from('pizarra_connections')
        .delete()
        .eq('id_pizarra', pizarraOrg.id);

      if (deleteConnectionsError) {
        console.error('❌ Error eliminando conexiones antiguas:', deleteConnectionsError);
      }

      for (const connection of connections) {
        const { error: insertError } = await supabase
          .from('pizarra_connections')
          .insert({
            id_pizarra: pizarraOrg.id,
            from_card: connection.from,
            to_card: connection.to
          });

        if (insertError) {
          console.error('❌ Error insertando conexión:', insertError);
        }
      }

      console.log('✅ [PIZARRA ORG] Pizarra guardada exitosamente');
      console.log('   - Cards guardadas:', cards.length);
      console.log('   - Conexiones guardadas:', connections.length);
      return true;
    } catch (error) {
      console.error('❌ [PIZARRA ORG] Error guardando en Supabase:', error);
      return false;
    }
  }, [usuario, cards, panOffset, connections]);

  // Función manual para cargar desde Supabase
  const loadFromSupabase = useCallback(async () => {
    if (!usuario) {
      console.error('❌ No hay usuario para cargar');
      alert('❌ Error: No se ha iniciado sesión.');
      return;
    }

    console.log('📥 Cargando pizarra desde Supabase...');
    console.log('   - ID Usuario (UUID):', usuario.userAuth);
    console.log('   - Usuario logeado:', usuario.getNombreCompleto());

    try {
      // 1. Obtener la pizarra del día
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');
      const SupabasePizarraRepository = (await import('@/infrastructure/datasource/SupabasePizarraRepository')).SupabasePizarraRepository;
      const pizarraRepo = new SupabasePizarraRepository();

      const pizarraActual = await pizarraRepo.getPizarraDelDia(usuario.userAuth, new Date());

      if (!pizarraActual) {
        console.log('   - No hay pizarra para el día de hoy');
        setCards([]);
        setPanOffset({ x: 0, y: 0 });
        alert('ℹ️ No hay pizarra guardada para hoy. La pizarra está vacía.');
        return;
      }

      console.log('   ✅ Pizarra del día obtenida:', pizarraActual.id);

      // 2. Cargar panOffset
      setPanOffset({
        x: Number(pizarraActual.pan_offset_x) || 0,
        y: Number(pizarraActual.pan_offset_y) || 0
      });

      // 3. Obtener las cards de esta pizarra
      const { data: cardsEnBD, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('id_pizarra', pizarraActual.id);

      if (cardsError) {
        console.error('❌ Error obteniendo cards de la BD:', cardsError);
        alert('❌ Error al cargar las cards desde Supabase.');
        return;
      }

      console.log('   - Cards encontradas:', cardsEnBD?.length || 0);

      // Limpiar cards actuales
      setCards([]);

      if (!cardsEnBD || cardsEnBD.length === 0) {
        console.log('   - No hay cards para esta pizarra');
        return;
      }

      // 4. Mapear las cards
      const cardMisionRepo = new SupabaseCardMisionRepository();
      const misionRepo = new SupabaseMisionRepository();
      const { SupabaseCardActividadRepository } = await import('@/infrastructure/datasource/SupabaseCardActividadRepository');
      const cardActividadRepo = new SupabaseCardActividadRepository();
      const { SupabaseCardUsuarioRepository } = await import('@/infrastructure/datasource/SupabaseCardUsuarioRepository');
      const cardUsuarioRepo = new SupabaseCardUsuarioRepository();
      const { SupabaseCardTodoRepository } = await import('@/infrastructure/datasource/SupabaseCardTodoRepository');
      const cardTodoRepo = new SupabaseCardTodoRepository();
      const mappedCards: Card[] = [];

      for (const cardDB of cardsEnBD) {
        const card = mapCardDBToCard(cardDB);

        // Si es una card de tipo mision, cargar sus datos completos
        if (cardDB.type === 'mision') {
          try {
            const cardMision = await cardMisionRepo.getByCardId(cardDB.id);
            if (cardMision) {
              const mision = await misionRepo.getMisionById(cardMision.id_mision);

              card.misionData = {
                title: mision?.nombre || card.title,
                hours: mision?.horas || 1,
                description: mision?.descripcion || card.content,
                idCreador: mision?.id_creador,
                isRunning: cardMision.is_running,
                lastCaptureUrl: cardMision.last_capture_url,
                id_mision: cardMision.id_mision,
                id_usuario: mision?.id_usuario?.toString()
              };
            }
          } catch (error) {
            console.error('Error cargando datos de mision para card:', cardDB.id, error);
          }
        }

        // Si es una card de tipo actividad, cargar sus datos completos
        if (cardDB.type === 'actividad') {
          try {
            const cardActividad = await cardActividadRepo.getByCardId(cardDB.id);
            if (cardActividad) {
              // Crear participante con el usuario logeado (usar el usuario del scope)
              console.log('   - Creando participante para actividad con usuario:', usuario?.getNombreCompleto());

              const currentUserParticipant = {
                name: usuario.getNombreCompleto(),
                initial: usuario.getNombreCompleto().charAt(0).toUpperCase(),
                color: usuario.profile.marco || '#3b82f6'
              };

              card.activityData = {
                subject: cardActividad.subject || '',
                participants: [currentUserParticipant], // Usuario logeado por defecto
                date: cardActividad.date || '',
                time: cardActividad.time || '',
                duration: cardActividad.duration || 0,
                isRunning: cardActividad.is_running || false,
                timeLeft: cardActividad.time_left || 0,
                id_actividad: cardDB.id // Usar el ID de la card como ID de actividad
              };

              console.log('   - Participante creado:', currentUserParticipant);
              console.log('   - activityData completa:', card.activityData);
              console.log('   - Participants en activityData:', card.activityData.participants);
            }
          } catch (error) {
            console.error('Error cargando datos de actividad para card:', cardDB.id, error);
          }
        }

        // Si es una card de tipo usuario, cargar sus datos completos
        if (cardDB.type === 'usuario') {
          try {
            const cardUsuario = await cardUsuarioRepo.getByCardId(cardDB.id);
            if (cardUsuario) {
              card.usuarioData = {
                userId: cardUsuario.user_id,
                name: cardUsuario.name || '',
                avatar: cardUsuario.avatar || '',
                color: cardUsuario.color || '#3b82f6',
                online: cardUsuario.online || false,
                messages: [] // Los mensajes se cargarán desde el content JSON si existen
              };

              // Intentar parsear los mensajes desde el content de la card si existen
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
                  // Si no se puede parsear, los mensajes quedan vacíos
                  console.log('No hay mensajes en formato JSON para esta card de usuario');
                }
              }
            }
          } catch (error) {
            console.error('Error cargando datos de usuario para card:', cardDB.id, error);
          }
        }

        // Si es una card de tipo todo, cargar sus todos desde card_todos
        if (cardDB.type === 'todo') {
          try {
            const cardTodos = await cardTodoRepo.getByCardId(cardDB.id);
            if (cardTodos && cardTodos.length > 0) {
              card.todos = cardTodos.map(todo => ({
                id: todo.todo_id,
                text: todo.text,
                completed: todo.completed
              }));
            }
          } catch (error) {
            console.error('Error cargando todos para card:', cardDB.id, error);
          }
        }

        // Si es una card de tipo image, cargar sus datos desde card_images
        if (cardDB.type === 'image') {
          try {
            const { SupabaseCardImageRepository } = await import('@/infrastructure/datasource/SupabaseCardImageRepository');
            const cardImageRepo = new SupabaseCardImageRepository();
            const cardImage = await cardImageRepo.getByCardId(cardDB.id);
            if (cardImage) {
              card.imageUrl = cardImage.image_url;
              // También actualizar pastedImages para mostrar la imagen
              setPastedImages(prev => ({
                ...prev,
                [card.id]: cardImage.image_url
              }));
            }
          } catch (error) {
            console.error('Error cargando imagen para card:', cardDB.id, error);
          }
        }

        mappedCards.push(card);
      }

      console.log('✅ Cards cargadas:', mappedCards.length);
      console.log('   - Verificando participants en cards de actividad:');
      mappedCards.forEach((card, idx) => {
        if (card.type === 'actividad') {
          console.log(`   - Card ${idx} (${card.id}):`, card.activityData?.participants);
        }
      });
      setCards(mappedCards);

      // 5. Cargar las conexiones de la pizarra
      console.log('   - Cargando conexiones...');
      const { SupabaseCardConnectionRepository } = await import('@/infrastructure/datasource/SupabaseCardConnectionRepository');
      const cardConnectionRepo = new SupabaseCardConnectionRepository();

      const connectionesEnBD = await cardConnectionRepo.getByPizarraId(pizarraActual.id);
      console.log('   - Conexiones encontradas:', connectionesEnBD.length);

      // Mapear las conexiones de BD al formato local
      const mappedConnections = connectionesEnBD.map(connDB => ({
        id: connDB.connection_id,
        from: connDB.from_card_id || undefined,
        to: connDB.to_card_id
      }));

      setConnections(mappedConnections);
      console.log('✅ Conexiones cargadas:', mappedConnections.length);

    } catch (error) {
      console.error('❌ Error cargando desde Supabase:', error);
      alert('❌ Error al cargar la pizarra desde Supabase.');
    }
  }, [usuario, setConnections]);

  // Función para cargar una pizarra específica por ID
  const loadPizarraById = useCallback(async (pizarraId: string) => {
    if (!usuario) {
      console.error('❌ No hay usuario para cargar');
      alert('❌ Error: No se ha iniciado sesión.');
      return;
    }

    console.log('📥 Cargando pizarra por ID:', pizarraId);

    try {
      // 1. Obtener la pizarra por ID
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');
      const SupabasePizarraRepository = (await import('@/infrastructure/datasource/SupabasePizarraRepository')).SupabasePizarraRepository;
      const pizarraRepo = new SupabasePizarraRepository();

      const pizarraActual = await pizarraRepo.getPizarraById(pizarraId);

      if (!pizarraActual) {
        console.log('   - No se encontró la pizarra con ID:', pizarraId);
        alert('ℹ️ No se encontró la pizarra.');
        return;
      }

      console.log('   ✅ Pizarra obtenida:', pizarraActual.id);

      // 2. Cargar panOffset
      setPanOffset({
        x: Number(pizarraActual.pan_offset_x) || 0,
        y: Number(pizarraActual.pan_offset_y) || 0
      });

      // 3. Obtener las cards de esta pizarra
      const { data: cardsEnBD, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('id_pizarra', pizarraActual.id);

      if (cardsError) {
        console.error('❌ Error obteniendo cards de la BD:', cardsError);
        alert('❌ Error al cargar las cards desde Supabase.');
        return;
      }

      console.log('   - Cards encontradas:', cardsEnBD?.length || 0);

      // Limpiar cards actuales
      setCards([]);

      if (!cardsEnBD || cardsEnBD.length === 0) {
        console.log('   - No hay cards para esta pizarra');
        return;
      }

      // 4. Mapear las cards (mismo código que loadFromSupabase)
      const cardMisionRepo = new SupabaseCardMisionRepository();
      const misionRepo = new SupabaseMisionRepository();
      const { SupabaseCardActividadRepository } = await import('@/infrastructure/datasource/SupabaseCardActividadRepository');
      const cardActividadRepo = new SupabaseCardActividadRepository();
      const { SupabaseCardUsuarioRepository } = await import('@/infrastructure/datasource/SupabaseCardUsuarioRepository');
      const cardUsuarioRepo = new SupabaseCardUsuarioRepository();
      const { SupabaseCardTodoRepository } = await import('@/infrastructure/datasource/SupabaseCardTodoRepository');
      const cardTodoRepo = new SupabaseCardTodoRepository();

      const cardsLoaded: Card[] = [];

      for (const cardDB of cardsEnBD) {
        // IMPORTANTE: Generar un nuevo ID para evitar conflictos con cards existentes
        // Esto permite cargar pizarras históricas sin colisiones de IDs
        const existingIds = cards.map(c => c.id);
        const newCardId = generateUniqueId(cardDB.type, existingIds);

        const card: Card = {
          id: newCardId, // Usar nuevo ID generado
          type: cardDB.type,
          title: cardDB.title,
          content: cardDB.content,
          x: cardDB.x,
          y: cardDB.y,
          width: cardDB.width,
          height: cardDB.height,
          fontSize: cardDB.font_size
        };

        // Cargar datos específicos según el tipo de card
        if (cardDB.type === 'mision') {
          try {
            const cardMision = await cardMisionRepo.getByCardId(cardDB.id);
            if (cardMision) {
              const mision = await misionRepo.getMisionById(cardMision.id_mision);
              if (mision) {
                card.misionData = {
                  title: mision.nombre || 'Sin título',
                  description: mision.descripcion || '',
                  hours: mision.horas || 0,
                  id_mision: mision.id,
                  idCreador: mision.id_creador,
                  isRunning: cardMision.is_running,
                  lastCaptureUrl: cardMision.last_capture_url,
                  id_usuario: mision.id_usuario?.toString()
                };
              }
            }
          } catch (error) {
            console.error('Error cargando datos de misión para card:', cardDB.id, error);
          }
        }

        if (cardDB.type === 'actividad') {
          try {
            const cardActividad = await cardActividadRepo.getByCardId(cardDB.id);
            if (cardActividad && usuario) {
              const currentUserParticipant = {
                name: usuario.getNombreCompleto(),
                initial: usuario.getNombreCompleto().charAt(0).toUpperCase(),
                color: usuario.profile.marco || '#3b82f6'
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
            console.error('Error cargando datos de actividad para card:', cardDB.id, error);
          }
        }

        if (cardDB.type === 'usuario') {
          try {
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
            console.error('Error cargando datos de usuario para card:', cardDB.id, error);
          }
        }

        if (cardDB.type === 'todo') {
          try {
            const cardTodos = await cardTodoRepo.getByCardId(cardDB.id);
            if (cardTodos && cardTodos.length > 0) {
              card.todos = cardTodos.map((todo: any) => ({
                id: todo.todo_id,
                text: todo.text,
                completed: todo.completed
              }));
            }
          } catch (error) {
            console.error('Error cargando todos para card:', cardDB.id, error);
          }
        }

        // Si es una card de tipo image, cargar sus datos desde card_images
        if (cardDB.type === 'image') {
          try {
            const { SupabaseCardImageRepository } = await import('@/infrastructure/datasource/SupabaseCardImageRepository');
            const cardImageRepo = new SupabaseCardImageRepository();
            const cardImage = await cardImageRepo.getByCardId(cardDB.id);
            if (cardImage) {
              card.imageUrl = cardImage.image_url;
            }
          } catch (error) {
            console.error('Error cargando imagen para card:', cardDB.id, error);
          }
        }

        cardsLoaded.push(card);
      }

      setCards(cardsLoaded);
      console.log('✅ Cards cargadas:', cardsLoaded.length);

      // 5. Cargar conexiones
      const { SupabaseCardConnectionRepository } = await import('@/infrastructure/datasource/SupabaseCardConnectionRepository');
      const cardConnectionRepo = new SupabaseCardConnectionRepository();

      const connectionesEnBD = await cardConnectionRepo.getByPizarraId(pizarraActual.id);
      console.log('   - Conexiones encontradas:', connectionesEnBD.length);

      const mappedConnections = connectionesEnBD.map(connDB => ({
        id: connDB.connection_id,
        from: connDB.from_card_id || undefined,
        to: connDB.to_card_id
      }));

      setConnections(mappedConnections);
      console.log('✅ Pizarra cargada completamente');

    } catch (error) {
      console.error('❌ Error cargando pizarra por ID:', error);
      alert('❌ Error al cargar la pizarra.');
    }
  }, [usuario, setConnections]);

  // Para pizarras de organización: cargar desde Supabase la primera vez en el día
  useEffect(() => {
    if (!isOrganizacionPizarra || !pizarraOrganizacion) return;

    const loadOrganizacionPizarraFromSupabase = async () => {
      if (shouldLoadFromSupabase()) {
        console.log('🏢 [PIZARRA ORG] Cargando desde Supabase (primera vez del día)...');

        try {
          // Cargar desde Supabase
          const { supabase } = await import('@/infrastructure/services/SupabaseClient');

          // Cargar cards de la pizarra de organización
          const { data: cardsEnBD, error: cardsError } = await supabase
            .from('cards')
            .select('*')
            .eq('id_pizarra', pizarraOrganizacion.id);

          if (cardsError) {
            console.error('❌ Error cargando cards:', cardsError);
            return;
          }

          console.log('📦 [PIZARRA ORG] Cards cargadas:', cardsEnBD?.length || 0);

          // Mapear cards (similar a loadFromSupabase pero sin crear pizarra)
          if (cardsEnBD && cardsEnBD.length > 0) {
            const mappedCards: Card[] = [];

            for (const cardDB of cardsEnBD) {
              const card = mapCardDBToCard(cardDB);
              mappedCards.push(card);
            }

            setCards(mappedCards);
          }

          // Cargar conexiones
          const { data: connectionsData, error: connectionsError } = await supabase
            .from('pizarra_connections')
            .select('*')
            .eq('id_pizarra', pizarraOrganizacion.id);

          if (!connectionsError && connectionsData) {
            const loadedConnections = connectionsData.map((c: any) => ({
              from: c.from_card,
              to: c.to_card
            }));
            setConnections(loadedConnections);
          }

          // Marcar que ya se cargó desde Supabase hoy
          markSupabaseLoaded();
          console.log('✅ [PIZARRA ORG] Carga desde Supabase completada');
        } catch (error) {
          console.error('❌ [PIZARRA ORG] Error cargando desde Supabase:', error);
        }
      }
    };

    loadOrganizacionPizarraFromSupabase();
  }, [isOrganizacionPizarra, pizarraOrganizacion, shouldLoadFromSupabase, markSupabaseLoaded, setCards, setConnections]);

  // Auto-guardado en Supabase cuando está activado
  useEffect(() => {
    if (!autoSave || !usuario || !isInitialized || cards.length === 0) {
      return;
    }

    // Debounce para evitar guardados excesivos
    const timeoutId = setTimeout(async () => {
      try {
        if (isOrganizacionPizarra && pizarraOrganizacion) {
          // Guardar en pizarra de organización
          console.log('🔄 [PIZARRA ORG] Auto-guardado en Supabase...');
          await saveToSupabaseOrganizacion(pizarraOrganizacion);
        } else {
          // Guardar en pizarra personal
          console.log('🔄 Auto-guardado en Supabase...');
          await saveToSupabase();
        }
      } catch (error) {
        console.error('❌ Error en auto-guardado:', error);
      }
    }, 3000); // Esperar 3 segundos después del último cambio

    return () => clearTimeout(timeoutId);
  }, [cards, connections, panOffset, autoSave, usuario, isInitialized, isOrganizacionPizarra, pizarraOrganizacion, saveToSupabase, saveToSupabaseOrganizacion]);

  // Función para agregar una conexión programáticamente
  const addConnection = useCallback((fromCardId: string, toCardId: string, skipValidation = false) => {
    console.log('🔗 Agregando conexión programática:', { fromCardId, toCardId, skipValidation });

    if (!skipValidation) {
      // Verificar que ambas cards existan
      const fromCard = cards.find(c => c.id === fromCardId);
      const toCard = cards.find(c => c.id === toCardId);

      if (!fromCard || !toCard) {
        console.warn('⚠️ No se puede crear conexión, una o ambas cards no existen:', { fromCardId, toCardId });
        console.log('Cards disponibles:', cards.map(c => ({ id: c.id, type: c.type })));
        return;
      }
    }

    // Verificar que no exista ya la conexión
    const connectionExists = connections.some(conn =>
      conn.from === fromCardId && conn.to === toCardId
    );

    if (!connectionExists) {
      const newConnection: Connection = {
        id: `connection-${fromCardId}-${toCardId}-${Date.now()}`,
        from: fromCardId,
        to: toCardId
      };
      setConnections(prev => [...prev, newConnection]);
      console.log('✅ Conexión creada exitosamente:', newConnection);
    } else {
      console.log('ℹ️ La conexión ya existe');
    }
  }, [cards, connections, setConnections]);

  // Función para eliminar conexiones entre dos cards (en cualquier dirección)
  const removeConnectionBetween = useCallback((cardId1: string, cardId2: string) => {
    console.log('🗑️ Eliminando conexiones entre:', { cardId1, cardId2 });

    setConnections(prev => {
      const filtered = prev.filter(conn =>
        !(
          (conn.from === cardId1 && conn.to === cardId2) ||
          (conn.from === cardId2 && conn.to === cardId1)
        )
      );

      const removedCount = prev.length - filtered.length;
      console.log(`✅ ${removedCount} conexión(es) eliminada(s)`);

      return filtered;
    });
  }, [setConnections]);

  // Función para actualizar el ID de un card (de temporal a UUID)
  const updateCardId = useCallback((oldId: string, newId: string) => {
    console.log('🔄 [updateCardId] Actualizando ID de card:', { oldId, newId });

    // Actualizar el card
    setCards((prevCards) => {
      return prevCards.map((c) => {
        if (c.id === oldId) {
          console.log('✅ Card encontrado, actualizando ID');
          return { ...c, id: newId };
        }
        return c;
      });
    });

    // Actualizar las conexiones que usan este card
    setConnections((prevConnections) => {
      return prevConnections.map((conn) => {
        if (conn.from === oldId) {
          return { ...conn, from: newId };
        }
        if (conn.to === oldId) {
          return { ...conn, to: newId };
        }
        return conn;
      });
    });

    console.log('✅ [updateCardId] Card y conexiones actualizados');
  }, []);

  useImperativeHandle(ref, () => ({
    addNoteCard,
    addTodoCard,
    addUsuarioCard,
    addMisionCardOrganizacion,
    restoreCard,
    clearStorage: clearLocalStorage,
    exportStorage: exportToJSON,
    importStorage: importFromJSON,
    saveToSupabase,
    loadFromSupabase,
    loadPizarraById,
    addConnection,
    removeConnectionBetween,
    centerOnCard: navigateToCard, // navigateToCard funciona como centerOnCard
    findCardByMisionId,
    updateCardId
  }), [addNoteCard, addTodoCard, addUsuarioCard, addMisionCardOrganizacion, restoreCard, clearLocalStorage, exportToJSON, importFromJSON, saveToSupabase, loadFromSupabase, loadPizarraById, addConnection, removeConnectionBetween, navigateToCard, findCardByMisionId, updateCardId]);

  // Wrapper para handleConnectionPointClick con canvasRef
  const handleConnectionPointClick = useCallback((e: React.MouseEvent<HTMLDivElement>, cardId: string) => {
    baseHandleConnectionPointClick(e, cardId, canvasRef);
  }, [baseHandleConnectionPointClick]);

  // Wrapper para handleCanvasMouseDown
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    baseHandleCanvasMouseDown(e, draggedCard, isConnecting);
  }, [baseHandleCanvasMouseDown, draggedCard, isConnecting]);

  // Combinar mouse move handlers
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (isConnecting && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      updateMousePosition(e.clientX - rect.left, e.clientY - rect.top);
    }
    panGlobalMouseMove(e);
    dragGlobalMouseMove(e);
  }, [isConnecting, panGlobalMouseMove, dragGlobalMouseMove, updateMousePosition]);

  // Combinar mouse up handlers
  const handleMouseUp = useCallback(() => {
    panHandleMouseUp();
    dragHandleMouseUp();
  }, [panHandleMouseUp, dragHandleMouseUp]);

  // Effects
  useEffect(() => {
    if (isPanning || draggedCard || isConnecting) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, draggedCard, isConnecting, handleGlobalMouseMove, handleMouseUp]);

  useEffect(() => {
    if (resizingCard) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);

      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingCard, handleResizeMove, handleResizeEnd]);

  // Effect: Marcar como inicializado cuando el usuario esté disponible
  useEffect(() => {
    if (usuario?.id && !isInitialized) {
      console.log('✅ Usuario cargado, listo para operaciones:', usuario.id);
      setIsInitialized(true);
    }
  }, [usuario, isInitialized]);


  return (
    <div className={`w-screen h-screen bg-transparent flex flex-col items-center justify-center p-8 ${isReceivingDrag ? 'z-50' : ''}`}>
      <div
        ref={canvasRef}
        className={`
          relative ${fullMode ? 'w-full h-full' : 'w-4/5 h-4/5'}
          ${fullMode ? ' border-4 border-dashed rounded-3xl' : 'border-4 border-dashed rounded-3xl'}
          transition-colors duration-300 ease-in-out overflow-hidden
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-transparent'}
          ${isPanning ? 'cursor-grabbing select-none' : 'cursor-grab'}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onMouseDown={handleCanvasMouseDown}
      >
        {/* Botón para navegar al origen (0,0) */}
        <button
          onClick={navigateToOrigin}
          className={`absolute z-[999] bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-full p-3 shadow-lg border border-gray-300 hover:border-blue-400 transition-all duration-200 hover:scale-110 active:scale-95 group ${
            fullMode ? 'bottom-4 left-4' : 'top-4 left-4'
          }`}
          title="Ir al origen (0,0)"
          style={{ pointerEvents: 'auto' }}
        >
          {/* Icono de ubicación/centro con crosshair */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="3" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4M2 12h4m12 0h4" />
          </svg>
          <span className="absolute -bottom-10 left-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Ir al origen (0,0)
          </span>
        </button>
        <ConnectionLines
          connections={connections}
          cards={cards}
          panOffset={panOffset}
          isConnecting={isConnecting}
          connectingFrom={connectingFrom}
          mousePosition={mousePosition}
          deleteConnection={deleteConnection}
          navigateToCard={navigateToCard}
        />

        {cards.length === 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
          >
            <div className="text-center">
              <div className={`text-6xl mb-4 transition-colors duration-300 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`}>
                💼
              </div>
              <p className={`text-lg font-medium transition-colors duration-300 ${isDragOver ? 'text-blue-600' : 'text-white'}`}>
                {isDragOver ? 'Suelta aquí para crear una card' : 'Arrastra archivos o texto a la pizarra'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Click y arrastra para navegar por la pizarra
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Hover sobre las cards y click en la tachuela 📌 para conectar
              </p>
            </div>
          </div>
        )}

        {cards.map(card => (
          <CardWrapperComponent
            key={card.id}
            card={card}
            draggedCard={draggedCard}
            isConnecting={isConnecting}
            connectingFrom={connectingFrom}
            hoveredCard={hoveredCard}
            panOffset={panOffset}
            editingTitle={editingTitle}
            editingTodo={editingTodo}
            configOpenCard={configOpenCard}
            confirmDelete={confirmDelete}
            cardZIndex={cardZIndices[card.id] || 1}
            handleCardMouseDown={handleCardMouseDown}
            setHoveredCard={setHoveredCard}
            handleCardClick={handleCardClick}
            handleResizeStart={handleResizeStart}
            handleConnectionPointClick={handleConnectionPointClick}
            setConfigOpenCard={setConfigOpenCard}
            changeFontSize={changeFontSize}
            setEditingTitle={setEditingTitle}
            setConfirmDelete={setConfirmDelete}
            deleteCard={deleteCard}
            updateCardTitle={updateCardTitle}
            updateCardContent={updateCardContent}
            setEditingTodo={setEditingTodo}
            toggleTodo={toggleTodo}
            addTodoToCard={addTodoToCard}
            deleteTodoFromCard={deleteTodoFromCard}
            updateTodoInCard={updateTodoInCard}
            handleActivityPlayPause={handleActivityPlayPause}
            handleMisionPlayPause={handleMisionPlayPause}
            onShowScreenshots={onShowScreenshots}
            screenshots={screenshots}
            isCapturing={isCapturing}
            captureNow={captureNow}
            setCards={setCards}
            pastedImages={pastedImages}
            bringCardToFront={bringCardToFront}
            onOpenUserChat={handleOpenUserChat}
            usuarios={usuarios}
            currentUserId={currentUserId}
            openImageWindow={openImageWindow}
            addTodoCard={addTodoCard}
            addNoteCard={addNoteCard}
            addConnection={addConnection}
            addMisionCardOrganizacion={addMisionCardOrganizacion}
            cards={cards}
          />
        ))}

        {isConnecting && (
          <div
            className="absolute pointer-events-none z-30"
            style={{
              left: mousePosition.x - 12,
              top: mousePosition.y - 12
            }}
          >
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <span className="text-sm">📌</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600 text-center">
        <p>Cards: {cards.length} | Conexiones: {connections.length}</p>
        {isConnecting && (
          <p className="text-blue-600 font-medium">
            Conectando desde: {cards.find(c => c.id === connectingFrom)?.title}
          </p>
        )}

      </div>

      {/* Ventanas de imágenes independientes */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'none' }} data-image-window>
        {imageWindows.map(window => (
          <div key={window.id} style={{ pointerEvents: 'auto' }} data-image-window>
            <Ventana
              isOpen={true}
              onClose={() => closeImageWindow(window.id)}
              title={window.title}
              initialWidth={window.width}
              initialHeight={window.height}
              minWidth={300}
              minHeight={200}
              resizable={true}
              draggable={true}
              showOverlay={false}
            >
              <div className="w-full h-full flex items-center justify-center bg-white">
                <img
                  src={window.imageUrl}
                  alt={window.title}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </Ventana>
          </div>
        ))}
      </div>

      <style jsx global>{`
        /* Bajar z-index de salas cuando hay ventanas de imagen abiertas */
        body.image-window-open .fixed.bg-white.border.border-gray-200.rounded-xl {
          z-index: 5 !important;
        }

        /* Las ventanas de imagen mantienen su z-index alto */
        body.image-window-open [data-image-window] {
          z-index: 99999 !important;
        }
      `}</style>

      <style jsx>{`
        .todo-scroll {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e0 #f7fafc;
        }

        .todo-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .todo-scroll::-webkit-scrollbar-track {
          background: #f7fafc;
          border-radius: 3px;
        }

        .todo-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
          transition: background 0.2s ease;
        }

        .todo-scroll::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }

        .todo-scroll::-webkit-scrollbar-thumb:active {
          background: #718096;
        }
      `}</style>
    </div>
  );
});

TestPizarra.displayName = 'TestPizarra';

export default TestPizarra;
export type { PizarraRef } from './types';
