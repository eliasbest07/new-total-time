import React, { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useScreenshots } from '@/hooks/useScreenshots';
import { Camera, X, Trash2 } from 'lucide-react';

// Función para generar IDs únicos consistentes entre servidor y cliente
let idCounter = 0;
const generateUniqueId = (prefix: string) => {
  return `${prefix}-${++idCounter}`;
};

// Función para generar posiciones consistentes
let positionCounter = 0;
const generatePosition = () => {
  positionCounter += 50;
  return (positionCounter % 300) + 100;
};

export interface PizarraRef {
  addNoteCard: (text: string) => void;
  addTodoCard: (text: string) => void;
}

export interface PizarraProps {
  onShowScreenshots?: (cardId: string) => void;
}

const TestPizarra = forwardRef<PizarraRef, PizarraProps>(({ onShowScreenshots }, ref) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isReceivingDrag, setIsReceivingDrag] = useState(false);
  interface TodoItem {
    id: number;
    text: string;
    completed: boolean;
  }

  interface ActivityData {
    subject: string;
    participants: { name: string; initial: string; color: string }[];
    date: string;
    time: string;
    duration: number; // en minutos
    isRunning: boolean;
    timeLeft: number; // en segundos
  }

  interface MisionData {
    title: string;
    hours: number;
    description: string;
  }

  interface Card {
    id: string;
    type: string;
    title: string;
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
    todos?: TodoItem[];
    fontSize?: number;
    activityData?: ActivityData;
    misionData?: MisionData;
  }

  const [cards, setCards] = useState<Card[]>([]);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Estados para el pan de la pizarra
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });




  // Estados para vínculos
  interface Connection {
    id: string;
    from: string | null;
    to: string;
  }

    const {
  screenshots,
  isCapturing,
  startCapturing,
  stopCapturing,
  clearScreenshots,
  reloadScreenshots,
  error: screenshotError
} = useScreenshots();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [editingTodo, setEditingTodo] = useState<{ cardId: string, todoId: number } | null>(null);
  const [configOpenCard, setConfigOpenCard] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [resizingCard, setResizingCard] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Función para formatear timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Funciones para drag and drop externo (archivos)
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    setIsReceivingDrag(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
      setIsReceivingDrag(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setIsReceivingDrag(false);

    if (!canvasRef.current) return;
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - panOffset.x;
    const y = e.clientY - rect.top - panOffset.y;

    // Manejar archivos
    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      files.forEach((file, index) => {
        const newCard = {
          id: generateUniqueId(`file-${index}`),
          type: 'file',
          title: (file as File).name,
          content: `Tamaño: ${((file as File).size / 1024).toFixed(2)} KB`,
          x: x + (index * 20),
          y: y + (index * 20),
          width: 200,
          height: 120
        };
        setCards(prev => [...prev, newCard]);
      });
    }

    // Manejar recursos del accordion y actividades
    const resourceData = e.dataTransfer.getData('application/json');
    if (resourceData) {
      try {
        const resource = JSON.parse(resourceData);
        if (resource.type === 'resource') {
          const newCard = {
            id: generateUniqueId('resource'),
            type: 'resource',
            title: resource.name,
            content: `Tipo: ${resource.resourceType}`,
            x: x,
            y: y,
            width: 180,
            height: 110,
            fontSize: 18
          };
          setCards(prev => [...prev, newCard]);
          return;
        } else if (resource.type === 'mision') {
          const newCard = {
            id: generateUniqueId('mision'),
            type: 'mision',
            title: resource.title || 'Nueva Misión',
            content: `${resource.hours}h - ${resource.description || resource.title}`,
            x: x,
            y: y,
            width: 250,
            height: 300,
            fontSize: 18,
            misionData: {
              title: resource.title || 'Nueva Misión',
              hours: resource.hours || 1,
              description: resource.description || resource.title
            }
          };
          setCards(prev => [...prev, newCard]);
          return;
        } else if (resource.type === 'actividad') {
          const newCard = {
            id: generateUniqueId('actividad'),
            type: 'actividad',
            title: resource.subject || 'Actividad',
            content: `Reunión: ${resource.subject}`,
            x: x,
            y: y,
            width: 300,
            height: 250,
            fontSize: 18,
            activityData: {
              subject: resource.subject || 'Reunión con cliente',
              participants: resource.participants || [
                { name: 'Elias M.', initial: 'EM', color: 'bg-blue-500' },
                { name: 'Juan P.', initial: 'JP', color: 'bg-green-500' },
                { name: 'María R.', initial: 'MR', color: 'bg-purple-500' }
              ],
              date: resource.date || '15 dic, 2025',
              time: resource.time || '2:30 PM - 3:30 PM',
              duration: resource.duration || 60,
              isRunning: false,
              timeLeft: (resource.duration || 60) * 60
            }
          };
          setCards(prev => [...prev, newCard]);
          return;
        }
      } catch (error) {
        console.log('No es un recurso JSON válido');
      }
    }

    // Manejar texto
    const text = e.dataTransfer.getData('text/plain');
    if (text && e.dataTransfer.files.length === 0) {
      const newCard = {
        id: generateUniqueId('text'),
        type: 'text',
        title: 'Texto',
        content: text.length > 50 ? text.substring(0, 50) + '...' : text,
        x: x,
        y: y,
        width: 200,
        height: 100
      };
      setCards(prev => [...prev, newCard]);
    }
  }, [panOffset]);

  // Funciones para mover cards dentro del canvas
  const handleCardMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, card: Card) => {
    // Si el click viene del botón de conexión, configuración, o elementos interactivos del todo, ignorarlo
    if ((e.target as HTMLElement).closest('[data-connection-button]') ||
      (e.target as HTMLElement).closest('[data-config-button]') ||
      (e.target as HTMLElement).closest('[data-todo-interactive]')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Si estamos en modo conexión, no permitir arrastrar
    if (isConnecting) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - panOffset.x - card.x;
    const offsetY = e.clientY - rect.top - panOffset.y - card.y;

    setDraggedCard(card.id);
    setDragOffset({ x: offsetX, y: offsetY });
    setIsPanning(false);
  }, [panOffset, isConnecting]);

  // Agrégala después de las funciones handleDrop, handleCardMouseDown, etc.
