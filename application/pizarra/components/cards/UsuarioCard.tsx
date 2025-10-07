import React from 'react';
import { Card, ChatMessage } from '../../types/index';

interface UsuarioCardProps {
  card: Card;
  editingTitle: string | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
}

export const UsuarioCard: React.FC<UsuarioCardProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle,
  setCards
}) => {
  return (
    <div className="flex flex-col h-full w-full p-3">
      {/* Header con avatar y nombre */}
      <div className="flex items-center gap-2 mb-2 border-b border-purple-200 pb-2">
        <div className="relative">
          <div className={`w-10 h-10 rounded-full ${card.usuarioData?.color || 'bg-purple-500'} flex items-center justify-center text-white font-semibold shadow-md`}
            style={{ fontSize: `${(card.fontSize || 18) - 4}px` }}
          >
            {card.usuarioData?.avatar || 'US'}
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
      </div>

      {/* Mensajes del chat */}
      <div className="flex-1 overflow-y-auto mb-2 space-y-1.5 min-h-0"
        style={{ fontSize: `${(card.fontSize || 18) - 4}px` }}
      >
        {(card.usuarioData?.messages || []).map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-2 py-1 ${message.sender === 'me'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 text-purple-900'
                }`}
            >
              <p className="break-words">{message.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input de mensaje */}
      <div className="flex gap-1" data-todo-interactive>
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              const newMessage: ChatMessage = {
                id: Date.now(),
                text: e.currentTarget.value.trim(),
                sender: 'me',
                timestamp: new Date()
              };
              setCards(prev => prev.map(c =>
                c.id === card.id && c.usuarioData
                  ? {
                      ...c,
                      usuarioData: {
                        ...c.usuarioData,
                        messages: [...(c.usuarioData.messages || []), newMessage]
                      }
                    }
                  : c
              ));
              e.currentTarget.value = '';
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          className="flex-1 px-2 py-1.5 border border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white text-black"
          style={{ fontSize: `${(card.fontSize || 18) - 4}px` }}
          data-todo-interactive
        />
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
            if (input && input.value.trim()) {
              const newMessage: ChatMessage = {
                id: Date.now(),
                text: input.value.trim(),
                sender: 'me',
                timestamp: new Date()
              };
              setCards(prev => prev.map(c =>
                c.id === card.id && c.usuarioData
                  ? {
                      ...c,
                      usuarioData: {
                        ...c.usuarioData,
                        messages: [...(c.usuarioData.messages || []), newMessage]
                      }
                    }
                  : c
              ));
              input.value = '';
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors duration-200 flex items-center justify-center"
          style={{ fontSize: `${(card.fontSize || 18) - 4}px` }}
          data-todo-interactive
        >
          💬
        </button>
      </div>
    </div>
  );
};
