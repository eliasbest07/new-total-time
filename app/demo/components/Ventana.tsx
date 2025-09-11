'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface VentanaProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  initialX?: number;
  initialY?: number;
  minWidth?: number;
  minHeight?: number;
  resizable?: boolean;
  draggable?: boolean;
  className?: string;
  showOverlay?: boolean;
}

const Ventana = ({
  isOpen,
  onClose,
  title,
  children,
  initialWidth = 600,
  initialHeight = 400,
  initialX = 100,
  initialY = 100,
  minWidth = 300,
  minHeight = 200,
  resizable = true,
  draggable = true,
  className = '',
  showOverlay = false
}: VentanaProps) => {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState('');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ 
    x: 0, 
    y: 0, 
    width: 0, 
    height: 0, 
    posX: 0, 
    posY: 0 
  });
  const [zIndex, setZIndex] = useState(1000);

  const ventanaRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Manejar el arrastre
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable || isResizing) return;
    
    setIsDragging(true);
    setZIndex(prev => prev + 1);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // Manejar el redimensionado desde cualquier dirección
  const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
    if (!resizable) return;
    
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setZIndex(prev => prev + 1);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y
    });
  };

  // Efectos para manejar el movimiento del mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && draggable) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // Limitar a los bordes de la ventana
        const maxX = window.innerWidth - size.width;
        const maxY = window.innerHeight - size.height;
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
      
      if (isResizing && resizable) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = resizeStart.posX;
        let newY = resizeStart.posY;

        // Calcular nuevas dimensiones y posición según la dirección
        switch (resizeDirection) {
          case 'se': // Esquina inferior derecha
            newWidth = Math.max(minWidth, resizeStart.width + deltaX);
            newHeight = Math.max(minHeight, resizeStart.height + deltaY);
            break;
          case 'sw': // Esquina inferior izquierda
            newWidth = Math.max(minWidth, resizeStart.width - deltaX);
            newHeight = Math.max(minHeight, resizeStart.height + deltaY);
            newX = resizeStart.posX + (resizeStart.width - newWidth);
            break;
          case 'ne': // Esquina superior derecha
            newWidth = Math.max(minWidth, resizeStart.width + deltaX);
            newHeight = Math.max(minHeight, resizeStart.height - deltaY);
            newY = resizeStart.posY + (resizeStart.height - newHeight);
            break;
          case 'nw': // Esquina superior izquierda
            newWidth = Math.max(minWidth, resizeStart.width - deltaX);
            newHeight = Math.max(minHeight, resizeStart.height - deltaY);
            newX = resizeStart.posX + (resizeStart.width - newWidth);
            newY = resizeStart.posY + (resizeStart.height - newHeight);
            break;
          case 'n': // Borde superior
            newHeight = Math.max(minHeight, resizeStart.height - deltaY);
            newY = resizeStart.posY + (resizeStart.height - newHeight);
            break;
          case 's': // Borde inferior
            newHeight = Math.max(minHeight, resizeStart.height + deltaY);
            break;
          case 'e': // Borde derecho
            newWidth = Math.max(minWidth, resizeStart.width + deltaX);
            break;
          case 'w': // Borde izquierdo
            newWidth = Math.max(minWidth, resizeStart.width - deltaX);
            newX = resizeStart.posX + (resizeStart.width - newWidth);
            break;
        }

        // Limitar posición a los bordes de la ventana
        newX = Math.max(0, Math.min(newX, window.innerWidth - newWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - newHeight));

        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection('');
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, size, minWidth, minHeight, draggable, resizable]);

  // Centrar ventana al abrir
  useEffect(() => {
    if (isOpen && ventanaRef.current) {
      const centerX = (window.innerWidth - size.width) / 2;
      const centerY = (window.innerHeight - size.height) / 2;
      setPosition({ x: Math.max(0, centerX), y: Math.max(0, centerY) });
    }
  }, [isOpen, size.width, size.height]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay opcional */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[999] transition-opacity duration-300" />
      )}
      
      {/* Ventana */}
      <div
        ref={ventanaRef}
        className={`fixed bg-white border border-gray-200 rounded-xl shadow-2xl animate-slide-in ${className} ${
          isDragging ? 'cursor-grabbing ventana-dragging' : ''
        } ${isResizing ? 'ventana-resizing' : ''} ${isMinimized ? 'ventana-minimized' : ''}`}
        style={{
          left: position.x,
          top: position.y,
          width: isMinimized ? 300 : size.width,
          height: isMinimized ? 48 : size.height,
          zIndex: zIndex,
          minWidth: isMinimized ? 300 : minWidth,
          minHeight: isMinimized ? 48 : minHeight
        }}
      >
        {/* Header de la ventana */}
        <div
          ref={headerRef}
          className={`flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl ${
            draggable ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-3">
            {/* Botones de control */}
            <div className="flex gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded transition-colors"
                title={isMinimized ? "Restaurar" : "Minimizar"}
              >
                <div className="w-3 h-0.5 bg-gray-600"></div>
              </button>
              <button
                className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded transition-colors"
                title="Maximizar"
                onClick={() => {
                  // Si está minimizada, restaurar primero
                  if (isMinimized) {
                    setIsMinimized(false);
                  }
                  
                  // Maximizar pero no completamente - dejar margen
                  const maxWidth = window.innerWidth - 100;
                  const maxHeight = window.innerHeight - 150;
                  
                  if (size.width >= maxWidth - 50 && size.height >= maxHeight - 50) {
                    // Si ya está maximizado, restaurar
                    setSize({ width: initialWidth, height: initialHeight });
                    setPosition({ x: initialX, y: initialY });
                  } else {
                    // Maximizar con márgenes
                    setSize({ width: maxWidth, height: maxHeight });
                    setPosition({ x: 50, y: 75 });
                  }
                }}
              >
                <div className="w-3 h-3 border border-gray-600 rounded-sm"></div>
              </button>
              <button
                onClick={onClose}
                className="w-6 h-6 flex items-center justify-center hover:bg-red-100 rounded transition-colors group"
                title="Cerrar"
              >
                <svg className="w-3 h-3 text-gray-600 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Título */}
            <h3 className="text-gray-800 font-medium text-sm select-none">{title}</h3>
          </div>
        </div>

        {/* Contenido de la ventana */}
        {!isMinimized && (
          <div className="p-4 h-full overflow-auto ventana-content bg-white rounded-b-xl" style={{ height: 'calc(100% - 48px)' }}>
            {children}
          </div>
        )}

        {/* Handles de redimensionado */}
        {resizable && !isMinimized && (
          <>
            {/* Esquinas */}
            <div
              className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize opacity-0 hover:opacity-50 transition-opacity"
              onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
            />
            <div
              className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize opacity-0 hover:opacity-50 transition-opacity"
              onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
            />
            <div
              className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize opacity-0 hover:opacity-50 transition-opacity"
              onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
            />
            <div
              className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize opacity-0 hover:opacity-50 transition-opacity bg-gray-400 rounded-tl-sm"
              onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
            />
            
            {/* Bordes */}
            <div
              className="absolute top-0 left-3 right-3 h-1 cursor-n-resize opacity-0 hover:opacity-30 transition-opacity"
              onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
            />
            <div
              className="absolute bottom-0 left-3 right-3 h-1 cursor-s-resize opacity-0 hover:opacity-30 transition-opacity"
              onMouseDown={(e) => handleResizeMouseDown(e, 's')}
            />
            <div
              className="absolute left-0 top-3 bottom-3 w-1 cursor-w-resize opacity-0 hover:opacity-30 transition-opacity"
              onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
            />
            <div
              className="absolute right-0 top-3 bottom-3 w-1 cursor-e-resize opacity-0 hover:opacity-30 transition-opacity"
              onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
            />
          </>
        )}
      </div>
    </>
  );
};

export default Ventana;