const handleActivityPlayPause = useCallback(async (cardId: string, currentIsRunning: boolean) => {
  console.log('🎬 [PLAY/PAUSE] Botón presionado en tarjeta:', cardId);
  console.log('📊 Estado actual:', { isRunning: currentIsRunning, isCapturing, cardId });

  const newRunningState = !currentIsRunning;
  console.log('🔄 Nuevo estado:', newRunningState);

  // Actualizar estado de la tarjeta
  setCards(prev => prev.map(c =>
    c.id === cardId && c.activityData
      ? { ...c, activityData: { ...c.activityData, isRunning: newRunningState } }
      : c
  ));

  if (newRunningState && !isCapturing) {
    console.log('▶️ Iniciando captura...');
    console.log('🌐 navigator.mediaDevices disponible:', !!navigator.mediaDevices);
    console.log('🎥 getDisplayMedia disponible:', !!navigator.mediaDevices?.getDisplayMedia);
    
    try {
      const actividadId = parseInt(cardId.split('-')[1]) || 1;
      await startCapturing(actividadId);
      console.log('✅ Captura iniciada exitosamente');
    } catch (error) {
      console.error('❌ Error:', error);
    }
  } else if (!newRunningState && isCapturing) {
    console.log('⏸️ Deteniendo captura');
    stopCapturing();
  }
}, [isCapturing, startCapturing, stopCapturing]);

  // Funciones para vínculos
  const handleConnectionPointClick = useCallback((e: React.MouseEvent<HTMLDivElement>, cardId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isConnecting) {
      // Iniciar conexión - capturar posición inicial del mouse
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
      setIsConnecting(true);
      setConnectingFrom(cardId);
    } else {
      // Completar conexión
      if (connectingFrom === cardId) {
        // Cancelar si es la misma card
        setIsConnecting(false);
        setConnectingFrom(null);
      } else {
        // Crear conexión
        const newConnection = {
          id: generateUniqueId('connection'),
          from: connectingFrom,
          to: cardId
        };
        setConnections(prev => [...prev, newConnection]);
        setIsConnecting(false);
        setConnectingFrom(null);
      }
    }
  }, [isConnecting, connectingFrom]);

  // Manejar click en cards durante modo conexión
  const handleCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>, cardId: string) => {
    // Solo actuar si estamos en modo conexión Y el click no viene de ningún botón
    if (isConnecting &&
      !(e.target as HTMLElement).closest('[data-connection-button]') &&
      !(e.target as HTMLElement).closest('[data-config-button]')) {
      e.preventDefault();
      e.stopPropagation();

      if (connectingFrom === cardId) {
        // Cancelar si es la misma card
        setIsConnecting(false);
        setConnectingFrom(null);
      } else {
        // Crear conexión
        const newConnection = {
          id: generateUniqueId('connection'),
          from: connectingFrom,
          to: cardId
        };
        setConnections(prev => [...prev, newConnection]);
        setIsConnecting(false);
        setConnectingFrom(null);
      }
    }
  }, [isConnecting, connectingFrom]);

  // Funciones para pan de la pizarra
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggedCard && e.target === e.currentTarget && !isConnecting) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    }
  }, [draggedCard, panOffset, isConnecting]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Los eventos globales se encargan del movimiento
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (draggedCard) {
      setDraggedCard(null);
      setDragOffset({ x: 0, y: 0 });
    }

    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
  }, [isPanning, draggedCard]);

  // Manejar eventos globales de mouse
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current) return;

    // Actualizar posición del mouse para el icono flotante
    if (isConnecting) {
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }

    if (isPanning) {
      const newPanX = e.clientX - panStart.x;
      const newPanY = e.clientY - panStart.y;
      setPanOffset({ x: newPanX, y: newPanY });
    } else if (draggedCard) {
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - panOffset.x - dragOffset.x;
      const newY = e.clientY - rect.top - panOffset.y - dragOffset.y;

      setCards(prev => prev.map(card =>
        card.id === draggedCard
          ? { ...card, x: newX, y: newY }
          : card
      ));
    }
  }, [isPanning, panStart, draggedCard, dragOffset, panOffset, isConnecting]);

  const handleGlobalMouseUp = useCallback(() => {
    if (isPanning || draggedCard) {
      handleMouseUp();
    }
  }, [isPanning, draggedCard, handleMouseUp]);

  useEffect(() => {
    if (isPanning || draggedCard || isConnecting) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isPanning, draggedCard, isConnecting, handleGlobalMouseMove, handleGlobalMouseUp]);

  // Funciones para resize de cards
  const handleResizeStart = useCallback((e: React.MouseEvent, cardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    setResizingCard(cardId);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: card.width,
      height: card.height
    });
  }, [cards]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingCard) return;

    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    const newWidth = Math.max(250, Math.min(600, resizeStart.width + deltaX));
    const newHeight = Math.max(200, Math.min(500, resizeStart.height + deltaY));

    setCards(prev => prev.map(card =>
      card.id === resizingCard
        ? { ...card, width: newWidth, height: newHeight }
        : card
    ));
  }, [resizingCard, resizeStart]);

  const handleResizeEnd = useCallback(() => {
    setResizingCard(null);
  }, []);

  // Efecto para manejar el resize
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

  // Función para obtener el centro de una card
  const getCardCenter = useCallback((card: Card) => {
    return {
      x: card.x + card.width / 2,
      y: card.y + card.height / 2
    };
  }, []);

  // Función para obtener la posición del botón rojo de una card
  const getCardButtonPosition = useCallback((card: Card) => {
    return {
      x: card.x + card.width - 4, // right-1 equivale a right: 4px
      y: card.y - 8 // -top-2 equivale a top: -8px
    };
  }, []);

  // Función para calcular el punto de intersección en el borde del card
  const getCardEdgePoint = useCallback((fromCard: Card, toX: number, toY: number) => {
    const centerX = fromCard.x + fromCard.width / 2;
    const centerY = fromCard.y + fromCard.height / 2;

    // Calcular el ángulo hacia el punto destino
    const dx = toX - centerX;
    const dy = toY - centerY;

    // Evitar división por cero
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
      return { x: centerX, y: centerY };
    }

    let edgeX, edgeY;

    // Calcular las intersecciones con los bordes del rectángulo
    const halfWidth = fromCard.width / 2;
    const halfHeight = fromCard.height / 2;

    // Normalizar la dirección
    const absRatioX = Math.abs(dx / halfWidth);
    const absRatioY = Math.abs(dy / halfHeight);

    if (absRatioX > absRatioY) {
      // La línea sale por el lado izquierdo o derecho
      edgeX = dx > 0 ? fromCard.x + fromCard.width : fromCard.x;
      edgeY = centerY + (dy * halfWidth) / Math.abs(dx);
    } else {
      // La línea sale por el lado superior o inferior
      edgeY = dy > 0 ? fromCard.y + fromCard.height : fromCard.y;
      edgeX = centerX + (dx * halfHeight) / Math.abs(dy);
    }

    return { x: edgeX, y: edgeY };
  }, []);

  // Componente para renderizar las líneas de conexión
  const ConnectionLines = () => {
    return (
      <svg
        className="absolute inset-0 pointer-events-none z-40 w-full h-full"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          overflow: 'visible'
        }}
      >
        {/* Líneas de conexión establecidas */}
        {connections.map(connection => {
          const fromCard = cards.find(card => card.id === connection.from);
          const toCard = cards.find(card => card.id === connection.to);

          if (!fromCard || !toCard) return null;

          // Calcular centros de los cards
          const toCenterX = toCard.x + toCard.width / 2;
          const toCenterY = toCard.y + toCard.height / 2;

          // Calcular puntos de borde
          const fromEdge = getCardEdgePoint(fromCard, toCenterX, toCenterY);
          const toEdge = getCardEdgePoint(toCard, fromEdge.x, fromEdge.y);

          return (
            <line
              key={connection.id}
              x1={fromEdge.x}
              y1={fromEdge.y}
              x2={toEdge.x}
              y2={toEdge.y}
              stroke="#000000"
              strokeWidth="3"
              markerEnd="url(#arrowhead)"
            />
          );
        })}

        {/* Línea temporal durante modo conexión */}
        {isConnecting && connectingFrom && (
          (() => {
            const fromCard = cards.find(card => card.id === connectingFrom);
            if (!fromCard) return null;

            // Calcular punto de salida en el borde del card hacia el cursor
            const cursorX = mousePosition.x - panOffset.x;
            const cursorY = mousePosition.y - panOffset.y;
            const fromEdge = getCardEdgePoint(fromCard, cursorX, cursorY);

            return (
              <line
                x1={fromEdge.x}
                y1={fromEdge.y}
                x2={cursorX}
                y2={cursorY}
                stroke="#000000"
                strokeWidth="3"
                opacity="1"
              />
            );
          })()
        )}

        {/* Definir marcador de flecha */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#000000"
            />
          </marker>
        </defs>
      </svg>
    );
  };

  // Componente separado para el input de tareas para evitar re-renders
  const TodoInput: React.FC<{
    cardId: string;
    onAddTodo: (cardId: string, text: string) => void;
    fontSize?: number;
  }> = React.memo(({ cardId, onAddTodo, fontSize = 18 }) => {
    const [localText, setLocalText] = useState('');

    const handleSubmit = useCallback(() => {
      if (localText.trim()) {
        onAddTodo(cardId, localText.trim());
        setLocalText('');
      }
    }, [cardId, localText, onAddTodo]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        handleSubmit();
      }
    }, [handleSubmit]);

    return (
      <div className="flex gap-1 mt-1 ml-0 mr-1" data-todo-interactive>
        <input
          type="text"
          placeholder="Nueva tarea..."
          value={localText}
          onChange={(e) => {
            e.stopPropagation();
            setLocalText(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onFocus={(e) => {
            e.stopPropagation();
          }}
          className="flex-1 px-2 py-1 border rounded focus:border-blue-400 focus:outline-none bg-white text-black"
          style={{ fontSize: `${Math.max(8, fontSize - 3)}px` }}
          data-todo-interactive
        />
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors flex items-center justify-center min-w-[20px]"
          style={{ fontSize: `${Math.max(8, fontSize - 3)}px` }}
          data-todo-interactive
        >
          +
        </button>
      </div>
    );
  });

  // Componente Card mejorado
  const Card: React.FC<{ card: Card }> = React.memo(({ card }) => {
      const cardScreenshots = screenshots.filter(s => {
    const actividadId = parseInt(card.id.split('-')[1]) || 0;
    return s.actividadId === actividadId;
  });
  
    const getCardIcon = () => {
      switch (card.type) {
        case 'file':
          return '📄';
        case 'text':
          return '📝';
        case 'test':
          return '🧪';
        case 'resource':
          return '📦';
        case 'image':
          return '🖼️';
        case 'link':
          return '🔗';
        case 'task':
          return '✅';
        case 'todo':
          return '📝';
        case 'actividad':
          return '📅';
        default:
          return '📋';
      }
    };

    const getCardStyle = () => {
      const baseStyle = "absolute rounded-lg shadow-lg border-2 p-2 cursor-move transition-colors duration-200 select-none";

      switch (card.type) {
        case 'file':
          return `${baseStyle} bg-blue-50 border-blue-200`;
        case 'text':
          return `${baseStyle} bg-yellow-50 border-yellow-200`;
        case 'test':
          return `${baseStyle} bg-green-50 border-green-200`;
        case 'resource':
          return `${baseStyle} bg-purple-50 border-purple-200`;
        case 'image':
          return `${baseStyle} bg-pink-50 border-pink-200`;
        case 'link':
          return `${baseStyle} bg-cyan-50 border-cyan-200`;
        case 'task':
          return `${baseStyle} bg-emerald-50 border-emerald-200`;
        case 'todo':
          return `${baseStyle} bg-orange-50 border-orange-200`;
        case 'actividad':
          return `${baseStyle} bg-blue-50 border-blue-300`;
        case 'mision':
          return `${baseStyle} bg-green-50 border-green-300`;
        default:
          return `${baseStyle} bg-white border-gray-200`;
      }
    };

    return (
      <div
        className={`
          ${getCardStyle()}
          ${draggedCard === card.id ? 'shadow-2xl border-blue-500 z-10' : ''}
          ${isConnecting && connectingFrom === card.id ? 'ring-4 ring-blue-400' : ''}
          ${hoveredCard === card.id ? 'ring-2 ring-gray-300' : ''}
        `}
        style={{
          left: card.x,
          top: card.y,
          width: card.width,
          height: card.height,
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`
        }}
        onMouseDown={(e) => handleCardMouseDown(e, card)}
        onMouseEnter={() => setHoveredCard(card.id)}
        onMouseLeave={() => setHoveredCard(null)}
        onClick={(e) => handleCardClick(e, card.id)}
      >
        
        {/* Resize handles */}
        <div 
          className="absolute -bottom-1 -right-1 w-4 h-4 bg-transparent hover:bg-gray-600 cursor-se-resize rounded-tl-lg hover:opacity-100 transition-all duration-200"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleResizeStart(e, card.id);
          }}
          data-todo-interactive
        />
        <div 
          className="absolute -top-1 -right-1 w-4 h-4 bg-transparent hover:bg-gray-600 cursor-ne-resize rounded-bl-lg hover:opacity-100 transition-all duration-200"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleResizeStart(e, card.id);
          }}
          data-todo-interactive
        />
        <div 
          className="absolute -top-1 -left-1 w-4 h-4 bg-transparent hover:bg-gray-600 cursor-nw-resize rounded-br-lg hover:opacity-100 transition-all duration-200"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleResizeStart(e, card.id);
          }}
          data-todo-interactive
        />
        <div 
          className="absolute -bottom-1 -left-1 w-4 h-4 bg-transparent hover:bg-gray-600 cursor-sw-resize rounded-tr-lg hover:opacity-100 transition-all duration-200"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleResizeStart(e, card.id);
          }}
          data-todo-interactive
        />
        {/* Top border line for all cards */}
        <div className={`absolute top-0 left-0 right-0 h-2 rounded-t-lg ${
          card.type === 'actividad' ? 'bg-blue-600' :
          card.type === 'mision' ? 'bg-green-600' :
          card.type === 'todo' ? 'bg-orange-600' :
          card.type === 'text' ? 'bg-yellow-500' :
          'bg-gray-600'
        }`}></div>

        {card.type === 'actividad' ? (
          <div className="flex flex-col h-full w-full p-3">
            {/* Header con icono y título */}
            <div className="flex items-center gap-2 mb-3 border-b border-blue-200 pb-2">
              <div style={{ fontSize: `${Math.max(16, (card.fontSize || 18) + 2)}px` }}>{getCardIcon()}</div>
              {editingTitle === card.id ? (
                <input
                  type="text"
                  defaultValue={card.title}
                  onBlur={(e) => updateCardTitle(card.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateCardTitle(card.id, e.currentTarget.value);
                    }
                    if (e.key === 'Escape') {
                      setEditingTitle(null);
                    }
                  }}
                  className="font-semibold text-blue-800 flex-1 bg-transparent border-b border-blue-400 focus:outline-none"
                  autoFocus
                  data-todo-interactive
                />
              ) : (
                <h3
                  className="font-semibold text-blue-800 truncate flex-1"
                  style={{ fontSize: `${card.fontSize || 18}px` }}
                >
                  {card.activityData?.subject || card.title}
                </h3>
              )}
            </div>

            {/* Fecha y hora */}
            <div className="mb-3">
              <div
                className="text-blue-700 font-medium"
                style={{ fontSize: `${(card.fontSize || 18) - 2}px` }}
              >
                📅 {card.activityData?.date || '15 dic, 2025'}
              </div>
              <div
                className="text-blue-600"
                style={{ fontSize: `${(card.fontSize || 18) - 3}px` }}
              >
                🕐 {card.activityData?.time || '2:30 PM - 3:30 PM'}
              </div>
            </div>

            {/* Participantes */}
            <div className="mb-3 flex-1">
              <div
                className="text-blue-700 font-medium mb-2"
                style={{ fontSize: `${(card.fontSize || 18) - 2}px` }}
              >
                👥 Participante:
              </div>
              <div className="flex flex-wrap gap-1">
                {(card.activityData?.participants || [
                  { name: 'Elias M.', initial: 'MM', color: 'bg-blue-500' },
                  { name: 'Juan P.', initial: 'JP', color: 'bg-green-500' },
                  { name: 'María R.', initial: 'MR', color: 'bg-purple-500' }
                ]).map((participant, index) => (
                  <div
                    key={index}
                    className={`${participant.color} text-white rounded-full flex items-center justify-center font-bold shadow-sm`}
                    style={{
                      width: `${Math.max(24, (card.fontSize || 18) + 6)}px`,
                      height: `${Math.max(24, (card.fontSize || 18) + 6)}px`,
                      fontSize: `${Math.max(8, (card.fontSize || 18) - 8)}px`
                    }}
                    title={participant.name}
                  >
                    {participant.initial}
                  </div>
                ))}
              </div>
            </div>

            {/* Timer y botones */}
            <div className="flex items-center justify-between bg-blue-100 rounded-lg p-2">
              <div
                className="text-blue-800 font-mono font-bold"
                style={{ fontSize: `${Math.max(14, (card.fontSize || 18))}px` }}
              >
                {card.activityData?.timeLeft
                  ? `${Math.floor(card.activityData.timeLeft / 60)}:${(card.activityData.timeLeft % 60).toString().padStart(2, '0')}`
                  : '22:59'
                }
              </div>
              <div className="flex gap-2">
                {/* Botón de screenshots */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onShowScreenshots?.(card.id);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white rounded-full p-2 transition-colors shadow-md relative"
                  data-todo-interactive
                  style={{
                    width: `${Math.max(32, (card.fontSize || 18) + 14)}px`,
                    height: `${Math.max(32, (card.fontSize || 18) + 14)}px`
                  }}
                >
                  <div style={{ fontSize: `${Math.max(12, (card.fontSize || 18) - 6)}px` }}>
                    📷
                  </div>
                  {cardScreenshots.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {cardScreenshots.length}
                    </span>
                  )}
                </button>
                
                {/* Botón play/pause */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleActivityPlayPause(card.id, card.activityData?.isRunning || false);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 transition-colors shadow-md"
                  data-todo-interactive
                  style={{
                    width: `${Math.max(32, (card.fontSize || 18) + 14)}px`,
                    height: `${Math.max(32, (card.fontSize || 18) + 14)}px`
                  }}
                >
                  <div style={{ fontSize: `${Math.max(12, (card.fontSize || 18) - 6)}px` }}>
                    {card.activityData?.isRunning ? '⏸️' : '▶️'}
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : card.type === 'todo' ? (
          <div className="flex flex-col h-full w-full p-2">
            <div className="flex items-center gap-2 mb-2">
              <div style={{ fontSize: `${Math.max(16, (card.fontSize || 18) + 4)}px` }}>{getCardIcon()}</div>
              {editingTitle === card.id ? (
                <input
                  type="text"
                  defaultValue={card.title}
                  onBlur={(e) => updateCardTitle(card.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateCardTitle(card.id, e.currentTarget.value);
                    }
                    if (e.key === 'Escape') {
                      setEditingTitle(null);
                    }
                  }}
                  className="font-semibold text-sm text-gray-800 flex-1 bg-transparent border-b border-gray-400 focus:outline-none"
                  autoFocus
                  data-todo-interactive
                />
              ) : (
                <h3
                  className="font-semibold text-gray-800 truncate flex-1"
                  style={{ fontSize: `${card.fontSize || 18}px` }}
                >
                  {card.title}
                </h3>
              )}
            </div>

            <div className="flex-1 overflow-y-auto todo-scroll pr-1">
              {card.todos?.map(todo => (
                <div
                  key={todo.id}
                  className="flex items-center gap-2 mb-1"
                  style={{ fontSize: `${(card.fontSize || 18) - 3}px` }}
                  data-todo-interactive
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleTodo(card.id, todo.id);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className={`rounded border flex items-center justify-center hover:scale-110 transition-transform ${todo.completed ? 'bg-green-500 text-white' : 'border-gray-400 hover:border-gray-600'
                      }`}
                    style={{
                      width: `${Math.max(12, (card.fontSize || 18) - 1)}px`,
                      height: `${Math.max(12, (card.fontSize || 18) - 1)}px`,
                      fontSize: `${Math.max(8, (card.fontSize || 18) - 4)}px`
                    }}
                    data-todo-interactive
                  >
                    {todo.completed && '✓'}
                  </button>
                  {editingTodo && editingTodo.cardId === card.id && editingTodo.todoId === todo.id ? (
                    <input
                      type="text"
                      defaultValue={todo.text}
                      className="flex-1 px-1 py-0.5 border rounded focus:border-blue-400 focus:outline-none bg-white text-black"
                      style={{ fontSize: `${(card.fontSize || 18) - 3}px` }}
                      autoFocus
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          updateTodoInCard(card.id, todo.id, e.target.value.trim());
                        } else {
                          setEditingTodo(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          if (e.currentTarget.value.trim()) {
                            updateTodoInCard(card.id, todo.id, e.currentTarget.value.trim());
                          } else {
                            setEditingTodo(null);
                          }
                        }
                        if (e.key === 'Escape') {
                          setEditingTodo(null);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      data-todo-interactive
                    />
                  ) : (
                    <span 
                      className={`flex-1 cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 transition-colors ${todo.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!todo.completed) {
                          setEditingTodo({ cardId: card.id, todoId: todo.id });
                        }
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      data-todo-interactive
                    >
                      {todo.text}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteTodoFromCard(card.id, todo.id);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded px-1 transition-colors"
                    style={{ fontSize: `${Math.max(10, (card.fontSize || 18) - 2)}px` }}
                    data-todo-interactive
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <TodoInput cardId={card.id} onAddTodo={addTodoToCard} fontSize={card.fontSize} />
          </div>
        ) : card.type === 'mision' ? (
          <div className="flex flex-col h-full w-full p-3">
            {/* Header con icono, título y horas */}
            <div className="flex items-center gap-2 mb-2 border-b border-green-200 pb-2">
              <div style={{ fontSize: `${Math.max(16, (card.fontSize || 18) + 2)}px` }}>🎯</div>
              {editingTitle === card.id ? (
                <input
                  type="text"
                  defaultValue={card.title}
                  onBlur={(e) => updateCardTitle(card.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateCardTitle(card.id, e.currentTarget.value);
                    }
                    if (e.key === 'Escape') {
                      setEditingTitle(null);
                    }
                  }}
                  className="font-semibold text-green-800 flex-1 bg-transparent border-b border-green-400 focus:outline-none"
                  autoFocus
                  data-todo-interactive
                />
              ) : (
                <h3
                  className="font-semibold text-green-800 truncate flex-1"
                  style={{ fontSize: `${(card.fontSize || 18) - 2}px` }}
                >
                  {card.misionData?.title || card.title}
                </h3>
              )}
              <div className="bg-green-600 text-white rounded-full px-2 py-1 font-bold text-xs">
                {card.misionData?.hours || 1}h
              </div>
            </div>

            {/* Descripción */}
            <div className="mb-2">
              <p
                className="text-green-700 leading-tight"
                style={{ fontSize: `${(card.fontSize || 18) - 4}px` }}
              >
                {card.misionData?.description || card.title}
              </p>
            </div>

            {/* Sección central con botón de play e imagen */}
            <div className="flex-1 flex flex-col justify-center items-center gap-2">
              {/* Botón de play centrado */}
              <button
                className="bg-green-600 hover:bg-green-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200 shadow-lg hover:shadow-xl"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Aquí se puede agregar la lógica del play
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                data-todo-interactive
              >
                <div style={{ fontSize: `${Math.max(14, (card.fontSize || 18) - 2)}px` }}>▶️</div>
              </button>

              {/* Imagen aspecto 16x9 */}
              <div className="bg-green-200 rounded border-2 border-green-300 overflow-hidden w-20" style={{ aspectRatio: '16/9' }}>
                <div className="w-full h-full bg-gradient-to-br from-green-300 to-green-500 flex items-center justify-center">
                  <div
                    className="text-green-800 font-medium text-center"
                    style={{ fontSize: `${(card.fontSize || 18) - 8}px` }}
                  >
                    📸
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 h-full">
            <div style={{ fontSize: `${Math.max(20, (card.fontSize || 18) + 8)}px` }}>{getCardIcon()}</div>
            <div className="flex-1 min-w-0">
              {editingTitle === card.id ? (
                <input
                  type="text"
                  defaultValue={card.title}
                  onBlur={(e) => updateCardTitle(card.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateCardTitle(card.id, e.currentTarget.value);
                    }
                    if (e.key === 'Escape') {
                      setEditingTitle(null);
                    }
                  }}
                  className="font-semibold text-gray-800 w-full bg-transparent border-b border-gray-400 focus:outline-none"
                  autoFocus
                  data-todo-interactive
                />
              ) : (
                <h3
                  className="font-semibold text-gray-800 truncate"
                  style={{ fontSize: `${card.fontSize || 18}px` }}
                >
                  {card.title}
                </h3>
              )}
              <p
                className="text-gray-600 mt-1 line-clamp-3"
                style={{ fontSize: `${(card.fontSize || 18) - 2}px` }}
              >
                {card.content}
              </p>
            </div>
          </div>
        )}

        {/* Punto de conexión */}
        {(hoveredCard === card.id || isConnecting) && (
          <div
            data-connection-button="true"
            className={`
              absolute -top-2 right-2 px-2 py-1 rounded-md cursor-pointer z-20
              transition-all duration-200 hover:scale-110 flex items-center justify-center
              ${isConnecting && connectingFrom === card.id
                ? 'bg-blue-500 ring-2 ring-blue-300'
                : 'bg-green-500 hover:bg-green-600'
              }
            `}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleConnectionPointClick(e, card.id);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <span className="text-xs">📌</span>
          </div>
        )}

        {/* Panel de configuración */}
        {hoveredCard === card.id && (
          <div
            data-config-button="true"
            className={`absolute bottom-1 left-1 z-30 transition-all duration-300 ${configOpenCard === card.id ? 'w-48' : 'w-8'
              }`}
          >
            {configOpenCard === card.id ? (
              <div className="bg-gray-800 rounded-lg p-3 shadow-xl">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white text-xs font-medium">Configuración</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setConfigOpenCard(null);
                    }}
                    className="text-white hover:text-gray-300 text-xs"
                  >
                    ✕
                  </button>
                </div>

                {/* Control de tamaño de fuente */}
                <div className="mb-3">
                  <label className="text-white text-xs block mb-1">Tamaño texto:</label>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        changeFontSize(card.id, -2);
                      }}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs"
                      disabled={(card.fontSize || 18) <= 12}
                    >
                      A-
                    </button>
                    <span className="text-white text-xs px-2 py-1">{card.fontSize || 18}px</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        changeFontSize(card.id, 2);
                      }}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs"
                      disabled={(card.fontSize || 18) >= 32}
                    >
                      A+
                    </button>
                  </div>
                </div>

                {/* Botón editar título */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingTitle(card.id);
                    setConfigOpenCard(null);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs mb-2"
                >
                  ✏️ Editar título
                </button>

                {/* Botón eliminar */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirmDelete(card.id);
                  }}
                  className="w-full bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs"
                >
                  🗑️ Eliminar card
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfigOpenCard(card.id);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="w-8 h-8 bg-gray-700 hover:bg-gray-800 text-white rounded-md flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg"
              >
                <span className="text-xs">⚙️</span>
              </button>
            )}
          </div>
        )}

        {/* Modal de confirmación para eliminar */}
        {confirmDelete === card.id && (
          <div
            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-lg"
            data-config-button="true"
          >
            <div className="bg-white p-4 rounded-lg shadow-xl max-w-xs">
              <h3 className="text-gray-800 font-semibold mb-2">¿Eliminar card?</h3>
              <p className="text-gray-600 text-sm mb-4">Esta acción no se puede deshacer.</p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirmDelete(null);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-2 rounded text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteCard(card.id);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  });

  // Función para agregar cards de prueba
  const addNoteCard = useCallback((text: string) => {
    const newCard = {
      id: generateUniqueId('note'),
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
  }, []);

  const addTodoCard = useCallback((text: string) => {
    const newCard = {
      id: generateUniqueId('todo'),
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
  }, []);

  // Funciones para manejar todos
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

        // Calcular nuevo tamaño del card basado en el fontSize
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
        } else {
          baseWidth = 200;
          baseHeight = 120;
        }

        const sizeMultiplier = newSize / 18; // 18 es el tamaño base
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

  const deleteCard = useCallback((cardId: string) => {
    setCards(prev => prev.filter(card => card.id !== cardId));
    setConfirmDelete(null);
    setConfigOpenCard(null);
  }, []);

  useImperativeHandle(ref, () => ({
    addNoteCard,
    addTodoCard
  }), [addNoteCard, addTodoCard]);

  const addTestCards = useCallback(() => {
    const testCards = [
      {
        id: 'test-1',
        type: 'text',
        title: 'Nota de Proyecto',
        content: 'Ideas principales para la implementación del nuevo sistema',
        x: 100,
        y: 100,
        width: 200,
        height: 120
      },
      {
        id: 'test-2',
        type: 'task',
        title: 'Tarea Pendiente',
        content: 'Revisar documentación técnica y preparar presentación',
        x: 400,
        y: 150,
        width: 220,
        height: 130
      },
      {
        id: 'test-3',
        type: 'image',
        title: 'Diseño UI',
        content: 'Mockups de la interfaz principal',
        x: 150,
        y: 300,
        width: 180,
        height: 110
      },
      {
        id: 'test-4',
        type: 'link',
        title: 'Documentación',
        content: 'Enlaces a recursos importantes del proyecto',
        x: 450,
        y: 350,
        width: 200,
        height: 100
      }
    ];

    setCards(testCards);
  }, []);

  return (
    <div className={`w-screen h-screen bg-transparent flex flex-col items-center justify-center p-8 ${isReceivingDrag ? 'z-50' : ''}`}>
      <div
        ref={canvasRef}
        className={`
          relative w-4/5 h-4/5
          border-4 border-dashed rounded-3xl
          transition-colors duration-300 ease-in-out overflow-hidden
          ${isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-transparent'
          }
          ${isPanning ? 'cursor-grabbing select-none' : 'cursor-grab'}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Líneas de conexión */}
        <ConnectionLines />

        {/* Área de instrucciones cuando está vacía */}
        {cards.length === 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
          >
            <div className="text-center">
              <div className={`text-6xl mb-4 transition-colors duration-300 ${isDragOver ? 'text-blue-500' : 'text-gray-400'
                }`}>
                💼
              </div>
              <p className={`text-lg font-medium transition-colors duration-300 ${isDragOver ? 'text-blue-600' : 'text-white'
                }`}>
                {isDragOver
                  ? 'Suelta aquí para crear una card'
                  : 'Arrastra archivos o texto a la pizarra'
                }
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

        {/* Renderizar todas las cards */}
        {cards.map(card => (
          <Card key={card.id} card={card} />
        ))}

        {/* Icono flotante que sigue el cursor durante modo conexión */}
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

      {/* Información de estado */}
      <div className="mt-4 text-sm text-gray-600 text-center">
        <p>Cards: {cards.length} | Conexiones: {connections.length}</p>
        {isConnecting && (
          <p className="text-blue-600 font-medium">
            Conectando desde: {cards.find(c => c.id === connectingFrom)?.title}
          </p>
        )}
      </div>


      {/* Estilos para scroll personalizado */}
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
        
        .ticker-wrapper {
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        
        .ticker-content-continuous {
          animation: scroll-left-seamless 20s linear infinite;
          display: flex;
          font-size: 0.75rem;
          font-weight: 500;
          line-height: 1;
          color: #16a34a;
          white-space: nowrap;
        }
        
        .ticker-text {
          padding: 0 20px;
          display: inline-block;
        }
        
        .ticker-text:after {
          content: " • ";
          color: rgba(22, 163, 74, 0.6);
        }
        
        @keyframes scroll-left-seamless {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
});

TestPizarra.displayName = 'TestPizarra';

export default TestPizarra;