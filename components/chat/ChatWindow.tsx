'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatWindows } from '@/app/contexts/ChatWindowContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { useChatMessages } from '@/hooks/useChatMessages';
import { SharedCardPreview } from './SharedCardPreview';

interface ChatWindowProps {
  windowId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userColor: string;
  isOnline: boolean;
  position: { x: number; y: number };
  isMinimized: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  windowId,
  userId,
  userName,
  userAvatar,
  userColor,
  isOnline,
  position,
  isMinimized
}) => {
  const { closeChatWindow, minimizeChatWindow, maximizeChatWindow, updateWindowPosition } = useChatWindows();
  const { usuario } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hook para manejar mensajes en tiempo real
  const {
    mensajes,
    loading,
    error,
    sending,
    enviarMensaje
  } = useChatMessages(
    usuario?.userAuth || null,
    userId
  );

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [mensajes, isMinimized]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) {
      return; // No iniciar drag si se hace clic en elementos interactivos
    }

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        // Limitar a los bordes de la ventana
        const maxX = window.innerWidth - 350; // ancho de la ventana
        const maxY = window.innerHeight - 500; // alto de la ventana

        updateWindowPosition(windowId, {
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, windowId, updateWindowPosition]);

  const handleSendMessage = async (texto: string) => {
    if (!texto.trim()) return;
    try {
      await enviarMensaje(texto);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  };

  return (
    <div
      ref={windowRef}
      className="fixed bg-white rounded-xl shadow-2xl border border-gray-300 flex flex-col z-50 overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '380px',
        height: isMinimized ? 'auto' : '550px',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-white border-b border-gray-200 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative">
            <div className={`w-12 h-12 rounded-full ${userColor || 'bg-gray-500'} flex items-center justify-center text-white font-bold text-base shadow-md overflow-hidden`}>
              {userAvatar && (userAvatar.startsWith('http://') || userAvatar.startsWith('https://')) ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Si la imagen falla, mostrar iniciales
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    if (target.nextSibling) {
                      (target.nextSibling as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <span
                className="w-full h-full flex items-center justify-center"
                style={{ display: (userAvatar && (userAvatar.startsWith('http://') || userAvatar.startsWith('https://'))) ? 'none' : 'flex' }}
              >
                {userAvatar && !(userAvatar.startsWith('http://') || userAvatar.startsWith('https://')) ? userAvatar : userName.substring(0, 2).toUpperCase()}
              </span>
            </div>
            {isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white shadow-md"></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate text-base text-gray-900">{userName}</h3>
            <div className={`flex items-center gap-1.5 text-xs ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="font-medium">{isOnline ? 'En línea' : 'Desconectado'}</span>
            </div>
          </div>
        </div>

        {/* Botones de control */}
        <div className="flex items-center gap-2" data-no-drag>
          <button
            onClick={() => isMinimized ? maximizeChatWindow(windowId) : minimizeChatWindow(windowId)}
            className="hover:bg-gray-100 rounded-lg p-1.5 transition-all duration-200"
            title={isMinimized ? 'Maximizar' : 'Minimizar'}
          >
            <span className="text-lg">{isMinimized ? '🔼' : '🔽'}</span>
          </button>
          <button
            onClick={() => closeChatWindow(windowId)}
            className="hover:bg-red-100 rounded-lg p-1.5 transition-all duration-200"
            title="Cerrar"
          >
            <span className="text-lg font-bold text-red-600">✕</span>
          </button>
        </div>
      </div>

      {/* Body - Solo visible cuando no está minimizado */}
      {!isMinimized && (
        <>
          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
            {loading && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <span className="text-gray-600 text-sm font-medium">Cargando mensajes...</span>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <span className="text-red-600 text-sm font-medium">{error}</span>
              </div>
            )}
            {!loading && mensajes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <span className="text-4xl mb-2">💬</span>
                <span className="text-sm font-medium">No hay mensajes aún</span>
                <span className="text-xs mt-1">Envía el primero!</span>
              </div>
            )}
            {!loading && mensajes.map((mensaje) => {
              const esMio = mensaje.idEmisor === usuario?.userAuth;
              const tieneCard = !!mensaje.idCardRef;
              console.log('🔍 Mensaje debug:', { id: mensaje.id, texto: mensaje.texto?.substring(0, 30), idCardRef: mensaje.idCardRef, tieneCard });
              return (
                <div
                  key={mensaje.id}
                  className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg shadow-sm ${
                      tieneCard ? 'p-2' : 'px-4 py-2.5'
                    } ${
                      esMio
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900 border border-gray-200'
                    }`}
                  >
                    {tieneCard ? (
                      <SharedCardPreview cardId={mensaje.idCardRef!} esMio={esMio} onAddToPizarra={() => closeChatWindow(windowId)} />
                    ) : (
                      <p className="break-words text-sm leading-relaxed">{mensaje.texto}</p>
                    )}
                    <span className={`text-xs mt-1 block ${tieneCard ? 'px-2' : ''} ${esMio ? 'text-blue-100' : 'text-gray-500'}`}>
                      {mensaje.createdAt.toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white" data-no-drag>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={sending ? 'Enviando...' : 'Escribe un mensaje...'}
                disabled={sending}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim() && !sending) {
                    const texto = e.currentTarget.value.trim();
                    e.currentTarget.value = '';
                    await handleSendMessage(texto);
                  }
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm text-black bg-white disabled:bg-gray-100 disabled:cursor-not-allowed transition-all placeholder:text-gray-400"
              />
              <button
                onClick={async (e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  if (input && input.value.trim() && !sending) {
                    const texto = input.value.trim();
                    input.value = '';
                    await handleSendMessage(texto);
                  }
                }}
                disabled={sending}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-5 py-3 rounded-lg transition-all text-base font-medium shadow-sm"
              >
                {sending ? (
                  <span>⏳</span>
                ) : (
                  <span>💬</span>
                )}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
