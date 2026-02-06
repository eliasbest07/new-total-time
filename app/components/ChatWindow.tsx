'use client';

import { useRef, useEffect, useState } from 'react';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useRouter } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { SharedCardPreview } from '@/components/chat/SharedCardPreview';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const router = useRouter();

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

  // Establecer mensaje inicial cuando se abre la ventana
  useEffect(() => {
    if (initialMessage) {
      setInputValue(initialMessage);
      // Enfocar el input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [initialMessage]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white">
        <div className="relative">
          <div className={`w-12 h-12 rounded-full ${targetUser.color || 'bg-gray-500'} flex items-center justify-center text-white font-semibold shadow-md overflow-hidden`}>
            {targetUser.avatar && (targetUser.avatar.startsWith('http://') || targetUser.avatar.startsWith('https://')) ? (
              <img
                src={targetUser.avatar}
                alt={targetUser.name}
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
              style={{ display: (targetUser.avatar && (targetUser.avatar.startsWith('http://') || targetUser.avatar.startsWith('https://'))) ? 'none' : 'flex' }}
            >
              {targetUser.avatar && !(targetUser.avatar.startsWith('http://') || targetUser.avatar.startsWith('https://')) ? targetUser.avatar : targetUser.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
          {targetUser.online && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 text-lg">
            {targetUser.name}
          </h3>
          <div className={`inline-flex items-center gap-1 text-sm ${targetUser.online ? 'text-green-600' : 'text-gray-500'}`}>
            <div className={`w-2 h-2 rounded-full ${targetUser.online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="font-medium">
              {targetUser.online ? 'En línea' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Botón para ir a la pizarra del usuario */}
        <button
          onClick={() => router.push(`/pizarra/${targetUser.userId}`)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 group"
          title="Pizarra"
        >
          <LayoutGrid className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
        </button>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
        {loading && (
          <div className="text-center text-gray-500 text-sm py-4">
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
          const tieneCard = !!mensaje.idCardRef;
          return (
            <div
              key={mensaje.id}
              className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg shadow-sm ${
                  tieneCard ? 'p-2' : 'px-3 py-2'
                } ${
                  esMio
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900 border border-gray-200'
                }`}
              >
                {tieneCard ? (
                  <SharedCardPreview cardId={mensaje.idCardRef!} esMio={esMio} />
                ) : (
                  <p className="break-words">{mensaje.texto}</p>
                )}
                <span className={`text-xs ${tieneCard ? 'px-2' : ''} ${esMio ? 'text-blue-100' : 'text-gray-500'}`}>
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
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={sending ? 'Enviando...' : 'Escribe un mensaje...'}
            disabled={sending}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && inputValue.trim() && !sending) {
                const texto = inputValue.trim();
                setInputValue('');
                try {
                  await enviarMensaje(texto);
                } catch (error) {
                  console.error('Error enviando mensaje:', error);
                }
              }
            }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white text-black disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
          />
          <button
            onClick={async (e) => {
              e.preventDefault();
              if (inputValue.trim() && !sending) {
                const texto = inputValue.trim();
                setInputValue('');
                try {
                  await enviarMensaje(texto);
                } catch (error) {
                  console.error('Error enviando mensaje:', error);
                }
              }
            }}
            disabled={sending}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center font-medium shadow-sm hover:shadow-md"
          >
            {sending ? '⏳' : '💬'}
          </button>
        </div>
      </div>
    </div>
  );
}
