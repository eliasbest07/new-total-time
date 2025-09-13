import React, { useState, useCallback, useRef, useEffect } from 'react';

const Pizarra = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isReceivingDrag, setIsReceivingDrag] = useState(false);
  const [cards, setCards] = useState<Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>>([]);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Estados para el pan de la pizarra
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
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
    const rect = canvasRef.current.getBoundingClientRect();
    // Ajustar coordenadas considerando el pan
    const x = e.clientX - rect.left - panOffset.x;
    const y = e.clientY - rect.top - panOffset.y;
    
    // Manejar archivos
    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      files.forEach((file, index) => {
        const newCard = {
          id: `file-${Date.now()}-${index}`,
          type: 'file',
          title: file.name,
          content: `Tamaño: ${(file.size / 1024).toFixed(2)} KB`,
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

const handleCardMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, card: Card) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - panOffset.x - card.x;
    const offsetY = e.clientY - rect.top - panOffset.y - card.y;
    
    setDraggedCard(card.id);
    setDragOffset({ x: offsetX, y: offsetY });
    
    // Prevenir que el canvas inicie el pan cuando se arrastra una card
    setIsPanning(false);
}, [panOffset]);

  // Funciones para pan de la pizarra
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Solo iniciar pan si el click es directamente en el canvas (no en una card)
    // y no hay card siendo arrastrada
    if (!draggedCard && e.target === e.currentTarget) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      
      // Prevenir selección de texto
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    }
  }, [draggedCard, panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Los eventos globales se encargan del movimiento
    // Este handler se mantiene para compatibilidad pero está vacío
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (draggedCard) {
      setDraggedCard(null);
      setDragOffset({ x: 0, y: 0 });
    }
    
    // Restaurar selección de texto
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
  }, [isPanning, draggedCard]);

  // Manejar eventos globales de mouse para mejor control
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current) return;
    
    if (isPanning) {
      // Mover la vista de la pizarra
      const newPanX = e.clientX - panStart.x;
      const newPanY = e.clientY - panStart.y;
      setPanOffset({ x: newPanX, y: newPanY });
    } else if (draggedCard) {
      // Mover card individual
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - panOffset.x - dragOffset.x;
      const newY = e.clientY - rect.top - panOffset.y - dragOffset.y;
      
      setCards(prev => prev.map(card => 
        card.id === draggedCard 
          ? { ...card, x: newX, y: newY }
          : card
      ));
    }
  }, [isPanning, panStart, draggedCard, dragOffset, panOffset]);

  const handleGlobalMouseUp = useCallback(() => {
    if (isPanning || draggedCard) {
      handleMouseUp();
    }
  }, [isPanning, draggedCard, handleMouseUp]);

  // Agregar y remover event listeners globales
  useEffect(() => {
    if (isPanning || draggedCard) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isPanning, draggedCard, handleGlobalMouseMove, handleGlobalMouseUp]);

  // Función para centrar la vista
  const centerView = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Función para ir a una card específica
  const goToCard = useCallback((card: Card) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const centerX = rect.width / 2 - card.width / 2;
    const centerY = rect.height / 2 - card.height / 2;
    setPanOffset({ 
      x: centerX - card.x, 
      y: centerY - card.y 
    });
  }, []);

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
        default:
          return '📋';
      }
    };

    return (
      <div
        className={`
          absolute bg-white bg-opacity-90 rounded-lg shadow-lg border-2 p-3 cursor-move
          transition-transform duration-200 hover:scale-105
          ${draggedCard === card.id ? 'shadow-2xl border-blue-500 z-10' : 'border-gray-200'}
        `}
        style={{
          left: card.x,
          top: card.y,
          width: card.width,
          height: card.height,
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`
        }}
        onMouseDown={(e) => handleCardMouseDown(e, card)}
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
      </div>
    );
  };

  return (
    <div className={`w-screen h-screen bg-transparent flex items-center justify-center p-8 ${isReceivingDrag ? 'z-50' : ''}`}>
      <div 
        ref={canvasRef}
        className={`
          relative w-4/5 h-4/5 mt-4
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
       

        {/* Lista de cards para navegación rápida
        {cards.length > 0 && (
          <div className="absolute top-4 right-4 bg-gray-800 text-white rounded-lg shadow-lg overflow-hidden z-20">
            <div className="px-3 py-1 bg-gray-700 text-sm font-medium">
              {cards.length} elemento{cards.length !== 1 ? 's' : ''}
            </div>
            <div className="max-h-32 overflow-y-auto">
              {cards.map(card => (
                <button
                  key={card.id}
                  onClick={() => goToCard(card)}
                  className="w-full px-3 py-1 text-left text-xs hover:bg-gray-600 transition-colors truncate"
                >
                  {card.title}
                </button>
              ))}
            </div>
          </div>
        )} */}

        {/* Indicador de posición del pan */}
        {/* <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          Vista: {Math.round(panOffset.x)}, {Math.round(panOffset.y)}
        </div> */}

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
            </div>
          </div>
        )}

        {/* Renderizar todas las cards */}
        {cards.map(card => (
          <Card key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
};

export default Pizarra;