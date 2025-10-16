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

  // Toggle para modo desarrollo (localStorage vs Supabase)
  const [useLocalStorage, setUseLocalStorage] = useState(true);

  // Hooks de Supabase (solo se usan si useLocalStorage es false)
  const { pizarra, loading: loadingPizarra, updatePanOffset } = usePizarra(useLocalStorage ? null : usuario?.id || null);
  const { cards: cardsDB, loading: loadingCards, createCard, updateCard, deleteCard: deleteCardDB } = useCards(
    useLocalStorage ? null : pizarra?.id || null
  );

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
  const toggleTodo = useCallback((cardId: string, todoId: number) => {
    setCards(prev => prev.map(card =>
      card.id === cardId && card.todos
        ? {
          ...card, todos: card.todos.map(todo =>
            todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
          )
        }
        : card
    ));
  }, []);

  const addTodoToCard = useCallback((cardId: string, text: string) => {
    setCards(prev => prev.map(card =>
      card.id === cardId && card.todos
        ? {
          ...card,
          todos: [...card.todos, {
            id: card.todos.length > 0 ? Math.max(...card.todos.map(t => t.id)) + 1 : 1,
            text,
            completed: false
          }]
        }
        : card
    ));
  }, []);

  const deleteTodoFromCard = useCallback((cardId: string, todoId: number) => {
    setCards(prev => prev.map(card =>
      card.id === cardId && card.todos
        ? { ...card, todos: card.todos.filter(todo => todo.id !== todoId) }
        : card
    ));
  }, []);

  const updateTodoInCard = useCallback((cardId: string, todoId: number, newText: string) => {
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
    // Actualizar localmente primero
    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, title: newTitle } : card
    ));

    // Si estamos en modo Supabase, actualizar en la BD
    if (!useLocalStorage && pizarra) {
      try {
        await updateCard(cardId, { title: newTitle });
        console.log('Titulo actualizado en Supabase');
      } catch (error) {
        console.error('Error actualizando titulo en Supabase:', error);
      }
    }

    setEditingTitle(null);
  }, [useLocalStorage, pizarra, updateCard]);

  const updateCardContent = useCallback(async (cardId: string, newContent: string) => {
    // Actualizar localmente primero
    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, content: newContent } : card
    ));

    // Si estamos en modo Supabase, actualizar en la BD
    if (!useLocalStorage && pizarra) {
      try {
        await updateCard(cardId, { content: newContent });
        console.log('Contenido actualizado en Supabase');
      } catch (error) {
        console.error('Error actualizando contenido en Supabase:', error);
      }
    }
  }, [useLocalStorage, pizarra, updateCard]);

  const deleteCard = useCallback(async (cardId: string) => {
    if (pastedImages[cardId]) {
      URL.revokeObjectURL(pastedImages[cardId]);
      setPastedImages(prev => {
        const newImages = { ...prev };
        delete newImages[cardId];
        return newImages;
      });
    }

    // Si estamos en modo Supabase, eliminar de la BD
    if (!useLocalStorage && pizarra) {
      try {
        await deleteCardDB(cardId);
        console.log('Card eliminada de Supabase:', cardId);
      } catch (error) {
        console.error('Error eliminando card de Supabase:', error);
      }
    }

    setCards(prev => prev.filter(card => card.id !== cardId));
    setConfirmDelete(null);
    setConfigOpenCard(null);
  }, [pastedImages, setPastedImages, useLocalStorage, pizarra, deleteCardDB]);

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

  useImperativeHandle(ref, () => ({
    addNoteCard,
    addTodoCard,
    clearStorage: clearLocalStorage,
    exportStorage: exportToJSON,
    importStorage: importFromJSON
  }), [addNoteCard, addTodoCard, clearLocalStorage, exportToJSON, importFromJSON]);

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

  // Effect: Cargar panOffset desde Supabase cuando cambia el modo o se carga la pizarra
  useEffect(() => {
    if (!useLocalStorage && pizarra) {
      console.log('🎨 Cargando panOffset desde Supabase:', pizarra.pan_offset_x, pizarra.pan_offset_y);
      setPanOffset({
        x: Number(pizarra.pan_offset_x) || 0,
        y: Number(pizarra.pan_offset_y) || 0
      });
    }
  }, [useLocalStorage, pizarra]);

  // Effect: Sincronizar panOffset con Supabase cuando cambia (con debounce)
  useEffect(() => {
    if (!useLocalStorage && pizarra) {
      const timeoutId = setTimeout(() => {
        updatePanOffset(panOffset.x, panOffset.y);
      }, 500); // Debounce de 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [panOffset, useLocalStorage, pizarra, updatePanOffset]);

  // Effect: Sincronizar nuevas cards con Supabase
  const previousCardsRef = useRef<Card[]>([]);
  useEffect(() => {
    const syncNewCards = async () => {
      if (!useLocalStorage && pizarra && cards.length > previousCardsRef.current.length) {
        // Encontrar las cards nuevas
        const newCards = cards.filter(card =>
          !previousCardsRef.current.some(prevCard => prevCard.id === card.id)
        );

        for (const card of newCards) {
          try {
            // Crear la card en Supabase
            const cardData = mapCardToCardDB(card, pizarra.id);
            const createdCard = await createCard(cardData);

            if (createdCard && card.type === 'mision' && card.misionData?.id_mision) {
              // Si es una misión, crear también su entrada en card_misiones
              const cardMisionRepo = new SupabaseCardMisionRepository();
              await cardMisionRepo.create({
                id_card: createdCard.id,
                id_mision: parseInt(card.misionData.id_mision),
                is_running: card.misionData.isRunning || false,
                last_capture_url: card.misionData.lastCaptureUrl || null
              });
              console.log('Card de mision y datos asociados creados en Supabase');
            }
          } catch (error) {
            console.error('Error creando card en Supabase:', error);
          }
        }
      }

      previousCardsRef.current = cards;
    };

    syncNewCards();
  }, [cards, useLocalStorage, pizarra, createCard]);

  // Effect: Cargar cards desde Supabase cuando cambia el modo
  useEffect(() => {
    const loadCardsFromSupabase = async () => {
      if (!useLocalStorage && cardsDB.length > 0) {
        console.log('Cargando', cardsDB.length, 'cards desde Supabase');

        const cardMisionRepo = new SupabaseCardMisionRepository();
        const misionRepo = new SupabaseMisionRepository();
        const mappedCards: Card[] = [];

        for (const cardDB of cardsDB) {
          // Mapear la card basica
          const card = mapCardDBToCard(cardDB);

          // Si es una card de tipo mision, cargar sus datos completos
          if (cardDB.type === 'mision') {
            try {
              const cardMision = await cardMisionRepo.getByCardId(cardDB.id);
              if (cardMision) {
                // Cargar la mision completa desde la tabla misiones
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

          mappedCards.push(card);
        }

        console.log('Cards mapeadas:', mappedCards.length);
        setCards(mappedCards);
      } else if (!useLocalStorage && cardsDB.length === 0) {
        console.log('No hay cards en Supabase para esta pizarra');
        setCards([]);
      }
    };

    loadCardsFromSupabase();
  }, [useLocalStorage, cardsDB]);

  return (
    <div className={`w-screen h-screen bg-transparent flex flex-col items-center justify-center p-8 ${isReceivingDrag ? 'z-50' : ''}`}>
      {/* Toggle de desarrollo */}
      <div className="mb-4 flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md">
        <span className="text-sm font-medium text-gray-700">💾 LocalStorage</span>
        <button
          onClick={() => setUseLocalStorage(!useLocalStorage)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            useLocalStorage ? 'bg-gray-400' : 'bg-green-600'
          }`}
          data-todo-interactive
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              useLocalStorage ? 'translate-x-1' : 'translate-x-6'
            }`}
          />
        </button>
        <span className="text-sm font-medium text-gray-700">☁️ Supabase</span>
        {!useLocalStorage && (loadingPizarra || loadingCards) && (
          <div className="ml-2 w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
        )}
      </div>

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
