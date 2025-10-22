'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatWindows } from '@/app/contexts/ChatWindowContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { useChatMessages } from '@/hooks/useChatMessages';

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
      className="fixed bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden backdrop-blur-sm"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '380px',
        height: isMinimized ? 'auto' : '550px',
        cursor: isDragging ? 'grabbing' : 'default',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white cursor-grab active:cursor-grabbing shadow-lg relative overflow-hidden"
        onMouseDown={handleMouseDown}
      >
        {/* Efecto de brillo en el header */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10">
          <div className="relative">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-lg ring-2 ring-white/50 overflow-hidden`}>
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
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white shadow-md animate-pulse"></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate text-base">{userName}</h3>
            <div className={`flex items-center gap-1.5 text-xs ${isOnline ? 'text-green-200' : 'text-purple-200'}`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-300' : 'bg-gray-400'}`}></div>
              <span className="font-medium">{isOnline ? 'En línea' : 'Desconectado'}</span>
            </div>
          </div>
        </div>

        {/* Botones de control */}
        <div className="flex items-center gap-2 relative z-10" data-no-drag>
          <button
            onClick={() => isMinimized ? maximizeChatWindow(windowId) : minimizeChatWindow(windowId)}
            className="hover:bg-white/20 rounded-lg p-1.5 transition-all duration-200 hover:scale-110"
            title={isMinimized ? 'Maximizar' : 'Minimizar'}
          >
            <span className="text-lg">{isMinimized ? '🔼' : '🔽'}</span>
          </button>
          <button
            onClick={() => closeChatWindow(windowId)}
            className="hover:bg-white/20 rounded-lg p-1.5 transition-all duration-200 hover:scale-110 hover:bg-red-500/30"
            title="Cerrar"
          >
            <span className="text-lg font-bold">✕</span>
          </button>
        </div>
      </div>

      {/* Body - Solo visible cuando no está minimizado */}
      {!isMinimized && (
        <>
          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white custom-scrollbar">
            {loading && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
                <span className="text-purple-500 text-sm font-medium">Cargando mensajes...</span>
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
              return (
                <div
                  key={mensaje.id}
                  className={`flex ${esMio ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      esMio
                        ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="break-words text-sm leading-relaxed">{mensaje.texto}</p>
                    <span className={`text-xs mt-1 block ${esMio ? 'text-purple-200' : 'text-gray-500'}`}>
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
          <div className="p-4 border-t text-black border-gray-200 bg-white" data-no-drag>
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
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 placeholder:text-gray-400"
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
                className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-purple-400 disabled:to-purple-500 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl transition-all duration-200 text-base font-medium shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              >
                {sending ? (
                  <span className="animate-pulse">⏳</span>
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
