import React, { useState, useEffect, useRef } from 'react';
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

  // Estados para el contador de tiempo
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEntregarModal, setShowEntregarModal] = useState(false);
  const [entregaTexto, setEntregaTexto] = useState('');
  const [entregaImagen, setEntregaImagen] = useState<File | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Efecto para el contador de tiempo
  useEffect(() => {
    if (card.misionData?.isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [card.misionData?.isRunning]);

  // Efecto para actualizar el título de la pestaña del navegador
  useEffect(() => {
    if (card.misionData?.isRunning && elapsedSeconds > 0) {
      const timeString = formatTime(elapsedSeconds);
      const misionTitle = card.misionData?.title || card.title;
      document.title = `⏱️ ${timeString} - ${misionTitle}`;
    } else if (!card.misionData?.isRunning && elapsedSeconds > 0) {
      // Si se pausa, mostrar el tiempo pausado
      const timeString = formatTime(elapsedSeconds);
      const misionTitle = card.misionData?.title || card.title;
      document.title = `⏸️ ${timeString} - ${misionTitle}`;
    }

    // Restaurar el título original cuando se desmonte o cuando se reinicie
    return () => {
      if (elapsedSeconds === 0 || !card.misionData?.isRunning) {
        document.title = 'Pizarra'; // Título por defecto
      }
    };
  }, [card.misionData?.isRunning, elapsedSeconds, card.misionData?.title, card.title]);

  // Función para formatear el tiempo
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

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

  // Función para manejar play/pause
  // La solicitud de permiso de pantalla se maneja automáticamente en useScreenshots
  const handlePlayPauseClick = (cardId: string, isRunning: boolean) => {
    handleMisionPlayPause(cardId, isRunning);
  };

  // Función para manejar el botón de entregar
  const handleEntregar = () => {
    setShowEntregarModal(true);
    // Detener la misión (como si se diera pause)
    if (card.misionData?.isRunning) {
      handleMisionPlayPause(card.id, true);
    }
  };

  // Función para enviar la entrega
  const handleSubmitEntrega = () => {
    // Aquí puedes agregar la lógica para enviar la entrega al backend
    console.log('📦 Entrega:', {
      titulo: card.misionData?.title || card.title,
      tiempo: formatTime(elapsedSeconds),
      texto: entregaTexto,
      imagen: entregaImagen
    });

    // Cerrar modal y resetear formulario
    setShowEntregarModal(false);
    setEntregaTexto('');
    setEntregaImagen(null);
    setElapsedSeconds(0);
  };

  // Función para cancelar la entrega
  const handleCancelEntrega = () => {
    setShowEntregarModal(false);
    setEntregaTexto('');
    setEntregaImagen(null);
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

  // Determinar si está corriendo para cambiar colores
  const isRunning = card.misionData?.isRunning || false;
  const borderColor = isRunning ? 'border-orange-200' : 'border-green-200';
  const textColor = isRunning ? 'text-orange-800' : 'text-green-800';
  const textColorSecondary = isRunning ? 'text-orange-700' : 'text-green-700';
  const bgColor = isRunning ? 'bg-orange-600' : 'bg-green-600';
  const bgColorHover = isRunning ? 'hover:bg-orange-700' : 'hover:bg-green-700';

  // Modal de entrega
  if (showEntregarModal) {
    return (
      <div className="flex flex-col h-full w-full p-4 bg-white">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📦 Entregar Misión</h2>

        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Título de la misión */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              type="text"
              value={card.misionData?.title || card.title}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-700"
            />
          </div>

          {/* Tiempo transcurrido */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo transcurrido</label>
            <input
              type="text"
              value={formatTime(elapsedSeconds)}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-700"
            />
          </div>

          {/* Descripción/Comentarios */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción/Comentarios</label>
            <textarea
              value={entregaTexto}
              onChange={(e) => setEntregaTexto(e.target.value)}
              placeholder="Describe lo que realizaste..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[80px]"
              data-todo-interactive
            />
          </div>

          {/* Subir imagen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Imagen (opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setEntregaImagen(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              data-todo-interactive
            />
            {entregaImagen && (
              <p className="text-xs text-gray-600 mt-1">✓ {entregaImagen.name}</p>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleCancelEntrega}
            className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded transition-colors"
            data-todo-interactive
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmitEntrega}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            data-todo-interactive
          >
            Enviar Entrega
          </button>
        </div>
      </div>
    );
  }

  // Vista normal de la misión
  return (
    <div className="flex flex-col h-full w-full p-3">
      {/* Botón Entregar - Solo visible cuando está corriendo */}
      {isRunning && (
        <div className="flex justify-end mb-2">
          <button
            onClick={handleEntregar}
            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            data-todo-interactive
          >
            📦 Entregar
          </button>
        </div>
      )}

      {/* Contador de tiempo - Visible cuando está corriendo */}
      {isRunning && (
        <div className="text-center mb-2">
          <div className="bg-orange-100 border border-orange-300 rounded px-3 py-2">
            <span className="text-orange-900 font-mono text-lg font-bold">
              ⏱️ {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>
      )}

      {/* Header con icono, título y horas */}
      <div className={`flex items-center gap-2 mb-2 border-b ${borderColor} pb-2`}>
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
            className={`font-semibold ${textColor} flex-1 bg-transparent border-b ${isRunning ? 'border-orange-400' : 'border-green-400'} focus:outline-none`}
            autoFocus
            data-todo-interactive
          />
        ) : (
          <h3
            className={`font-semibold ${textColor} truncate flex-1`}
            style={{ fontSize: `${(card.fontSize || 18) - 2}px` }}
          >
            {card.misionData?.title || card.title}
          </h3>
        )}
        <div className={`${bgColor} text-white rounded-full px-2 py-1 font-bold text-xs`}>
          {card.misionData?.hours || 1}h
        </div>
      </div>

      {/* Descripción */}
      <div className="mb-2">
        <p
          className={textColorSecondary}
          style={{ fontSize: `${(card.fontSize || 18) - 4}px` }}
        >
          {card.misionData?.description || card.title}
        </p>
      </div>

      {/* Sección central con botón de play e imagen */}
      <div className="flex-1 flex flex-col justify-center items-center gap-2 data-todo-interactive">
        {/* Botón de play/pause centrado */}
        <button
          className={`${bgColor} ${bgColorHover} text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200 shadow-lg hover:shadow-xl`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handlePlayPauseClick(card.id, card.misionData?.isRunning || false);
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
          className={`${isRunning ? 'bg-orange-200 border-orange-300' : 'bg-green-200 border-green-300'} rounded border-2 overflow-hidden w-40`}
          style={{ aspectRatio: '16/9' }}
        >
          {card.misionData?.lastCaptureUrl ? (
            <img
              src={card.misionData.lastCaptureUrl}
              alt="Última captura"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${isRunning ? 'from-orange-300 to-orange-500' : 'from-green-300 to-green-500'} flex items-center justify-center`}>
              <div
                className={`${isRunning ? 'text-orange-800' : 'text-green-800'} font-medium text-center`}
                style={{ fontSize: `${(card.fontSize || 18) - 8}px` }}
              >
                📸
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input de chat al final del card */}
      <div className={`mt-2 pt-2 border-t ${borderColor}`}>
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
            className={`flex-1 px-2 py-1 text-xs border ${isRunning ? 'border-orange-300 focus:ring-orange-500' : 'border-green-300 focus:ring-green-500'} rounded focus:outline-none focus:ring-1 placeholder-gray-500 text-gray-700`}
            data-todo-interactive
          />
          <button
            onClick={handleSendMessage}
            className={`px-2 py-1 ${bgColor} ${bgColorHover} text-white rounded text-xs transition-colors`}
            data-todo-interactive
          >
            💬
          </button>
        </div>
      </div>
    </div>
  );
};
