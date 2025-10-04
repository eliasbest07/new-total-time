import React from 'react';
import { Card } from '../../types';
import { getCardIcon } from '../../utils/cardHelpers';

interface GenericCardProps {
  card: Card;
  editingTitle: string | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
}

export const GenericCard: React.FC<GenericCardProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle
}) => {
  return (
    <div className="flex items-start gap-2 h-full">
      <div style={{ fontSize: `${Math.max(20, (card.fontSize || 18) + 8)}px` }}>{getCardIcon(card.type)}</div>
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
            className="font-semibold text-gray-800 w-full bg-transparent border-b border-gray-400 focus:outline-none"
            autoFocus
            data-todo-interactive
          />
        ) : (
          <h3
            className="font-semibold text-gray-800 truncate"
            style={{ fontSize: `${card.fontSize || 18}px` }}
          >
            {card.title}
          </h3>
        )}
        <p
          className="text-gray-600 mt-1 line-clamp-3"
          style={{ fontSize: `${(card.fontSize || 18) - 2}px` }}
        >
          {card.content}
        </p>
      </div>
    </div>
  );
};
