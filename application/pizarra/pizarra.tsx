import React, { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useScreenshots } from '@/hooks/useScreenshots';
import { useAuth } from '@/app/contexts/AuthContext';
import { useSettings } from '@/app/contexts/SettingsContext';
import { Card, PizarraRef, PizarraProps, TodoItem, ActivityData, MisionData, Connection, ProyectoData, UsuarioData } from './types';
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
import { loadViewingUserId } from './pizarra-functions/user-id-converter';
import { createImageWindow, removeImageWindow, type ImageWindow } from './pizarra-functions/image-window-manager';
import { syncCardsFromDB, shouldSyncFromDB } from './pizarra-functions/card-sync';
import { handleConnectionCreate, handleConnectionDelete } from './pizarra-functions/connection-handlers';
import { loadConnectionsIfNeeded } from './pizarra-functions/connection-loader';
import { autoConnectMisionToProyecto, autoConnectProyectoToMisiones } from './pizarra-functions/auto-connection';
import { navigateToCard, bringCardToFront, findCardByMisionId } from './pizarra-functions/navigation-utils';
import { handleActivityPlayPause, handleMisionPlayPause } from './pizarra-functions/play-pause-handlers';
import PizarraPermissionRequests from '@/app/components/PizarraPermissionRequests';
import { ToastProvider } from './contexts/ToastContext';

