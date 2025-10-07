import React from 'react';
import { Card } from '../../types';

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
      <div className="flex-1 flex flex-col justify-center items-center gap-2">
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
        <div className="bg-green-200 rounded border-2 border-green-300 overflow-hidden w-40" style={{ aspectRatio: '16/9' }}>
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
    </div>
  );
};
