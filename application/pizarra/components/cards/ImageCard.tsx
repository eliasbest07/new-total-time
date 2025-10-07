import React from 'react';
import { Card } from '../../types';

interface ImageCardProps {
  card: Card;
  editingTitle: string | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
  pastedImages: { [key: string]: string };
}

export const ImageCard: React.FC<ImageCardProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle,
  pastedImages
}) => {
  return (
    <div className="flex flex-col h-full w-full p-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <div style={{ fontSize: `${Math.max(16, (card.fontSize || 14) + 2)}px` }}>🖼️</div>
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
            className="font-semibold text-gray-800 flex-1 bg-transparent border-b border-gray-400 focus:outline-none text-sm"
            autoFocus
            data-todo-interactive
          />
        ) : (
          <h3
            className="font-semibold text-gray-800 flex-1 truncate"
            style={{ fontSize: `${card.fontSize || 14}px` }}
          >
            {card.title}
          </h3>
        )}
      </div>

      {/* Imagen */}
      <div className="flex-1 rounded-lg overflow-hidden border-2 border-pink-200 bg-pink-50 flex items-center justify-center">
        {pastedImages[card.id] ? (
          <img
            src={pastedImages[card.id]}
            alt={card.title}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-pink-400 text-4xl">🖼️</div>
        )}
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-500 mt-1 flex-shrink-0">
        {card.content}
      </div>
    </div>
  );
};
