import React, { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useScreenshots } from '@/hooks/useScreenshots';
import { Card, PizarraRef, TodoItem, ActivityData, MisionData } from './types/index';

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
    const newRunningState = !currentIsRunning;

    setCards(prev => prev.map(c =>
      c.id === cardId && c.activityData
        ? { ...c, activityData: { ...c.activityData, isRunning: newRunningState } }
        : c
    ));

    if (newRunningState && !isCapturing) {
      try {
        const actividadId = cardId.split('-')[1] || '1';
        // TODO: Replace the following with actual userId and misionActividad as needed
        await startCapturing({
          userId: 'demo-user', // reemplaza con el userId real
          actividadId: actividadId,
          misionActividad: 'demo-mision', // reemplaza con el misionActividad real
        });
        console.log('✅ Captura iniciada exitosamente');
      } catch (error) {
        console.error('❌ Error:', error);
      }
    } else if (!newRunningState && isCapturing) {
      stopCapturing();
    }
  }, [isCapturing, startCapturing, stopCapturing]);

  // Funciones para misiones
  const handleMisionPlayPause = useCallback(async (cardId: string, currentIsRunning: boolean) => {
    console.log('🎯 [MISION PLAY/PAUSE] Botón presionado en tarjeta:', cardId);
    const newRunningState = !currentIsRunning;

    setCards(prev => prev.map(c =>
      c.id === cardId && c.misionData
        ? { ...c, misionData: { ...c.misionData, isRunning: newRunningState } }
        : c
    ));

    if (newRunningState && !isCapturing) {
      try {
        const misionId = cardId.split('-')[1] || '1';
        await startCapturing({
          userId: 'demo-user',
          actividadId: misionId,
          misionActividad: 'mision-' + misionId,
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
  }, [isCapturing, startCapturing, stopCapturing]);

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

  const updateCardTitle = useCallback((cardId: string, newTitle: string) => {
    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, title: newTitle } : card
    ));
    setEditingTitle(null);
  }, []);

  const updateCardContent = useCallback((cardId: string, newContent: string) => {
    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, content: newContent } : card
    ));
  }, []);

  const deleteCard = useCallback((cardId: string) => {
    if (pastedImages[cardId]) {
      URL.revokeObjectURL(pastedImages[cardId]);
      setPastedImages(prev => {
        const newImages = { ...prev };
        delete newImages[cardId];
        return newImages;
      });
    }

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
export type { PizarraRef } from './types/index';
