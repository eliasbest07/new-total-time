'use client';

import { useRef, useEffect } from 'react';
import { useChatMessages } from '@/hooks/useChatMessages';

interface ChatWindowProps {
  currentUserId: string;
  targetUser: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  };
  initialMessage?: string;
}

export default function ChatWindow({ currentUserId, targetUser, initialMessage }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    mensajes,
    loading,
    error,
    sending,
    enviarMensaje
  } = useChatMessages(currentUserId, targetUser.userId);

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-purple-200 bg-gradient-to-r from-purple-50 to-white">
        <div className="relative">
          <div className={`w-12 h-12 rounded-full ${targetUser.color || 'bg-purple-500'} flex items-center justify-center text-white font-semibold shadow-md`}>
            {targetUser.avatar || 'US'}
          </div>
          {targetUser.online && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-purple-800 text-lg">
            {targetUser.name}
          </h3>
          <div className={`inline-flex items-center gap-1 text-sm ${targetUser.online ? 'text-green-600' : 'text-gray-500'}`}>
            <div className={`w-2 h-2 rounded-full ${targetUser.online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="font-medium">
              {targetUser.online ? 'En línea' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
        {loading && (
          <div className="text-center text-purple-400 text-sm py-4">
            Cargando mensajes...
          </div>
        )}
        {error && (
          <div className="text-center text-red-500 text-sm py-4">
            {error}
          </div>
        )}
        {!loading && mensajes.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-4">
            No hay mensajes aún. ¡Inicia la conversación!
          </div>
        )}
        {!loading && mensajes.map((mensaje) => {
          const esMio = mensaje.idEmisor === currentUserId;
          return (
            <div
              key={mensaje.id}
              className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${
                  esMio
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-purple-900 border border-purple-100'
                }`}
              >
                <p className="break-words">{mensaje.texto}</p>
                <span className={`text-xs ${esMio ? 'text-purple-200' : 'text-gray-500'}`}>
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
      <div className="p-4 border-t border-purple-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={sending ? 'Enviando...' : 'Escribe un mensaje...'}
            disabled={sending}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim() && !sending) {
                const texto = e.currentTarget.value.trim();
                e.currentTarget.value = '';
                try {
                  await enviarMensaje(texto);
                } catch (error) {
                  console.error('Error enviando mensaje:', error);
                }
              }
            }}
            className="flex-1 px-4 py-2 border border-purple-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none bg-white text-black disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
          />
          <button
            onClick={async (e) => {
              e.preventDefault();
              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
              if (input && input.value.trim() && !sending) {
                const texto = input.value.trim();
                input.value = '';
                try {
                  await enviarMensaje(texto);
                } catch (error) {
                  console.error('Error enviando mensaje:', error);
                }
              }
            }}
            disabled={sending}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center font-medium shadow-sm hover:shadow-md"
          >
            {sending ? '⏳' : '💬'}
          </button>
        </div>
      </div>
    </div>
  );
}