const TestPizarra = forwardRef<PizarraRef, PizarraProps>(({ onShowScreenshots, storagePrefix = 'real', lightMode = false, fullMode = false, viewingUserId, onOpenUserChat, usuarios, currentUserId, onConnectionCreate, onOpenCapturasModal, isOrganizacionPizarra = false, readOnly = false, pizarraOrganizacion }, ref) => {
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
    loadViewingUserId(viewingUserId ?? null).then(setViewingUserNumericId);
  }, [viewingUserId]);

  // Debug: Verificar que el usuario esté cargado
  useEffect(() => {
    console.log('👤 Usuario en Pizarra:', usuario?.id, usuario?.email);
    if (isViewingOtherUser) {
      console.log('👁️ Viendo pizarra de otro usuario:', viewingUserId, '(ID numérico:', viewingUserNumericId, ')');
    }
  }, [usuario, viewingUserId, isViewingOtherUser, viewingUserNumericId]);

  // Hooks de Supabase - Cargar pizarra del usuario automáticamente
  // NO cargar si es pizarra de organización (ya viene precargada)
  const { pizarra, loading: loadingPizarra, updatePanOffset, refetch: refetchPizarra } = usePizarra(
    isOrganizacionPizarra ? null : effectiveUserId
  );

  // Determinar qué pizarra usar: organización o personal
  const pizarraActual = isOrganizacionPizarra ? pizarraOrganizacion : pizarra;

  // Log para debug: mostrar qué pizarra se está usando
  useEffect(() => {
    if (isOrganizacionPizarra) {
      console.log('🏢 [PIZARRA] Modo ORGANIZACIÓN:', {
        pizarraOrganizacionId: pizarraOrganizacion?.id,
        pizarraOrganizacionCargada: !!pizarraOrganizacion,
        pizarraActualId: pizarraActual?.id
      });
    } else {
      console.log('👤 [PIZARRA] Modo PERSONAL:', {
        pizarraPersonalId: pizarra?.id,
        pizarraActualId: pizarraActual?.id,
        usuarioId: effectiveUserId
      });
    }
  }, [isOrganizacionPizarra, pizarraOrganizacion, pizarra, pizarraActual, effectiveUserId]);

  // Usar useCards con el ID de la pizarra actual (organización o personal)
  const { cards: cardsDB, loading: loadingCards, createCard, updateCard, deleteCard: deleteCardDB } = useCards(
    pizarraActual?.id || null,
    usuario?.userAuth || null, // Mantenido por compatibilidad
    effectiveUserId // Mantenido por compatibilidad
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

  // Estado para trackear usuarios agregados (evitar duplicados en llamadas rápidas)
  const addedUsersRef = useRef<Set<string>>(new Set());

  // Estado para trackear proyectos agregados (evitar duplicados en llamadas rápidas)
  const addedProyectosRef = useRef<Set<number>>(new Set());

  // Estado para trackear recursos agregados (evitar duplicados en llamadas rápidas)
  const addedRecursosRef = useRef<Set<number>>(new Set());

  // Ref para trackear el ID de la pizarra actual y detectar cambios
  const currentPizarraIdRef = useRef<string | null>(null);

  const [cards, setCards] = useState<Card[]>([]);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [editingTodo, setEditingTodo] = useState<{ cardId: string, todoId: number } | null>(null);
  const [configOpenCard, setConfigOpenCard] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [cardZIndices, setCardZIndices] = useState<{ [cardId: string]: number }>({});
  const [maxZIndex, setMaxZIndex] = useState(1);

  // Estado de zoom (1 = 100%)
  const [zoomLevel, setZoomLevel] = useState(1);
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 2;
  const ZOOM_STEP = 0.1;

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
  const [imageWindows, setImageWindows] = useState<ImageWindow[]>([]);

  // Función para abrir una ventana de imagen
  const openImageWindow = useCallback(async (imageUrl: string, title: string) => {
    const newWindow = await createImageWindow(imageUrl, title);
    if (newWindow) {
      setImageWindows(prev => [...prev, newWindow]);
    }
  }, []);

  // Función para cerrar una ventana de imagen
  const closeImageWindow = useCallback((id: string) => {
    setImageWindows(prev => removeImageWindow(prev, id));
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
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).pizarraCaptureNow;
      }
    };
  }, [captureNow]);

  // Detectar cambios de pizarra y limpiar cards cuando se cambia entre pizarras
  useEffect(() => {
    const nuevaPizarraId = pizarraActual?.id || null;
    const pizarraAnteriorId = currentPizarraIdRef.current;

    // Si cambió el ID de la pizarra (y no es la primera carga)
    if (pizarraAnteriorId !== null && nuevaPizarraId !== pizarraAnteriorId) {
      console.log('🔄 [PIZARRA] Cambio de pizarra detectado:', {
        pizarraAnterior: pizarraAnteriorId,
        pizarraNueva: nuevaPizarraId,
        cardsActuales: cards.length
      });

      // Limpiar cards del estado (las conexiones se limpiarán automáticamente al cargar)
      setCards([]);

      // Resetear inicialización para forzar nueva sincronización
      setIsInitialized(false);

      console.log('✅ [PIZARRA] Estado limpiado para nueva pizarra');
    }

    // Actualizar ref con el ID actual
    currentPizarraIdRef.current = nuevaPizarraId;
  }, [pizarraActual?.id]);

  // Sincronizar cardsDB con cards (PARA PIZARRAS PERSONALES Y DE ORGANIZACIÓN)
  useEffect(() => {
    const pizarraParaLog = isOrganizacionPizarra ? pizarraOrganizacion : pizarra;

    console.log('🔍 [PIZARRA] useEffect sincronización disparado:', {
      esOrganizacion: isOrganizacionPizarra,
      hasPizarra: !!pizarraParaLog,
      pizarraId: pizarraParaLog?.id,
      cardsDBLength: cardsDB?.length || 0,
      cardsLocalLength: cards.length,
      isViewingOtherUser,
      isInitialized,
      usuario: usuario?.email
    });

    const performSync = async () => {
      // Verificar si debe sincronizar (usar pizarraActual para que funcione con org y personal)
      const shouldSync = shouldSyncFromDB({
        pizarra: pizarraActual,
        cardsDB,
        cardsLocal: cards,
        isViewingOtherUser,
        isInitialized
      });
      console.log('🔍 [PIZARRA] shouldSyncFromDB retornó:', shouldSync);

      if (!shouldSync) {
        // Marcar como inicializado incluso si no hay cards que sincronizar
        if (!isInitialized && pizarraActual) {
          console.log('✅ [PIZARRA] Marcando pizarra como inicializada (sin cards en DB)');
          setIsInitialized(true);
        }
        return;
      }

      console.log('🔄 [PIZARRA] Iniciando sincronización de cards desde Supabase...');

      // Sincronizar cards desde DB
      const mappedCards = await syncCardsFromDB({
        cardsDB: cardsDB!,
        usuario,
        isViewingOtherUser,
        onUpdatePastedImages: (cardId, imageUrl) => {
          setPastedImages(prev => ({
            ...prev,
            [cardId]: imageUrl
          }));
        }
      });

      const logPrefix = isViewingOtherUser ? '[PIZARRA COMPARTIDA]' : '[PIZARRA SYNC]';
      console.log(`✅ ${logPrefix} ${mappedCards.length} cards sincronizadas desde Supabase`);
      console.log(`🔄 [PIZARRA] Cards ANTES de setCards:`, cards.length);
      console.log(`🔄 [PIZARRA] Cards DESPUÉS de syncCardsFromDB:`, mappedCards.length);

      setCards(mappedCards);

      console.log(`✅ [PIZARRA] setCards() ejecutado con ${mappedCards.length} cards`);

      // Marcar como inicializado después de la primera sincronización
      if (!isInitialized) {
        console.log('✅ [PIZARRA] Marcando pizarra como inicializada');
        setIsInitialized(true);
      }
    };

    performSync();
  }, [cardsDB, pizarraActual, usuario, isViewingOtherUser, isInitialized, isOrganizacionPizarra]);

  // Sincronizar ref de usuarios agregados con el estado de cards
  useEffect(() => {
    const currentUserIds = new Set(
      cards
        .filter(card => card.type === 'usuario' && card.usuarioData?.userId)
        .map(card => card.usuarioData!.userId)
    );
    addedUsersRef.current = currentUserIds;
  }, [cards]);

  // Sincronizar ref de proyectos agregados con el estado de cards
  useEffect(() => {
    const currentProyectoIds = new Set(
      cards
        .filter(card => (card.type === 'proyecto' || card.type === 'proyecto-organizacion') && card.proyectoData?.id)
        .map(card => card.proyectoData!.id!)
    );
    addedProyectosRef.current = currentProyectoIds;
  }, [cards]);

  // Sincronizar ref de recursos agregados con el estado de cards
  useEffect(() => {
    const currentRecursoIds = new Set(
      cards
        .filter(card => card.type === 'resource' && card.recursoData?.id)
        .map(card => card.recursoData!.id!)
    );
    addedRecursosRef.current = currentRecursoIds;
  }, [cards]);

  // Callback personalizado para detectar conexión nota-proyecto y recurso-proyecto
  const handleInternalConnectionCreate = useCallback(async (connection: Connection, fromCard: Card, toCard: Card) => {
    await handleConnectionCreate({
      connection,
      fromCard,
      toCard,
      onConnectionCreate
    });
  }, [onConnectionCreate]);


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

  // Wrapper para deleteConnection que también limpia el tracking, actualiza notas del proyecto y recursos
  const deleteConnection = useCallback(async (connectionId: string) => {
    await handleConnectionDelete({
      connectionId,
      connections,
      cards,
      autoConnectionsRef,
      baseDeleteConnection
    });
  }, [baseDeleteConnection, connections, cards]);

  // Cargar conexiones desde Supabase cuando se visualiza la pizarra de otro usuario O pizarra de organización
  useEffect(() => {
    const performLoad = async () => {
      // Determinar qué pizarra usar
      const pizarraParaCargar = isOrganizacionPizarra ? pizarraOrganizacion : pizarra;

      // Cargar si está viendo pizarra ajena O es pizarra de organización
      const debeCargar = isViewingOtherUser || isOrganizacionPizarra;

      if (debeCargar && pizarraParaCargar) {
        console.log('🔗 Cargando conexiones desde BD para pizarra:', {
          esOrganizacion: isOrganizacionPizarra,
          esAjena: isViewingOtherUser,
          pizarraId: pizarraParaCargar.id
        });

        try {
          const { supabase } = await import('@/infrastructure/services/SupabaseClient');

          console.log('🔗 Cargando conexiones de pizarra:', pizarraParaCargar.id);

          const { data: connectionesEnBD, error } = await supabase
            .from('card_connections')
            .select('*')
            .eq('id_pizarra', pizarraParaCargar.id);

          if (error) {
            console.error('❌ Error cargando conexiones:', error);
          } else {
            const mappedConnections = (connectionesEnBD || []).map((connDB: any) => ({
              id: connDB.connection_id,
              from: connDB.from_card_id || undefined,
              to: connDB.to_card_id
            }));

            console.log('✅ Conexiones cargadas desde BD:', mappedConnections.length);
            setConnections(mappedConnections);
          }
        } catch (error) {
          console.error('❌ Error cargando conexiones:', error);
        }
      } else {
        console.log('📦 Usando conexiones de LocalStorage (pizarra propia)');
      }
    };

    performLoad();
  }, [pizarra, pizarraOrganizacion, setConnections, isViewingOtherUser, isOrganizacionPizarra]);

  const {
    isPanning,
    panOffset,
    setPanOffset,
    handleCanvasMouseDown: baseHandleCanvasMouseDown,
    handleGlobalMouseMove: panGlobalMouseMove,
    handleMouseUp: panHandleMouseUp,
    setCanvasRef
  } = useCanvasPan(isConnecting, zoomLevel);

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
  // El prop readOnly ya tiene en cuenta si puede editar o no (incluyendo permisos)
  usePasteImage(cards, setCards, panOffset, canvasRef, setPastedImages, readOnly);

  // Función para auto-conectar una misión a su proyecto (llamada desde drop)
  const autoConnectMisionToProyectoWrapper = useCallback(async (misionCardId: string, misionId: number) => {
    await autoConnectMisionToProyecto({
      misionCardId,
      misionId,
      cards,
      connections,
      autoConnectionsRef,
      onAddConnection: (connection) => setConnections(prev => [...prev, connection])
    });
  }, [cards, connections, setConnections]);

  // Función para conectar un proyecto con todas las misiones existentes que le pertenecen
  const autoConnectProyectoToMisionesWrapper = useCallback(async (proyectoCardId: string, proyectoId: number) => {
    await autoConnectProyectoToMisiones({
      proyectoCardId,
      proyectoId,
      cards,
      connections,
      autoConnectionsRef,
      onAddConnections: (conns) => setConnections(prev => [...prev, ...conns])
    });
  }, [cards, connections, setConnections]);

  const bringCardToFrontWrapper = useCallback((cardId: string) => {
    bringCardToFront({
      cardId,
      currentMaxZIndex: maxZIndex,
      setCardZIndices,
      setMaxZIndex
    });
  }, [maxZIndex]);

  const navigateToCardWrapper = useCallback((cardId: string) => {
    navigateToCard({
      cardId,
      cards,
      canvasRef,
      setPanOffset,
      bringToFront: bringCardToFrontWrapper
    });
  }, [cards, setPanOffset, bringCardToFrontWrapper]);

  // Función para buscar un card por id_mision
  const findCardByMisionIdWrapper = useCallback((misionId: number): string | null => {
    return findCardByMisionId(cards, misionId);
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

  // Funciones de zoom
  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);

  // Handler para Ctrl+Scroll zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoomLevel(prev => Math.min(Math.max(prev + delta, MIN_ZOOM), MAX_ZOOM));
    }
  }, []);

  // Registrar evento wheel para zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  const {
    draggedCard,
    draggedMisionId,
    handleCardMouseDown,
    handleGlobalMouseMove: dragGlobalMouseMove,
    handleMouseUp: dragHandleMouseUp
  } = useCardDrag(cards, setCards, panOffset, isConnecting, canvasRef, zoomLevel);

  const {
    resizingCard,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd
  } = useCardResize(cards, setCards, zoomLevel);

  // LocalStorage para persistencia - SOLO para pizarra propia, NO para pizarras compartidas
  const localStorageHookResult = usePizarraLocalStorage(
    isViewingOtherUser ? [] : cards, // No guardar cards de otros usuarios
    isViewingOtherUser ? [] : connections, // No guardar conexiones de otros usuarios
    isViewingOtherUser ? { x: 0, y: 0 } : panOffset, // No guardar panOffset de otros usuarios
    isViewingOtherUser ? () => {} : setCards, // No setear cards si es otro usuario
    isViewingOtherUser ? () => {} : setConnections, // No setear conexiones si es otro usuario
    isViewingOtherUser ? () => {} : setPanOffset, // No setear panOffset si es otro usuario
    storagePrefix,
    isOrganizacionPizarra, // Pasar la prop para pizarras de organización
    isInitialized // Pasar estado de inicialización
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

  // Helper para actualizar cards desde funciones externas
  const updateCardData = useCallback((cardId: string, updates: any) => {
    setCards(prev => prev.map(c => {
      if (c.id === cardId) {
        // Hacer merge profundo para misionData y activityData
        const mergedCard = { ...c, ...updates };

        // Si updates tiene misionData, hacer merge con el misionData existente
        if (updates.misionData && c.misionData) {
          mergedCard.misionData = {
            ...c.misionData,
            ...updates.misionData
          };
        }

        // Si updates tiene activityData, hacer merge con el activityData existente
        if (updates.activityData && c.activityData) {
          mergedCard.activityData = {
            ...c.activityData,
            ...updates.activityData
          };
        }

        return mergedCard;
      }
      return c;
    }));
  }, []);

  // Funciones para actividades
  const handleActivityPlayPauseWrapper = useCallback(async (cardId: string, currentIsRunning: boolean) => {
    await handleActivityPlayPause({
      cardId,
      currentIsRunning,
      cards,
      isCapturing,
      usuario,
      startCapturing,
      stopCapturing,
      getOrCreateMisionActiva,
      updateRunningState,
      addCaptureUrl,
      onUpdateCard: updateCardData
    });
  }, [cards, isCapturing, usuario, startCapturing, stopCapturing, getOrCreateMisionActiva, updateRunningState, addCaptureUrl, updateCardData]);


  // Funciones para misiones
  const handleMisionPlayPauseWrapper = useCallback(async (cardId: string, currentIsRunning: boolean) => {
    await handleMisionPlayPause({
      cardId,
      currentIsRunning,
      cards,
      isCapturing,
      usuario,
      startCapturing,
      stopCapturing,
      getOrCreateMisionActiva,
      updateRunningState,
      addCaptureUrl,
      onUpdateCard: updateCardData
    });
  }, [cards, isCapturing, usuario, startCapturing, stopCapturing, getOrCreateMisionActiva, updateRunningState, addCaptureUrl, updateCardData]);


  // Funciones para todos
  const toggleTodo = useCallback(async (cardId: string, todoId: number) => {
    // Buscar la card y crear versión actualizada ANTES de setCards
    const targetCard = cards.find(c => c.id === cardId);
    let updatedCard: Card | null = null;

    if (targetCard && targetCard.todos) {
      updatedCard = {
        ...targetCard,
        todos: targetCard.todos.map(todo =>
          todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
        )
      };
    }

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

    // Disparar evento de actualización con los datos precalculados
    if (updatedCard) {
      console.log('[TODO UPDATE] Disparando evento todo-actualizado (toggle)', { cardId, updatedCard });
      window.dispatchEvent(new CustomEvent('todo-actualizado', {
        detail: {
          cardId,
          card: updatedCard
        }
      }));
    }

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
    // Buscar la card y crear versión actualizada ANTES de setCards
    const targetCard = cards.find(c => c.id === cardId);
    const newTodoId = targetCard?.todos && targetCard.todos.length > 0 ? Math.max(...targetCard.todos.map(t => t.id)) + 1 : 1;
    let updatedCard: Card | null = null;

    if (targetCard && targetCard.todos) {
      updatedCard = {
        ...targetCard,
        todos: [...targetCard.todos, {
          id: newTodoId,
          text,
          completed: false
        }]
      };
    }

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

    // Disparar evento de actualización con los datos precalculados
    if (updatedCard) {
      console.log('[TODO UPDATE] Disparando evento todo-actualizado (add)', { cardId, updatedCard });
      window.dispatchEvent(new CustomEvent('todo-actualizado', {
        detail: {
          cardId,
          card: updatedCard
        }
      }));
    }

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
    // Buscar la card y crear versión actualizada ANTES de setCards
    const targetCard = cards.find(c => c.id === cardId);
    let updatedCard: Card | null = null;

    if (targetCard && targetCard.todos) {
      updatedCard = {
        ...targetCard,
        todos: targetCard.todos.filter(todo => todo.id !== todoId)
      };
    }

    // Actualizar estado local inmediatamente
    setCards(prev => prev.map(card =>
      card.id === cardId && card.todos
        ? { ...card, todos: card.todos.filter(todo => todo.id !== todoId) }
        : card
    ));

    // Disparar evento de actualización con los datos precalculados
    if (updatedCard) {
      console.log('[TODO UPDATE] Disparando evento todo-actualizado (delete)', { cardId, updatedCard });
      window.dispatchEvent(new CustomEvent('todo-actualizado', {
        detail: {
          cardId,
          card: updatedCard
        }
      }));
    }

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
  }, [cards]);

  const updateTodoInCard = useCallback(async (cardId: string, todoId: number, newText: string) => {
    // Buscar la card y crear versión actualizada ANTES de setCards
    const targetCard = cards.find(c => c.id === cardId);
    let updatedCard: Card | null = null;

    if (targetCard && targetCard.todos) {
      updatedCard = {
        ...targetCard,
        todos: targetCard.todos.map(todo =>
          todo.id === todoId ? { ...todo, text: newText } : todo
        )
      };
    }

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

    // Disparar evento de actualización con los datos precalculados
    if (updatedCard) {
      console.log('[TODO UPDATE] Disparando evento todo-actualizado (update text)', { cardId, updatedCard });
      window.dispatchEvent(new CustomEvent('todo-actualizado', {
        detail: {
          cardId,
          card: updatedCard
        }
      }));
    }

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
  }, [cards]);

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
    // Buscar la card y crear versión actualizada ANTES de setCards
    const targetCard = cards.find(c => c.id === cardId);
    let updatedCard: Card | null = null;

    if (targetCard) {
      updatedCard = {
        ...targetCard,
        title: newTitle
      };
    }

    // Actualizar solo localmente (no guardar en Supabase automáticamente)
    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, title: newTitle } : card
    ));

    setEditingTitle(null);

    // Disparar evento de actualización si es un TODO
    if (updatedCard && updatedCard.type === 'todo') {
      console.log('[TODO UPDATE] Disparando evento todo-actualizado (title)', { cardId, updatedCard });
      window.dispatchEvent(new CustomEvent('todo-actualizado', {
        detail: {
          cardId,
          card: updatedCard
        }
      }));
    }

    // Disparar evento de actualización si es una NOTA (async para evitar conflictos de render)
    if (updatedCard && updatedCard.type === 'text') {
      queueMicrotask(() => {
        console.log('[NOTA UPDATE] Disparando evento nota-actualizado (title)', { cardId, updatedCard });
        window.dispatchEvent(new CustomEvent('nota-actualizado', {
          detail: {
            cardId,
            card: updatedCard
          }
        }));
      });
    }
  }, [cards]);

  const updateCardContent = useCallback(async (cardId: string, newContent: string) => {
    // Buscar la card y crear versión actualizada ANTES de setCards
    const targetCard = cards.find(c => c.id === cardId);
    let updatedCard: Card | null = null;

    if (targetCard) {
      updatedCard = {
        ...targetCard,
        content: newContent
      };
    }

    // Actualizar solo localmente (no guardar en Supabase automáticamente)
    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, content: newContent } : card
    ));

    // Disparar evento si es una NOTA (async para evitar conflictos de render)
    if (updatedCard && updatedCard.type === 'text') {
      queueMicrotask(() => {
        console.log('[NOTA UPDATE] Disparando evento nota-actualizado (content)', { cardId, card: updatedCard });
        window.dispatchEvent(new CustomEvent('nota-actualizado', {
          detail: { cardId, card: updatedCard }
        }));
      });
    }
  }, [cards]);

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

    // Disparar evento si se elimina un TODO card (async para evitar conflictos de render)
    if (cardToDelete?.type === 'todo') {
      queueMicrotask(() => {
        console.log('[TODO DELETE] Disparando evento card-eliminada para TODO:', cardId);
        window.dispatchEvent(new CustomEvent('card-eliminada', {
          detail: {
            cardId,
            cardType: 'todo'
          }
        }));
      });
    }

    // Disparar evento si se elimina una NOTA card (async para evitar conflictos de render)
    if (cardToDelete?.type === 'text') {
      queueMicrotask(() => {
        console.log('[NOTA DELETE] Disparando evento card-eliminada para NOTA:', cardId);
        window.dispatchEvent(new CustomEvent('card-eliminada', {
          detail: {
            cardId,
            cardType: 'text'
          }
        }));
      });
    }

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
    console.log('🔵 addUsuarioCard llamado:', userData.name, userData.userId);
    console.log('🔵 Ref actual antes de verificar:', Array.from(addedUsersRef.current));
    
    // Verificar primero en el ref (para llamadas rápidas)
    if (addedUsersRef.current.has(userData.userId)) {
      console.log('⚠️ Usuario ya está siendo agregado (ref):', userData.name, userData.userId);
      // Buscar el card existente y navegar a él
      const existingUserCard = cards.find(card => 
        card.type === 'usuario' && card.usuarioData?.userId === userData.userId
      );
      if (existingUserCard) {
        console.log('📍 Navegando al usuario existente:', existingUserCard.id);
        navigateToCardWrapper(existingUserCard.id);
      }
      return;
    }

    // Marcar como agregado en el ref INMEDIATAMENTE
    addedUsersRef.current.add(userData.userId);
    console.log('✅ Agregando usuario:', userData.name, 'UserID:', userData.userId);
    console.log('✅ Ref después de agregar:', Array.from(addedUsersRef.current));

    // Usar setCards con función updater para tener el estado más reciente
    setCards(prevCards => {
      // Verificar si ya existe en el estado actual
      const existingUserCard = prevCards.find(card => 
        card.type === 'usuario' && card.usuarioData?.userId === userData.userId
      );

      if (existingUserCard) {
        console.log('⚠️ Usuario ya existe en la pizarra (estado):', userData.name);
        // Remover del ref ya que no se agregó
        addedUsersRef.current.delete(userData.userId);
        // Navegar al card existente
        setTimeout(() => navigateToCardWrapper(existingUserCard.id), 0);
        return prevCards;
      }

      const existingIds = prevCards.map(card => card.id);

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
        x: centerX + randomOffset() - 140,
        y: centerY + randomOffset() - 200,
        width: 280,
        height: 400,
        fontSize: 18,
        zIndex: nextZIndex,
        usuarioData: {
          userId: userData.userId,
          name: userData.name || 'Usuario',
          avatar: userData.avatar || 'US',
          color: userData.color || 'bg-blue-500',
          online: userData.online || false,
          messages: []
        }
      };

      // Actualizar cardZIndices
      setCardZIndices(prev => ({ ...prev, [cardId]: nextZIndex }));

      return [...prevCards, newCard];
    });
  }, [cards, panOffset, canvasRef, getNextZIndex, navigateToCardWrapper]);

  const addProyectoCard = useCallback((proyectoData: {
    id: number;
    nombre: string;
    descripcion?: string | null;
    icono?: string | null;
    id_organizacion?: number | null;
    colors?: any;
    created_at?: string;
    github_url?: string | null;
    sitio_web_url?: string | null;
    tecnologias?: string[] | null;
  }, isOrganizacion: boolean = false) => {
    console.log('🔵 addProyectoCard llamado:', proyectoData.nombre, proyectoData.id);
    console.log('🔵 Ref actual antes de verificar:', Array.from(addedProyectosRef.current));
    
    // Verificar primero en el ref (para llamadas rápidas)
    if (addedProyectosRef.current.has(proyectoData.id)) {
      console.log('⚠️ Proyecto ya está siendo agregado (ref):', proyectoData.nombre, proyectoData.id);
      // Buscar el card existente y navegar a él
      const existingProyectoCard = cards.find(card => 
        (card.type === 'proyecto' || card.type === 'proyecto-organizacion') && 
        card.proyectoData?.id === proyectoData.id
      );
      if (existingProyectoCard) {
        console.log('📍 Navegando al proyecto existente:', existingProyectoCard.id);
        navigateToCardWrapper(existingProyectoCard.id);
      }
      return;
    }

    // Marcar como agregado en el ref INMEDIATAMENTE
    addedProyectosRef.current.add(proyectoData.id);
    console.log('✅ Agregando proyecto:', proyectoData.nombre, 'ID:', proyectoData.id);
    console.log('✅ Ref después de agregar:', Array.from(addedProyectosRef.current));

    // Usar setCards con función updater para tener el estado más reciente
    setCards(prevCards => {
      // Verificar si ya existe en el estado actual
      const existingProyectoCard = prevCards.find(card => 
        (card.type === 'proyecto' || card.type === 'proyecto-organizacion') && 
        card.proyectoData?.id === proyectoData.id
      );

      if (existingProyectoCard) {
        console.log('⚠️ Proyecto ya existe en la pizarra (estado):', proyectoData.nombre);
        // Remover del ref ya que no se agregó
        addedProyectosRef.current.delete(proyectoData.id);
        // Navegar al card existente
        setTimeout(() => navigateToCardWrapper(existingProyectoCard.id), 0);
        return prevCards;
      }

      const existingIds = prevCards.map(card => card.id);

      // Calcular el centro visible de la pizarra
      const canvasWidth = canvasRef.current?.clientWidth || 1000;
      const canvasHeight = canvasRef.current?.clientHeight || 800;
      const centerX = -panOffset.x + (canvasWidth / 2);
      const centerY = -panOffset.y + (canvasHeight / 2);

      // Agregar un pequeño offset aleatorio para que no se superpongan
      const randomOffset = () => (Math.random() - 0.5) * 100;

      const nextZIndex = getNextZIndex();
      const cardType = isOrganizacion ? 'proyecto-organizacion' : 'proyecto';
      const cardId = generateUniqueId(cardType, existingIds);

      const newCard = {
        id: cardId,
        type: cardType,
        title: proyectoData.nombre || 'Proyecto',
        content: proyectoData.descripcion || `Proyecto: ${proyectoData.nombre}`,
        x: centerX + randomOffset() - 175,
        y: centerY + randomOffset() - 250,
        width: 350,
        height: 500,
        fontSize: 14,
        zIndex: nextZIndex,
        proyectoData: {
          id: proyectoData.id,
          nombre: proyectoData.nombre || 'Proyecto',
          descripcion: proyectoData.descripcion || null,
          icono: proyectoData.icono || null,
          id_organizacion: proyectoData.id_organizacion || null,
          colors: proyectoData.colors || null,
          created_at: proyectoData.created_at,
          github_url: proyectoData.github_url || null,
          sitio_web_url: proyectoData.sitio_web_url || null,
          tecnologias: proyectoData.tecnologias || null
        }
      };

      // Actualizar cardZIndices
      setCardZIndices(prev => ({ ...prev, [cardId]: nextZIndex }));

      // Auto-conectar proyecto a sus misiones si existen en la pizarra
      if (proyectoData.id && autoConnectProyectoToMisionesWrapper && isOrganizacion) {
        console.log('🔗 [AUTO-CONEXIÓN] Iniciando auto-conexión para ProyectoCardOrganizacion...');
        setTimeout(() => autoConnectProyectoToMisionesWrapper(cardId, proyectoData.id), 0);
      }

      return [...prevCards, newCard];
    });
  }, [cards, panOffset, canvasRef, getNextZIndex, navigateToCardWrapper, autoConnectProyectoToMisionesWrapper]);

  const addRecursoCard = useCallback((recursoData: {
    id: number;
    name: string;
    resourceType: string;
    url?: string | null;
    icon?: string | null;
    color?: string;
  }) => {
    console.log('🔵 addRecursoCard llamado:', recursoData.name, recursoData.id);
    console.log('🔵 Ref actual antes de verificar:', Array.from(addedRecursosRef.current));
    
    // Verificar primero en el ref (para llamadas rápidas)
    if (addedRecursosRef.current.has(recursoData.id)) {
      console.log('⚠️ Recurso ya está siendo agregado (ref):', recursoData.name, recursoData.id);
      // Buscar el card existente y navegar a él
      const existingRecursoCard = cards.find(card => 
        card.type === 'resource' && card.recursoData?.id === recursoData.id
      );
      if (existingRecursoCard) {
        console.log('📍 Navegando al recurso existente:', existingRecursoCard.id);
        navigateToCardWrapper(existingRecursoCard.id);
      }
      return;
    }

    // Marcar como agregado en el ref INMEDIATAMENTE
    addedRecursosRef.current.add(recursoData.id);
    console.log('✅ Agregando recurso:', recursoData.name, 'ID:', recursoData.id);
    console.log('✅ Ref después de agregar:', Array.from(addedRecursosRef.current));

    // Usar setCards con función updater para tener el estado más reciente
    setCards(prevCards => {
      // Verificar si ya existe en el estado actual
      const existingRecursoCard = prevCards.find(card => 
        card.type === 'resource' && card.recursoData?.id === recursoData.id
      );

      if (existingRecursoCard) {
        console.log('⚠️ Recurso ya existe en la pizarra (estado):', recursoData.name);
        // Remover del ref ya que no se agregó
        addedRecursosRef.current.delete(recursoData.id);
        // Navegar al card existente
        setTimeout(() => navigateToCardWrapper(existingRecursoCard.id), 0);
        return prevCards;
      }

      const existingIds = prevCards.map(card => card.id);

      // Calcular el centro visible de la pizarra
      const canvasWidth = canvasRef.current?.clientWidth || 1000;
      const canvasHeight = canvasRef.current?.clientHeight || 800;
      const centerX = -panOffset.x + (canvasWidth / 2);
      const centerY = -panOffset.y + (canvasHeight / 2);

      // Agregar un pequeño offset aleatorio para que no se superpongan
      const randomOffset = () => (Math.random() - 0.5) * 100;

      const nextZIndex = getNextZIndex();
      const cardId = generateUniqueId('resource', existingIds);

      const newCard = {
        id: cardId,
        type: 'resource',
        title: recursoData.name,
        content: `Tipo: ${recursoData.resourceType}`,
        x: centerX + randomOffset() - 140,
        y: centerY + randomOffset() - 110,
        width: 280,
        height: 220,
        fontSize: 18,
        zIndex: nextZIndex,
        recursoData: {
          id: recursoData.id,
          name: recursoData.name,
          resourceType: recursoData.resourceType,
          url: recursoData.url || null,
          icon: recursoData.icon || null,
          color: recursoData.color || 'bg-blue-500'
        }
      };

      // Actualizar cardZIndices
      setCardZIndices(prev => ({ ...prev, [cardId]: nextZIndex }));

      return [...prevCards, newCard];
    });
  }, [cards, panOffset, canvasRef, getNextZIndex, navigateToCardWrapper]);

  // useDropHandler debe estar DESPUÉS de addUsuarioCard, addProyectoCard y addRecursoCard para poder usarlos
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
    autoConnectMisionToProyectoWrapper,
    autoConnectProyectoToMisionesWrapper,
    navigateToCardWrapper,
    findCardByMisionIdWrapper,
    addUsuarioCard,
    addProyectoCard,
    addRecursoCard
  );

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

  const addMisionCard = useCallback((misionData: {
    id_mision: number;
    title: string;
    description: string;
    hours: number;
    id_usuario?: number;
    id_creador?: string;
    position?: { x: number; y: number };
  }): string => {
    console.log('🎯 [addMisionCard] FUNCIÓN LLAMADA con datos:', misionData);

    const existingIds = cards.map(card => card.id);
    console.log('🎯 [addMisionCard] IDs existentes:', existingIds);

    let cardX: number, cardY: number;

    if (misionData.position) {
      // Si se proporciona una posición específica, usarla
      cardX = misionData.position.x;
      cardY = misionData.position.y;
      console.log('🎯 [addMisionCard] Usando posición proporcionada:', { x: cardX, y: cardY });
    } else {
      // Calcular el centro visible de la pizarra
      const canvasWidth = canvasRef.current?.clientWidth || 1000;
      const canvasHeight = canvasRef.current?.clientHeight || 800;
      const centerX = -panOffset.x + (canvasWidth / 2);
      const centerY = -panOffset.y + (canvasHeight / 2);

      // Agregar un pequeño offset aleatorio para que no se superpongan
      const randomOffset = () => (Math.random() - 0.5) * 100;

      cardX = centerX + randomOffset() - 140; // -140 para centrar la card (width/2)
      cardY = centerY + randomOffset() - 200; // -200 para centrar la card (height/2)
      console.log('🎯 [addMisionCard] Usando posición calculada:', { x: cardX, y: cardY });
    }

    const nextZIndex = getNextZIndex();
    const newCardId = generateUniqueId('mision', existingIds);
    console.log('🎯 [addMisionCard] Nuevo ID generado:', newCardId, 'zIndex:', nextZIndex);

    const newCard = {
      id: newCardId,
      type: 'mision' as const,
      title: misionData.title || 'Nuevo Ticket',
      content: `${misionData.hours}h - ${misionData.description || misionData.title}`,
      x: cardX,
      y: cardY,
      width: 280,
      height: 400,
      fontSize: 18,
      zIndex: nextZIndex, // Nuevo card aparece encima de todos
      misionData: {
        title: misionData.title,
        hours: misionData.hours,
        description: misionData.description || misionData.title,
        id_mision: misionData.id_mision,
        idCreador: misionData.id_creador,
        id_usuario: misionData.id_usuario?.toString()
      }
    };

    console.log('🎯 [addMisionCard] Card completa creada:', newCard);

    // Actualizar cardZIndices para que se renderice correctamente
    setCardZIndices(prev => ({ ...prev, [newCardId]: nextZIndex }));

    console.log('✅ [addMisionCard] Ticket card (tipo mision) creada en pizarra en posición:', { x: cardX, y: cardY });
    console.log('✅ [addMisionCard] Agregando card al estado...');
    setCards(prev => {
      const newCards = Array.isArray(prev) ? [...prev, newCard] : [newCard];
      console.log('✅ [addMisionCard] Cards después de agregar:', newCards.length, 'cards totales');
      return newCards;
    });
    return newCardId; // Retornar el ID del card creado
  }, [cards, panOffset, canvasRef, getNextZIndex]);

  const restoreCard = useCallback((cardData: any) => {
    const existingIds = cards.map(card => card.id);
    const newId = generateUniqueId(cardData.type || 'card', existingIds);

    // Manejar image_url de la DB -> imageUrl del frontend
    const imageUrl = cardData.image_url || cardData.imageUrl;

    // Construir el card restaurado con los datos correctos
    const restoredCard: Card = {
      id: newId,
      type: cardData.type,
      title: cardData.title || '',
      content: cardData.content || '',
      x: (cardData.x || generatePosition()) + 50,
      y: (cardData.y || generatePosition()) + 80,
      width: cardData.width || 200,
      height: cardData.height || 150,
      fontSize: cardData.font_size || cardData.fontSize || 14,
      zIndex: Date.now(),
      imageUrl: imageUrl
    };

    // Copiar todos si es una TodoCard
    if (cardData.type === 'todo' && cardData.todos) {
      restoredCard.todos = cardData.todos.map((todo: any) => ({
        id: todo.id,
        text: todo.text,
        completed: todo.completed
      }));
    }

    // Copiar proyectoData si es una ProjectCard
    if ((cardData.type === 'proyecto' || cardData.type === 'proyecto-organizacion') && cardData.proyectoData) {
      restoredCard.proyectoData = {
        id: cardData.proyectoData.id,
        nombre: cardData.proyectoData.nombre,
        descripcion: cardData.proyectoData.descripcion,
        icono: cardData.proyectoData.icono,
        id_organizacion: cardData.proyectoData.id_organizacion,
        colors: cardData.proyectoData.colors,
        created_at: cardData.proyectoData.created_at,
        github_url: cardData.proyectoData.github_url,
        sitio_web_url: cardData.proyectoData.sitio_web_url,
        tecnologias: cardData.proyectoData.tecnologias
      };
    }

    // Copiar misionData si es una MisionCard
    if ((cardData.type === 'mision' || cardData.type === 'mision-organizacion') && cardData.misionData) {
      restoredCard.misionData = { ...cardData.misionData };
    }

    // Copiar activityData si es una ActivityCard
    if (cardData.type === 'actividad' && cardData.activityData) {
      restoredCard.activityData = { ...cardData.activityData };
    }

    // Copiar usuarioData si es una UsuarioCard
    if (cardData.type === 'usuario' && cardData.usuarioData) {
      restoredCard.usuarioData = { ...cardData.usuarioData };
    }

    // Copiar recursoData si es una RecursoCard
    if (cardData.type === 'resource' && cardData.recursoData) {
      restoredCard.recursoData = { ...cardData.recursoData };
    }

    // Si es una imagen, actualizar pastedImages para que se muestre
    if (cardData.type === 'image' && imageUrl) {
      setPastedImages(prev => ({
        ...prev,
        [newId]: imageUrl
      }));
    }

    console.log('🔄 [restoreCard] Restaurando card:', {
      type: restoredCard.type,
      id: restoredCard.id,
      hasTodos: !!restoredCard.todos,
      todosCount: restoredCard.todos?.length,
      hasProyectoData: !!restoredCard.proyectoData
    });

    setCards(prev => [...prev, restoredCard]);
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
      console.log('💾 Guardando  en Supabase...');
      console.log('   - ID Usuario (UUID):', usuario.userAuth);
      console.log('   - Cards a guardar:', cards.length);

      // 1. Verificar/Obtener la pizarra del día
      console.log('   - Obteniendo pizarra del día...');
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');
      const SupabasePizarraRepository = (await import('@/infrastructure/datasource/SupabasePizarraRepository')).SupabasePizarraRepository;
      const pizarraRepo = new SupabasePizarraRepository();

      // Usar la pizarra ya cargada (pizarraActual del estado)
      if (!pizarraActual) {
        console.error('❌ No hay pizarra cargada');
        return false;
      }

      console.log('💾 [GUARDAR] Usando pizarra:', {
        pizarraId: pizarraActual.id,
        esOrganizacion: isOrganizacionPizarra,
        id_organizacion: pizarraActual.idOrganizacion || pizarraActual.id_organizacion,
        id_usuario: pizarraActual.id_usuario
      });

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
          // COMENTADO - tabla card_proyecto_notas no existe
          // if ((card.type === 'proyecto' || card.type === 'proyecto-organizacion') && card.proyectoData) {
          //   const { SupabaseCardProyectoNotaRepository } = await import('@/infrastructure/datasource/SupabaseCardProyectoNotaRepository');
          //   const cardProyectoNotaRepo = new SupabaseCardProyectoNotaRepository();
          //   const cardUUID = cardIdToUUID.get(card.id);
          //   if (!cardUUID) {
          //     console.error('❌ No se encontró UUID para card proyecto:', card.id);
          //     continue;
          //   }
          //   const notasExistentes = await cardProyectoNotaRepo.getByCardProyectoId(cardUUID);
          //   const notasExistentesIds = notasExistentes.map(n => n.id_card_nota);
          //   for (const notaExistente of notasExistentes) {
          //     if (!card.proyectoData.notas || !card.proyectoData.notas.includes(notaExistente.id_card_nota)) {
          //       await cardProyectoNotaRepo.delete(cardUUID, notaExistente.id_card_nota);
          //     }
          //   }
          //   if (card.proyectoData.notas && card.proyectoData.notas.length > 0) {
          //     for (let i = 0; i < card.proyectoData.notas.length; i++) {
          //       const notaCardId = card.proyectoData.notas[i];
          //       if (!notasExistentesIds.includes(notaCardId)) {
          //         await cardProyectoNotaRepo.create({
          //           id_card_proyecto: cardUUID,
          //           id_card_nota: notaCardId,
          //           position: i
          //         });
          //       }
          //     }
          //   }
          // }
        } else {
          // Crear nueva card
          const cardData = mapCardToCardDB(card, pizarraActual.id);
          console.log('📝 [CREAR CARD] Intentando crear card:', {
            card_id: card.id,
            type: card.type,
            pizarraId: pizarraActual.id,
            id_pizarra_en_cardData: cardData.id_pizarra
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
              const { data: updatedCard, error: updateError } = await supabase
                .from('cards')
                .update(cardData)
                .eq('id_pizarra', pizarraActual.id)
                .eq('card_id', card.id)
                .select()
                .single();

              if (updateError) {
                console.error('❌ Error actualizando card duplicada:', card.id, updateError);
                continue;
              } else {
                console.log('   ✏️ Card duplicada actualizada exitosamente:', card.id);

                // Para cards de tipo proyecto/proyecto-organizacion, asegurar que existe la relación card_proyectos
                if (updatedCard && (card.type === 'proyecto' || card.type === 'proyecto-organizacion') && card.proyectoData?.id) {
                  const { SupabaseCardProyectoRepository } = await import('@/infrastructure/datasource/SupabaseCardProyectoRepository');
                  const cardProyectoRepo = new SupabaseCardProyectoRepository();

                  // Verificar si ya existe la relación
                  const existingRelation = await cardProyectoRepo.getByCardId(updatedCard.id);

                  if (!existingRelation) {
                    // Crear la relación si no existe
                    await cardProyectoRepo.create({
                      id_card: updatedCard.id,
                      id_proyecto: card.proyectoData.id
                    });
                    console.log('✅ [PROYECTO-DUPLICADO] Relación card-proyecto creada para proyecto ID:', card.proyectoData.id);
                  } else {
                    console.log('ℹ️ [PROYECTO-DUPLICADO] Relación card-proyecto ya existe');
                  }
                }

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
            if (createdCard && (card.type === 'mision' || card.type === 'mision-organizacion') && card.misionData?.id_mision) {
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

            // Si es una card de tipo proyecto, crear la relación card-proyecto y las notas
            if (createdCard && (card.type === 'proyecto' || card.type === 'proyecto-organizacion') && card.proyectoData) {
              // 1. Crear la relación card-proyecto si tiene id de proyecto
              if (card.proyectoData.id) {
                const { SupabaseCardProyectoRepository } = await import('@/infrastructure/datasource/SupabaseCardProyectoRepository');
                const cardProyectoRepo = new SupabaseCardProyectoRepository();

                await cardProyectoRepo.create({
                  id_card: createdCard.id,
                  id_proyecto: card.proyectoData.id
                });
                console.log('✅ [PROYECTO] Relación card-proyecto creada para proyecto ID:', card.proyectoData.id);
              }

              // 2. Crear las relaciones con las notas
              // COMENTADO - tabla card_proyecto_notas no existe
              // if (card.proyectoData.notas && card.proyectoData.notas.length > 0) {
              //   const { SupabaseCardProyectoNotaRepository } = await import('@/infrastructure/datasource/SupabaseCardProyectoNotaRepository');
              //   const cardProyectoNotaRepo = new SupabaseCardProyectoNotaRepository();
              //   for (let i = 0; i < card.proyectoData.notas.length; i++) {
              //     const notaCardId = card.proyectoData.notas[i];
              //     await cardProyectoNotaRepo.create({
              //       id_card_proyecto: createdCard.id,
              //       id_card_nota: notaCardId,
              //       position: i
              //     });
              //   }
              //   console.log('✅ [PROYECTO] Relaciones con', card.proyectoData.notas.length, 'notas creadas');
              // }
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

      // Enviar mensaje de actualización si estamos editando la pizarra de otro usuario
      console.log('🔍 [GUARDAR] Verificando si enviar mensaje:', {
        isViewingOtherUser,
        userAuth: usuario?.userAuth,
        viewingUserId,
        sonDiferentes: usuario.userAuth !== viewingUserId
      });

      if (isViewingOtherUser && usuario?.userAuth && viewingUserId && usuario.userAuth !== viewingUserId) {
        try {
          console.log('📤 [GUARDAR] Enviando mensaje de actualización al dueño de la pizarra...');
          const { SupabaseMensajeRepository } = await import('@/infrastructure/datasource/SupabaseMensajeRepository');
          const mensajeRepo = new SupabaseMensajeRepository();
          await mensajeRepo.enviarMensaje(usuario.userAuth, viewingUserId, '~actualizapirazza');
          console.log('✅ [GUARDAR] Mensaje de actualización enviado');
        } catch (err) {
          console.error('❌ [GUARDAR] Error enviando mensaje de actualización:', err);
        }
      } else {
        console.log('⏭️ [GUARDAR] NO enviar mensaje porque no es pizarra ajena o falta info');
      }

      return true;
    } catch (error) {
      console.error('❌ Error guardando en Supabase:', error);
      return false;
    }
  }, [pizarraActual, usuario, cards, cardsDB, panOffset, updatePanOffset, createCard, updateCard, deleteCardDB, isInitialized, refetchPizarra, connections, saveHistorySnapshot, pizarraOrganizacion, isViewingOtherUser, viewingUserId]);

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

            // Para cards de tipo proyecto/proyecto-organizacion, asegurar que existe la relación card_proyectos
            if ((card.type === 'proyecto' || card.type === 'proyecto-organizacion') && card.proyectoData?.id) {
              const cardUUID = cardIdToUUID.get(card.id);
              if (cardUUID) {
                const { SupabaseCardProyectoRepository } = await import('@/infrastructure/datasource/SupabaseCardProyectoRepository');
                const cardProyectoRepo = new SupabaseCardProyectoRepository();

                // Verificar si ya existe la relación
                const existingRelation = await cardProyectoRepo.getByCardId(cardUUID);

                if (!existingRelation) {
                  // Crear la relación si no existe
                  await cardProyectoRepo.create({
                    id_card: cardUUID,
                    id_proyecto: card.proyectoData.id
                  });
                  console.log('✅ [ORG-PROYECTO] Relación card-proyecto creada para proyecto ID:', card.proyectoData.id);
                }
              }
            }
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

            // Crear relación card-proyecto si es card de tipo proyecto
            if ((card.type === 'proyecto' || card.type === 'proyecto-organizacion') && card.proyectoData?.id && insertedCard) {
              const { SupabaseCardProyectoRepository } = await import('@/infrastructure/datasource/SupabaseCardProyectoRepository');
              const cardProyectoRepo = new SupabaseCardProyectoRepository();

              await cardProyectoRepo.create({
                id_card: insertedCard.id,
                id_proyecto: card.proyectoData.id
              });
              console.log('✅ [ORG-PROYECTO-NUEVA] Relación card-proyecto creada para proyecto ID:', card.proyectoData.id);
            }
          }
        }
      }

      // 5. Guardar conexiones
      console.log('   - Guardando conexiones...');
      const { error: deleteConnectionsError } = await supabase
        .from('card_connections')
        .delete()
        .eq('id_pizarra', pizarraOrg.id);

      if (deleteConnectionsError) {
        console.error('❌ Error eliminando conexiones antiguas:', deleteConnectionsError);
      }

      for (const connection of connections) {
        const { error: insertError } = await supabase
          .from('card_connections')
          .insert({
            id_pizarra: pizarraOrg.id,
            connection_id: connection.id,
            from_card_id: connection.from || null,
            to_card_id: connection.to
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

  // Auto-guardado en Supabase cuando está activado
  useEffect(() => {
    // Log detallado para debugging
    console.log('🔍 [AUTO-SAVE CHECK]', {
      autoSave,
      hasUsuario: !!usuario,
      isInitialized,
      cardsLength: cards.length,
      isViewingOtherUser,
      readOnly
    });

    // No auto-guardar si está en modo solo lectura
    if (readOnly) {
      console.log('⏭️ [AUTO-SAVE] Saltando auto-guardado - modo solo lectura');
      return;
    }

    // No auto-guardar si estamos viendo la pizarra de otro usuario Y no tenemos permiso de edición
    // (Si readOnly === false, significa que tenemos permiso, por ejemplo admin en pizarra de org)
    if (isViewingOtherUser && readOnly !== false) {
      console.log('⏭️ [AUTO-SAVE] Saltando auto-guardado - viendo pizarra sin permiso de edición');
      return;
    }

    if (!autoSave) {
      console.log('⏭️ [AUTO-SAVE] Saltando auto-guardado - autoSave desactivado');
      return;
    }

    if (!usuario) {
      console.log('⏭️ [AUTO-SAVE] Saltando auto-guardado - no hay usuario');
      return;
    }

    if (!isInitialized) {
      console.log('⏭️ [AUTO-SAVE] Saltando auto-guardado - no inicializado');
      return;
    }

    if (cards.length === 0) {
      console.log('⏭️ [AUTO-SAVE] Saltando auto-guardado - no hay cards');
      return;
    }

    // Debounce para evitar guardados excesivos
    console.log(`⏰ [AUTO-SAVE] Programando auto-guardado en 2 segundos... (${cards.length} cards)`);
    const timeoutId = setTimeout(async () => {
      try {
        console.log('🔄 [AUTO-SAVE] Auto-guardado en Supabase iniciado...', {
          autoSave,
          usuario: !!usuario,
          isInitialized,
          isViewingOtherUser,
          readOnly,
          cardsCount: cards.length
        });
        const result = await saveToSupabase();
        if (result) {
          console.log('✅ [AUTO-SAVE] Auto-guardado completado exitosamente');
        } else {
          console.warn('⚠️ [AUTO-SAVE] Auto-guardado falló');
        }
      } catch (error) {
        console.error('❌ [AUTO-SAVE] Error en auto-guardado:', error);
      }
    }, 2000); // 2 segundos de debounce

    return () => {
      console.log('🧹 [AUTO-SAVE] Cancelando timeout de auto-guardado');
      clearTimeout(timeoutId);
    };
  }, [cards, connections, panOffset, autoSave, usuario, isInitialized, saveToSupabase, isViewingOtherUser, readOnly]);

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

  // Función para actualizar un card (parcial) - para uso desde refs externos
  const updateCardFromRef = useCallback((
    cardId: string,
    updates: Partial<Omit<Card, 'misionData' | 'proyectoData' | 'usuarioData' | 'activityData'>> & {
      misionData?: Partial<MisionData>;
      proyectoData?: Partial<ProyectoData>;
      usuarioData?: Partial<UsuarioData>;
      activityData?: Partial<ActivityData>;
    }
  ) => {
    console.log('🔄 [updateCardFromRef] Actualizando card:', { cardId, updates });

    setCards((prevCards: Card[]) => {
      return prevCards.map((c: Card) => {
        if (c.id === cardId) {
          console.log('✅ Card encontrado, aplicando actualizaciones');
          // Hacer merge profundo de datos anidados
          const result = { ...c, ...updates } as Card;

          if (updates.misionData && c.misionData) {
            result.misionData = { ...c.misionData, ...updates.misionData };
          }
          if (updates.proyectoData && c.proyectoData) {
            result.proyectoData = { ...c.proyectoData, ...updates.proyectoData };
          }
          if (updates.usuarioData && c.usuarioData) {
            result.usuarioData = { ...c.usuarioData, ...updates.usuarioData };
          }
          if (updates.activityData && c.activityData) {
            result.activityData = { ...c.activityData, ...updates.activityData };
          }

          return result;
        }
        return c;
      });
    });

    console.log('✅ [updateCardFromRef] Card actualizado');
  }, [setCards]);

  useImperativeHandle(ref, () => ({
    addNoteCard,
    addTodoCard,
    addUsuarioCard,
    addMisionCardOrganizacion,
    addMisionCard,
    restoreCard,
    clearStorage: clearLocalStorage,
    exportStorage: exportToJSON,
    importStorage: importFromJSON,
    saveToSupabase,
    loadFromSupabase,
    loadPizarraById,
    addConnection,
    removeConnectionBetween,
    centerOnCard: navigateToCardWrapper, // navigateToCard funciona como centerOnCard
    findCardByMisionId: findCardByMisionIdWrapper,
    updateCardId,
    updateCard: updateCardFromRef
  }), [addNoteCard, addTodoCard, addUsuarioCard, addMisionCardOrganizacion, addMisionCard, restoreCard, clearLocalStorage, exportToJSON, importFromJSON, saveToSupabase, loadFromSupabase, loadPizarraById, addConnection, removeConnectionBetween, navigateToCardWrapper, findCardByMisionIdWrapper, updateCardId, updateCardFromRef]);

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

  // ELIMINADO: Este useEffect establecía isInitialized=true demasiado pronto,
  // bloqueando la carga de cards desde Supabase al recargar la página.
  // isInitialized ahora solo se establece después de sincronizar cards desde DB (línea 199)


  return (
    <ToastProvider>
      <div
        className={`w-screen h-screen bg-transparent flex flex-col items-center justify-center p-8 ${isReceivingDrag ? 'z-50' : ''}`}
        data-pizarra-cards={cards.length}
      >
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
        {/* Controles de navegación y zoom */}
        <div
          className={`absolute z-[999] flex items-center gap-2 ${
            fullMode ? 'bottom-4 left-4' : 'top-4 left-4'
          }`}
          style={{ pointerEvents: 'auto' }}
        >
          {/* Botón ir al origen */}
          <button
            onClick={navigateToOrigin}
            className="bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-full p-2.5 shadow-lg border border-gray-300 hover:border-blue-400 transition-all duration-200 hover:scale-110 active:scale-95"
            title="Ir al origen (0,0)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="3" strokeWidth={2} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4M2 12h4m12 0h4" />
            </svg>
          </button>

          {/* Separador */}
          <div className="w-px h-6 bg-gray-300" />

          {/* Controles de zoom */}
          <div className="flex items-center bg-white rounded-full shadow-lg border border-gray-300 overflow-hidden">
            {/* Botón zoom out */}
            <button
              onClick={zoomOut}
              disabled={zoomLevel <= MIN_ZOOM}
              className="p-2.5 text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Alejar (Ctrl + Scroll ↓)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>

            {/* Indicador de zoom (clickeable para reset) */}
            <button
              onClick={resetZoom}
              className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors min-w-[52px]"
              title="Restablecer zoom a 100%"
            >
              {Math.round(zoomLevel * 100)}%
            </button>

            {/* Botón zoom in */}
            <button
              onClick={zoomIn}
              disabled={zoomLevel >= MAX_ZOOM}
              className="p-2.5 text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Acercar (Ctrl + Scroll ↑)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenedor con zoom aplicado */}
        <div
          className="absolute inset-0 select-none"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: '0 0',
          }}
          onMouseDown={(e) => {
            // Permitir que el pan funcione cuando se hace click en el fondo del contenedor de zoom
            if (e.target === e.currentTarget) {
              handleCanvasMouseDown(e as any);
            }
          }}
        >
          <ConnectionLines
            connections={connections}
            cards={cards}
            panOffset={panOffset}
            isConnecting={isConnecting}
            connectingFrom={connectingFrom}
            mousePosition={mousePosition}
            deleteConnection={deleteConnection}
            navigateToCard={navigateToCardWrapper}
            zoomLevel={zoomLevel}
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
            handleActivityPlayPause={handleActivityPlayPauseWrapper}
            handleMisionPlayPause={handleMisionPlayPauseWrapper}
            onShowScreenshots={onShowScreenshots}
            screenshots={screenshots}
            isCapturing={isCapturing}
            captureNow={captureNow}
            setCards={setCards}
            pastedImages={pastedImages}
            bringCardToFront={bringCardToFrontWrapper}
            onOpenUserChat={handleOpenUserChat}
            usuarios={usuarios}
            currentUserId={currentUserId}
            openImageWindow={openImageWindow}
            addTodoCard={addTodoCard}
            addNoteCard={addNoteCard}
            addConnection={addConnection}
            addMisionCardOrganizacion={addMisionCardOrganizacion}
            addMisionCard={addMisionCard}
            cards={cards}
            onOpenCapturasModal={onOpenCapturasModal}
            idPizarra={pizarraActual?.id || null}
            readOnly={readOnly || isViewingOtherUser}
          />
        ))}
        </div>
        {/* Fin del contenedor con zoom */}

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

        {/* Componente para ver solicitudes de permiso - SOLO en dashboard (no en fullMode) */}
        {!fullMode && <PizarraPermissionRequests />}

      </div>
    </ToastProvider>
  );
});

TestPizarra.displayName = 'TestPizarra';

export default TestPizarra;
export type { PizarraRef } from './types';
