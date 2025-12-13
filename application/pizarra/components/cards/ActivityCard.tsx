import React from 'react';
import { Card } from '../../types';

interface ActivityCardProps {
  card: Card;
  editingTitle: string | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
  handleActivityPlayPause: (cardId: string, isRunning: boolean) => void;
  onShowScreenshots?: (cardId: string) => void;
  screenshots: any[];
  isCapturing: boolean;
  captureNow?: () => Promise<string | null>;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle,
  handleActivityPlayPause,
  onShowScreenshots,
  screenshots,
  isCapturing,
  captureNow
}) => {
  
  // SIMPLE: Función de captura que siempre funciona
  const handleSimpleCapture = async () => {
    if (!captureNow) {
      alert('❌ Función de captura no disponible');
      return;
    }
    
    try {
      const captureUrl = await captureNow();
      if (captureUrl) {
        alert('✅ ¡Captura tomada!');
      } else {
        alert('❌ Error en captura');
      }
    } catch (error) {
      alert('❌ Error: ' + error);
    }
  };
  const cardScreenshots = screenshots.filter(s => {
    const actividadId = parseInt(card.id.split('-')[1]) || 0;
    return s.actividadId === actividadId;
  });

  return (
    <div className="flex flex-col h-full w-full p-3">
      {/* Header con icono y título */}
      <div className="flex items-center gap-2 mb-3 border-b border-blue-200 pb-2">
        <div style={{ fontSize: `${Math.max(16, (card.fontSize || 18) + 2)}px` }}>📅</div>
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
            className="font-semibold text-blue-800 flex-1 bg-transparent border-b border-blue-400 focus:outline-none"
            autoFocus
            data-todo-interactive
          />
        ) : (
          <h3
            className="font-semibold text-blue-800 truncate flex-1"
            style={{ fontSize: `${card.fontSize || 18}px` }}
          >
            {card.activityData?.subject || card.title}
          </h3>
        )}
      </div>

      {/* Fecha y hora */}
      <div className="mb-3">
        <div
          className="text-blue-700 font-medium"
          style={{ fontSize: `${(card.fontSize || 18) - 2}px` }}
        >
          📅 {card.activityData?.date || '15 dic, 2025'}
        </div>
        <div
          className="text-blue-600"
          style={{ fontSize: `${(card.fontSize || 18) - 3}px` }}
        >
          🕐 {card.activityData?.time || '2:30 PM - 3:30 PM'}
        </div>
      </div>

      {/* Participantes */}
      <div className="mb-3 flex-1">
        <div
          className="text-blue-700 font-medium mb-2"
          style={{ fontSize: `${(card.fontSize || 18) - 2}px` }}
        >
          👥 Participante:
        </div>
        <div className="flex flex-wrap gap-1">
          {(card.activityData?.participants || [
            { name: 'Elias M.', initial: 'MM', color: 'bg-blue-500' },
            { name: 'Juan P.', initial: 'JP', color: 'bg-green-500' },
            { name: 'María R.', initial: 'MR', color: 'bg-purple-500' }
          ]).map((participant, index) => (
            <div
              key={index}
              className={`${participant.color} text-white rounded-full flex items-center justify-center font-bold shadow-sm`}
              style={{
                width: `${Math.max(24, (card.fontSize || 18) + 6)}px`,
                height: `${Math.max(24, (card.fontSize || 18) + 6)}px`,
                fontSize: `${Math.max(8, (card.fontSize || 18) - 8)}px`
              }}
              title={participant.name}
            >
              {participant.initial}
            </div>
          ))}
        </div>
      </div>

      {/* Timer y botones */}
      <div className="flex items-center justify-between bg-blue-100 rounded-lg p-2">
        <div
          className="text-blue-800 font-mono font-bold"
          style={{ fontSize: `${Math.max(14, (card.fontSize || 18))}px` }}
        >
          {card.activityData?.timeLeft
            ? `${Math.floor(card.activityData.timeLeft / 60)}:${(card.activityData.timeLeft % 60).toString().padStart(2, '0')}`
            : '22:59'
          }
        </div>
        <div className="flex gap-2">
          {/* Botón de captura manual */}
          {captureNow && (
            <button
              onClick={handleSimpleCapture}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 transition-colors shadow-md"
              data-todo-interactive
              style={{
                width: `${Math.max(32, (card.fontSize || 18) + 14)}px`,
                height: `${Math.max(32, (card.fontSize || 18) + 14)}px`
              }}
            >
              <div style={{ fontSize: `${Math.max(12, (card.fontSize || 18) - 6)}px` }}>
                📸
              </div>
            </button>
          )}

          {/* Botón de screenshots */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onShowScreenshots?.(card.id);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white rounded-full p-2 transition-colors shadow-md relative"
            data-todo-interactive
            style={{
              width: `${Math.max(32, (card.fontSize || 18) + 14)}px`,
              height: `${Math.max(32, (card.fontSize || 18) + 14)}px`
            }}
          >
            <div style={{ fontSize: `${Math.max(12, (card.fontSize || 18) - 6)}px` }}>
              📷
            </div>
            {cardScreenshots.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {cardScreenshots.length}
              </span>
            )}
          </button>

          {/* Botón play/pause o botón "Comenzar" */}
          {(card.activityData?.timeLeft || 0) < 0 ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleActivityPlayPause(card.id, card.activityData?.isRunning || false);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 transition-colors shadow-md font-semibold"
              data-todo-interactive
              style={{ fontSize: `${Math.max(12, (card.fontSize || 18) - 4)}px` }}
            >
              Comenzar
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleActivityPlayPause(card.id, card.activityData?.isRunning || false);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 transition-colors shadow-md"
              data-todo-interactive
              style={{
                width: `${Math.max(32, (card.fontSize || 18) + 14)}px`,
                height: `${Math.max(32, (card.fontSize || 18) + 14)}px`
              }}
            >
              <div style={{ fontSize: `${Math.max(12, (card.fontSize || 18) - 6)}px` }}>
                {card.activityData?.isRunning ? '⏸️' : '▶️'}
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
