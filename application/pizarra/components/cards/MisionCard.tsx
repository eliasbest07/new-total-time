import React, { useState } from 'react';
import { Card } from '../../types';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useAuth } from '@/app/contexts/AuthContext';

interface MisionCardProps {
  card: Card;
  editingTitle: string | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
  handleMisionPlayPause: (cardId: string, isRunning: boolean) => void;
  screenshots: any[];
  isCapturing: boolean;
}

export const MisionCard: React.FC<MisionCardProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle,
  handleMisionPlayPause,
  screenshots,
  isCapturing
}) => {
  const [chatMessage, setChatMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // Obtener el usuario actual (UUID del auth)
  const { usuario } = useAuth();
  const currentUserUuid = usuario?.id || null;

  // Obtener el UUID del creador directamente de misionData
  // Si no hay id_creador, usar el usuario actual como fallback (para misiones antiguas)
  const creadorUuid = card.misionData?.idCreador || currentUserUuid;

  console.log('💬 [MisionCard] currentUserUuid:', currentUserUuid);
  console.log('💬 [MisionCard] creadorUuid desde misionData:', card.misionData?.idCreador);
  console.log('💬 [MisionCard] creadorUuid final (con fallback):', creadorUuid);

  // Hook de chat para mensajes reales
  const {
    mensajes,
    loading: loadingMensajes,
    sending,
    enviarMensaje
  } = useChatMessages(currentUserUuid, creadorUuid);

  const handleSendMessage = async () => {
    console.log('💬 [handleSendMessage] Iniciando...');
    console.log('💬 [handleSendMessage] chatMessage:', chatMessage);
    console.log('💬 [handleSendMessage] currentUserUuid:', currentUserUuid);
    console.log('💬 [handleSendMessage] creadorUuid:', creadorUuid);

    if (chatMessage.trim() && currentUserUuid && creadorUuid) {
      try {
        console.log('💬 [handleSendMessage] Enviando mensaje...');
        const resultado = await enviarMensaje(chatMessage.trim());
        console.log('💬 [handleSendMessage] Resultado:', resultado);
        setChatMessage('');
        console.log('💬 Mensaje enviado exitosamente');
      } catch (error) {
        console.error('💬 Error enviando mensaje:', error);
      }
    } else {
      console.log('💬 [handleSendMessage] Condiciones no cumplidas:');
      console.log('  - chatMessage.trim():', chatMessage.trim());
      console.log('  - currentUserUuid:', currentUserUuid);
      console.log('  - creadorUuid:', creadorUuid);
    }
    // Siempre abrir el chat, con o sin mensaje
    setShowChat(true);
  };

  const handleSendNewMessage = async () => {
    console.log('💬 [handleSendNewMessage] Iniciando...');
    console.log('💬 [handleSendNewMessage] newMessage:', newMessage);
    console.log('💬 [handleSendNewMessage] currentUserUuid:', currentUserUuid);
    console.log('💬 [handleSendNewMessage] creadorUuid:', creadorUuid);

    if (newMessage.trim() && currentUserUuid && creadorUuid) {
      try {
        console.log('💬 [handleSendNewMessage] Enviando mensaje...');
        const resultado = await enviarMensaje(newMessage.trim());
        console.log('💬 [handleSendNewMessage] Resultado:', resultado);
        setNewMessage('');
        console.log('💬 Mensaje enviado exitosamente');
      } catch (error) {
        console.error('💬 Error enviando mensaje:', error);
      }
    } else {
      console.log('💬 [handleSendNewMessage] Condiciones no cumplidas:');
      console.log('  - newMessage.trim():', newMessage.trim());
      console.log('  - currentUserUuid:', currentUserUuid);
      console.log('  - creadorUuid:', creadorUuid);
    }
  };

  const handleBackToMision = () => {
    setShowChat(false);
    setNewMessage('');
  };

  // Vista de chat
  if (showChat) {
    return (
      <div className="flex flex-col h-full w-full p-3">
        {/* Header del chat sin botón volver */}
        <div className="flex items-center gap-2 mb-2 border-b border-green-200 pb-2">
          <div style={{ fontSize: `${Math.max(16, (card.fontSize || 18) + 2)}px` }}>💬</div>
          <h3
            className="font-semibold text-green-800 truncate flex-1"
            style={{ fontSize: `${(card.fontSize || 18) - 2}px` }}
          >
            Chat: {card.misionData?.title || card.title}
          </h3>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto mb-2 space-y-2">
          {loadingMensajes ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-4 h-4 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin" />
            </div>
          ) : mensajes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-xs">
              No hay mensajes aún
            </div>
          ) : (
            mensajes.map((msg) => {
              const esMio = currentUserUuid && msg.esDelUsuario(currentUserUuid);
              return (
                <div
                  key={msg.id}
                  className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      esMio
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-xs leading-tight">{msg.texto}</p>
                    <span className="text-[10px] opacity-70 mt-1 block">
                      {msg.createdAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input para nuevos mensajes y botón back */}
        <div className="border-t border-green-200 pt-2">
          <div className="flex gap-1 items-center">
            {/* Botón de volver en la esquina inferior izquierda */}
            <button
              onClick={handleBackToMision}
              className="text-green-700 hover:text-green-900 transition-colors text-lg font-bold px-2"
              data-todo-interactive
              title="Volver a la misión"
            >
              ←
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !sending) {
                  handleSendNewMessage();
                }
              }}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 placeholder-gray-500 text-gray-700"
              data-todo-interactive
              disabled={sending || !currentUserUuid || !creadorUuid}
            />
            <button
              onClick={handleSendNewMessage}
              disabled={!newMessage.trim() || sending || !currentUserUuid || !creadorUuid}
              className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded text-xs transition-colors"
              data-todo-interactive
            >
              {sending ? '...' : '➤'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista normal de la misión
  return (
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
      <div className="flex-1 flex flex-col justify-center items-center gap-2 data-todo-interactive">
        {/* Botón de play/pause centrado */}
        <button
          className="bg-green-600 hover:bg-green-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200 shadow-lg hover:shadow-xl"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMisionPlayPause(card.id, card.misionData?.isRunning || false);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          data-todo-interactive
        >
          <div style={{ fontSize: `${Math.max(14, (card.fontSize || 18) - 2)}px` }}>
            {card.misionData?.isRunning ? '⏸️' : '▶️'}
          </div>
        </button>

        {/* Imagen aspecto 16x9 - Muestra última captura */}
        <div
          className="bg-green-200 rounded border-2 border-green-300 overflow-hidden w-40"
          style={{ aspectRatio: '16/9' }}
        >
          {card.misionData?.lastCaptureUrl ? (
            <img
              src={card.misionData.lastCaptureUrl}
              alt="Última captura"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-300 to-green-500 flex items-center justify-center">
              <div
                className="text-green-800 font-medium text-center"
                style={{ fontSize: `${(card.fontSize || 18) - 8}px` }}
              >
                📸
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input de chat al final del card */}
      <div className="mt-2 pt-2 border-t border-green-200">
        <div className="flex gap-1">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            placeholder="Contactar..."
            className="flex-1 px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 placeholder-gray-500 text-gray-700"
            data-todo-interactive
          />
          <button
            onClick={handleSendMessage}
            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
            data-todo-interactive
          >
            💬
          </button>
        </div>
      </div>
    </div>
  );
};
