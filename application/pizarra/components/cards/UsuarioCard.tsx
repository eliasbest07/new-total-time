import React, { useEffect, useRef } from 'react';
import { Card, ChatMessage } from '../../types/index';
import { useAuth } from '@/app/contexts/AuthContext';
import { useChatMessages } from '@/hooks/useChatMessages';

interface UsuarioCardProps {
  card: Card;
  editingTitle: string | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
  onOpenUserChat?: (userData: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  }) => void;
}

export const UsuarioCard: React.FC<UsuarioCardProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle,
  setCards,
  onOpenUserChat
}) => {
  const { usuario } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hook para manejar mensajes en tiempo real con Supabase
  const {
    mensajes,
    loading,
    error,
    sending,
    enviarMensaje
  } = useChatMessages(
    usuario?.userAuth || null,
    card.usuarioData?.userId || null
  );

  // Función para abrir ventana de chat
  const handleOpenChatWindow = () => {
    if (!card.usuarioData || !onOpenUserChat) return;

    onOpenUserChat({
      userId: card.usuarioData.userId,
      name: card.usuarioData.name || card.title,
      avatar: card.usuarioData.avatar || 'US',
      color: card.usuarioData.color || 'bg-purple-600',
      online: card.usuarioData.online || false
    });
  };

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [mensajes]);

  // Manejar el scroll solo dentro del contenedor
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const element = e.currentTarget;
    const isScrollable = element.scrollHeight > element.clientHeight;

    if (isScrollable) {
      // Prevenir scroll de la página solo si estamos dentro del contenedor
      const atTop = element.scrollTop === 0 && e.deltaY < 0;
      const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight && e.deltaY > 0;

      if (!atTop && !atBottom) {
        e.preventDefault();
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-3">
      {/* Header con avatar y nombre */}
      <div className="flex items-center gap-2 mb-2 border-b border-purple-200 pb-2">
        <div className="relative">
          <div
  className={`w-10 h-10 rounded-full overflow-hidden ${card.usuarioData?.color || 'bg-purple-500'} flex items-center justify-center text-white font-semibold shadow-md`}
  style={{ fontSize: `${(card.fontSize || 18) - 4}px` }}
          >
            {card.usuarioData?.avatar ? (
              <img
                src={card.usuarioData.avatar}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              'US'
            )}
          </div>
          {card.usuarioData?.online && (
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white"></div>
          )}
        </div>
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
              className="font-semibold text-purple-800 bg-transparent border-b border-purple-400 focus:outline-none w-full"
              autoFocus
              data-todo-interactive
            />
          ) : (
            <h3
              className="font-semibold text-purple-800 truncate"
              style={{ fontSize: `${(card.fontSize || 18) - 2}px` }}
            >
              {card.usuarioData?.name || card.title}
            </h3>
          )}
          <div className={`inline-flex items-center gap-1 mt-0.5 ${card.usuarioData?.online ? 'text-green-600' : 'text-gray-500'
            }`}
            style={{ fontSize: `${(card.fontSize || 18) - 6}px` }}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${card.usuarioData?.online ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
            <span className="font-medium">
              {card.usuarioData?.online ? 'En línea' : 'Offline'}
            </span>
          </div>
        </div>
        {/* Botón para abrir ventana de chat */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleOpenChatWindow();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors duration-200 flex items-center justify-center"
          title="Abrir ventana de chat"
          data-todo-interactive
        >
          <span style={{ fontSize: `${(card.fontSize || 18) - 4}px` }}>💬</span>
        </button>
      </div>

      {/* Mensajes del chat */}
      <div
        className="flex-1 overflow-y-auto mb-2 space-y-1.5 min-h-0 scroll-smooth"
        style={{ fontSize: `${(card.fontSize || 18) - 4}px` }}
        onWheel={handleWheel}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {loading && (
          <div className="text-center text-purple-400 text-sm py-2">
            Cargando mensajes...
          </div>
        )}
        {error && (
          <div className="text-center text-red-500 text-sm py-2">
            {error}
          </div>
        )}
        {!loading && mensajes.map((mensaje) => {
          const esMio = mensaje.idEmisor === usuario?.userAuth;
          return (
            <div
              key={mensaje.id}
              className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-2 py-1 ${
                  esMio
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-900'
                }`}
              >
                <p className="break-words">{mensaje.texto}</p>
                <span className="text-xs opacity-70">
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

      {/* Input de mensaje */}
      <div className="flex gap-1" data-todo-interactive>
        <input
          type="text"
          placeholder={sending ? 'Enviando...' : 'Escribe un mensaje...'}
          disabled={sending || !card.usuarioData?.userId}
          onKeyDown={async (e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && e.currentTarget.value.trim() && !sending) {
              const texto = e.currentTarget.value.trim();
              e.currentTarget.value = '';
              try {
                await enviarMensaje(texto);
                // NO abrir ventana cuando YO envío el mensaje
              } catch (error) {
                console.error('Error enviando mensaje:', error);
              }
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          className="flex-1 px-2 py-1.5 border border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white text-black disabled:bg-gray-100 disabled:cursor-not-allowed"
          style={{ fontSize: `${(card.fontSize || 18) - 4}px` }}
          data-todo-interactive
        />
        <button
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
            if (input && input.value.trim() && !sending) {
              const texto = input.value.trim();
              input.value = '';
              try {
                await enviarMensaje(texto);
                // NO abrir ventana cuando YO envío el mensaje
              } catch (error) {
                console.error('Error enviando mensaje:', error);
              }
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          disabled={sending || !card.usuarioData?.userId}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-colors duration-200 flex items-center justify-center"
          style={{ fontSize: `${(card.fontSize || 18) - 4}px` }}
          data-todo-interactive
        >
          {sending ? '⏳' : '💬'}
        </button>
      </div>
    </div>
  );
};
