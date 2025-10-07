import React, { useState, useCallback, useRef, useEffect } from 'react';

const TestPizarra = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isReceivingDrag, setIsReceivingDrag] = useState(false);
  interface Card {
    id: string;
    type: string;
    title: string;
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
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

  const [connections, setConnections] = useState<Connection[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLDivElement>(null);

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
          id: `file-${Date.now()}-${index}`,
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
    
    // Manejar recursos del accordion
    const resourceData = e.dataTransfer.getData('application/json');
    if (resourceData) {
      try {
        const resource = JSON.parse(resourceData);
        if (resource.type === 'resource') {
          const newCard = {
            id: `resource-${Date.now()}`,
            type: 'resource',
            title: resource.name,
            content: `Tipo: ${resource.resourceType}`,
            x: x,
            y: y,
            width: 180,
            height: 110
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
        id: `text-${Date.now()}`,
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
    // Si el click viene del botón de conexión o configuración, ignorarlo
    if ((e.target as HTMLElement).closest('[data-connection-button]') || 
        (e.target as HTMLElement).closest('[data-config-button]')) {
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

  // Funciones para vínculos
  const handleConnectionPointClick = useCallback((e: React.MouseEvent<HTMLDivElement>, cardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isConnecting) {
      // Iniciar conexión
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
          id: `connection-${Date.now()}`,
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
          id: `connection-${Date.now()}`,
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

  // Componente Card mejorado
  const Card: React.FC<{ card: Card }> = ({ card }) => {
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
        default:
          return '📋';
      }
    };

    const getCardStyle = () => {
      const baseStyle = "absolute rounded-lg shadow-lg border-2 p-3 cursor-move transition-colors duration-200 select-none";
      
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
        <div className="flex items-start gap-2 h-full">
          <div className="text-2xl">{getCardIcon()}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-800 truncate">
              {card.title}
            </h3>
            <p className="text-xs text-gray-600 mt-1 line-clamp-3">
              {card.content}
            </p>
          </div>
        </div>
        
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

        {/* Botón de configuración */}
        {hoveredCard === card.id && (
          <div
            data-config-button="true"
            className={`
              absolute bottom-1 left-1 px-2 py-1 rounded-md cursor-pointer z-30
              transition-all duration-200 hover:scale-110 flex items-center justify-center
              bg-gray-700 hover:bg-gray-800 text-white shadow-lg
            `}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Aquí iría la lógica de configuración
              console.log('Configuración de card:', card.id);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <span className="text-xs text-white">⚙️</span>
          </div>
        )}
      </div>
    );
  };

  // Función para agregar cards de prueba
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
              <div className={`text-6xl mb-4 transition-colors duration-300 ${
                isDragOver ? 'text-blue-500' : 'text-gray-400'
              }`}>
                💼 
              </div>
              <p className={`text-lg font-medium transition-colors duration-300 ${
                isDragOver ? 'text-blue-600' : 'text-white'
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
    </div>
  );
};

export default TestPizarra;