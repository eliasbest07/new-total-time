import React, { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useScreenshots } from '@/hooks/useScreenshots';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, PizarraRef, TodoItem, ActivityData, MisionData } from './types';
import { usePizarra } from '@/hooks/usePizarra';
import { useCards } from '@/hooks/useCards';
import { useCardMision } from '@/hooks/useCardMision';
import { mapCardDBToCard, mapCardToCardDB } from './utils/cardMapper';
import { SupabaseCardMisionRepository } from '@/infrastructure/datasource/SupabaseCardMisionRepository';
import { SupabaseMisionRepository } from '@/infrastructure/datasource/SupabaseMisionRepository';

interface PizarraProps {
  onShowScreenshots?: (cardId: string) => void;
  storagePrefix?: string;
}
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

const TestPizarra = forwardRef<PizarraRef, PizarraProps>(({ onShowScreenshots, storagePrefix = 'real' }, ref) => {
  const { usuario } = useAuth();

  // Debug: Verificar que el usuario esté cargado
  useEffect(() => {
    console.log('👤 Usuario en Pizarra:', usuario?.id, usuario?.email);
  }, [usuario]);

  // Hooks de Supabase (deshabilitados para carga automática - solo se usan manualmente)
  // Pasamos null para que no cargue automáticamente
  const { pizarra, loading: loadingPizarra, updatePanOffset, refetch: refetchPizarra } = usePizarra(null);
  const { cards: cardsDB, loading: loadingCards, createCard, updateCard, deleteCard: deleteCardDB } = useCards(
    pizarra?.id || null
  );

  // Estado de inicialización
  const [isInitialized, setIsInitialized] = useState(false);

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
  } = useScreenshots();

  const { pastedImages, setPastedImages } = usePasteImage(setCards);

  const {
    connections,
    setConnections,
    isConnecting,
    connectingFrom,
    mousePosition,
    handleConnectionPointClick: baseHandleConnectionPointClick,
    handleCardClick,
    updateMousePosition,
    deleteConnection
  } = useConnections();

  const {
    isPanning,
    panOffset,
    setPanOffset,
    handleCanvasMouseDown: baseHandleCanvasMouseDown,
    handleGlobalMouseMove: panGlobalMouseMove,
    handleMouseUp: panHandleMouseUp
  } = useCanvasPan();

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
  } = useDropHandler(setCards, panOffset, canvasRef, cards);

  // LocalStorage para persistencia
  const {
    clearLocalStorage,
    exportToJSON,
    importFromJSON
  } = usePizarraLocalStorage(
    cards,
    connections,
    panOffset,
    setCards,
    setConnections,
    setPanOffset,
    storagePrefix
  );

  // Funciones para actividades
  const handleActivityPlayPause = useCallback(async (cardId: string, currentIsRunning: boolean) => {
    console.log('🎬 [PLAY/PAUSE] Botón presionado en tarjeta:', cardId);
    console.log('👤 [PLAY/PAUSE] Usuario logeado:', usuario);
    const newRunningState = !currentIsRunning;

    setCards(prev => prev.map(c =>
      c.id === cardId && c.activityData
        ? { ...c, activityData: { ...c.activityData, isRunning: newRunningState } }
        : c
    ));

    if (newRunningState && !isCapturing) {
      try {
        const card = cards.find(c => c.id === cardId);
        if (!card || !card.activityData) {
          console.error('❌ No se encontró la card o no tiene activityData');
          return;
        }

        const activityData = card.activityData;
        const actividadId = activityData.id_actividad || cardId.split('-')[1] || '1';
        // Usar el usuario logeado primero, luego el de la actividad, y finalmente un fallback
        const userId = usuario?.id || activityData.id_usuario || 'usuario-desconocido';
        const misionActividad = activityData.subject || card.title || 'Actividad sin nombre';

        console.log('📤 [PLAY/PAUSE] Iniciando captura con userId:', userId);
        console.log('📤 [PLAY/PAUSE] actividadId:', actividadId);

        await startCapturing({
          userId: userId,
          actividadId: actividadId,
          misionActividad: misionActividad,
          totalTrabajadoHoy: activityData.duration?.toString(),
          tiempoTareaActual: activityData.timeLeft?.toString()
        });
        console.log('✅ Captura iniciada exitosamente');
      } catch (error) {
        console.error('❌ Error:', error);
      }
    } else if (!newRunningState && isCapturing) {
      stopCapturing();
    }
  }, [cards, isCapturing, startCapturing, stopCapturing, usuario]);

  // Funciones para misiones
  const handleMisionPlayPause = useCallback(async (cardId: string, currentIsRunning: boolean) => {
    console.log('🎯 [MISION PLAY/PAUSE] Botón presionado en tarjeta:', cardId);
    console.log('👤 [MISION PLAY/PAUSE] Usuario logeado:', usuario);
    const newRunningState = !currentIsRunning;

    setCards(prev => prev.map(c =>
      c.id === cardId && c.misionData
        ? { ...c, misionData: { ...c.misionData, isRunning: newRunningState } }
        : c
    ));

    if (newRunningState && !isCapturing) {
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

        await startCapturing({
          userId: userId,
          actividadId: misionId,
          misionActividad: misionActividad,
          totalTrabajadoHoy: misionData.hours?.toString(),
          onCaptureUpdate: (url: string) => {
            // Actualizar la última captura en la card
            setCards(prev => prev.map(c =>
              c.id === cardId && c.misionData
                ? { ...c, misionData: { ...c.misionData, lastCaptureUrl: url } }
                : c
            ));
          }
        });
        console.log('✅ Captura de misión iniciada exitosamente');
      } catch (error) {
        console.error('❌ Error iniciando captura de misión:', error);
      }
    } else if (!newRunningState && isCapturing) {
      stopCapturing();
    }
  }, [cards, isCapturing, startCapturing, stopCapturing, usuario]);

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
          baseWidth = 250;
          baseHeight = 300;
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

    // Eliminar solo localmente (no eliminar de Supabase automáticamente)
    setCards(prev => prev.filter(card => card.id !== cardId));
    setConfirmDelete(null);
    setConfigOpenCard(null);
  }, [pastedImages, setPastedImages]);

  // Funciones públicas expuestas via ref
  const addNoteCard = useCallback((text: string) => {
    const existingIds = cards.map(card => card.id);
    const newCard = {
      id: generateUniqueId('note', existingIds),
      type: 'text',
      title: 'Nota',
      content: text.length > 100 ? text.substring(0, 100) + '...' : text,
      x: generatePosition(),
      y: generatePosition(),
      width: 200,
      height: 120,
      fontSize: 18
    };
    setCards(prev => [...prev, newCard]);
  }, [cards]);

  const addTodoCard = useCallback((text: string) => {
    const existingIds = cards.map(card => card.id);
    const newCard = {
      id: generateUniqueId('todo', existingIds),
      type: 'todo',
      title: 'Lista de Tareas',
      content: `Iniciado con: ${text}`,
      x: generatePosition(),
      y: generatePosition(),
      width: 250,
      height: 200,
      fontSize: 18,
      todos: [{ id: 1, text: text, completed: false }]
    };
    setCards(prev => [...prev, newCard]);
  }, [cards]);

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
      console.log('   - ID Usuario:', usuario.id);
      console.log('   - Cards a guardar:', cards.length);

      // 1. Verificar/Obtener la pizarra del día
      console.log('   - Obteniendo pizarra del día...');
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');
      const SupabasePizarraRepository = (await import('@/infrastructure/datasource/SupabasePizarraRepository')).SupabasePizarraRepository;
      const pizarraRepo = new SupabasePizarraRepository();

      // Obtener o crear la pizarra del día
      const pizarraActual = await pizarraRepo.getPizarraDelDia(usuario.id, new Date());

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
        .select('id')
        .eq('id_pizarra', pizarraActual.id);

      if (cardsError) {
        console.error('❌ Error obteniendo cards de la BD:', cardsError);
        return false;
      }

      const currentCardsInDB = (cardsEnBD || []).map((c: any) => c.id);

      // 4. Eliminar cards que ya no existen localmente
      console.log('   - Eliminando cards obsoletas...');
      const cardsToDelete = currentCardsInDB.filter(dbCardId =>
        !cards.some(localCard => localCard.id === dbCardId)
      );

      for (const cardId of cardsToDelete) {
        const { error: deleteError } = await supabase
          .from('cards')
          .delete()
          .eq('id', cardId);

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
            .eq('id', card.id);

          if (updateError) {
            console.error('❌ Error actualizando card:', card.id, updateError);
          } else {
            console.log('   ✏️ Card actualizada:', card.id);
          }

          // Card existente - actualizar sus todos
          if (card.type === 'todo' && card.todos) {
            const { SupabaseCardTodoRepository } = await import('@/infrastructure/datasource/SupabaseCardTodoRepository');
            const cardTodoRepo = new SupabaseCardTodoRepository();

            // Obtener todos existentes
            const todosExistentes = await cardTodoRepo.getByCardId(card.id);
            const todosExistentesIds = todosExistentes.map(t => t.todo_id);

            // Eliminar todos que ya no existen
            for (const todoExistente of todosExistentes) {
              if (!card.todos.some(t => t.id === todoExistente.todo_id)) {
                await supabase
                  .from('card_todos')
                  .delete()
                  .eq('id_card', card.id)
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
                  .eq('id_card', card.id)
                  .eq('todo_id', todo.id);
              } else {
                // Crear nuevo todo
                await cardTodoRepo.create({
                  id_card: card.id,
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
          const cardData = mapCardToCardDB(card, pizarraActual.id);
          const { data: createdCard, error: createError } = await supabase
            .from('cards')
            .insert([cardData])
            .select()
            .single();

          if (createError) {
            console.error('❌ Error creando card:', card.id, createError);
          } else {
            console.log('   ➕ Card creada:', card.id);

            // Si es una misión, crear también su entrada en card_misiones
            if (createdCard && card.type === 'mision' && card.misionData?.id_mision) {
              const cardMisionRepo = new SupabaseCardMisionRepository();
              await cardMisionRepo.create({
                id_card: createdCard.id,
                id_mision: parseInt(card.misionData.id_mision),
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

      console.log('✅ Pizarra guardada exitosamente en Supabase');
      console.log('   - ID Pizarra:', pizarraActual.id);
      console.log('   - Cards guardadas:', cards.length);
      console.log('   - Conexiones guardadas:', connections.length);
      return true;
    } catch (error) {
      console.error('❌ Error guardando en Supabase:', error);
      return false;
    }
  }, [pizarra, usuario, cards, cardsDB, panOffset, updatePanOffset, createCard, updateCard, deleteCardDB, isInitialized, refetchPizarra, connections]);

  // Función manual para cargar desde Supabase
  const loadFromSupabase = useCallback(async () => {
    if (!usuario) {
      console.error('❌ No hay usuario para cargar');
      alert('❌ Error: No se ha iniciado sesión.');
      return;
    }

    console.log('📥 Cargando pizarra desde Supabase...');
    console.log('   - ID Usuario:', usuario.id);
    console.log('   - Usuario logeado:', usuario.getNombreCompleto());

    try {
      // 1. Obtener la pizarra del día
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');
      const SupabasePizarraRepository = (await import('@/infrastructure/datasource/SupabasePizarraRepository')).SupabasePizarraRepository;
      const pizarraRepo = new SupabasePizarraRepository();

      const pizarraActual = await pizarraRepo.getPizarraDelDia(usuario.id, new Date());

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
                id_mision: cardMision.id_mision.toString(),
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

  useImperativeHandle(ref, () => ({
    addNoteCard,
    addTodoCard,
    restoreCard,
    clearStorage: clearLocalStorage,
    exportStorage: exportToJSON,
    importStorage: importFromJSON,
    saveToSupabase,
    loadFromSupabase
  }), [addNoteCard, addTodoCard, restoreCard, clearLocalStorage, exportToJSON, importFromJSON, saveToSupabase, loadFromSupabase]);

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
          relative w-4/5 h-4/5
          border-4 border-dashed rounded-3xl
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
            setCards={setCards}
            pastedImages={pastedImages}
            bringCardToFront={bringCardToFront}
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
