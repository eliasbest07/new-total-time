import React, { useState } from 'react';
import { Card } from '../../types';

interface NoteCardProps {
  card: Card;
  editingTitle: string | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
  updateCardContent: (cardId: string, newContent: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle,
  updateCardContent
}) => {
  const [editingContent, setEditingContent] = useState(false);

  const handleContentDoubleClick = () => {
    setEditingContent(true);
  };

  const handleContentBlur = (value: string) => {
    updateCardContent(card.id, value);
    setEditingContent(false);
  };

  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const value = e.currentTarget.value;
      updateCardContent(card.id, value);
      setEditingContent(false);
    }
    if (e.key === 'Escape') {
      setEditingContent(false);
    }
  };

  return (
    <div className="flex items-start gap-2 h-full">
      <div style={{ fontSize: `${Math.max(20, (card.fontSize || 18) + 8)}px` }}>📝</div>
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
        
        {editingContent ? (
          <textarea
            defaultValue={card.content}
            onBlur={(e) => handleContentBlur(e.target.value)}
            onKeyDown={handleContentKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="text-gray-600 mt-1 w-full bg-transparent border border-gray-400 rounded px-2 py-1 focus:outline-none focus:border-blue-500 resize-none"
            style={{ 
              fontSize: `${(card.fontSize || 18) - 2}px`,
              minHeight: '60px'
            }}
            autoFocus
            data-todo-interactive
          />
        ) : (
          <p
            className="text-gray-600 mt-1 line-clamp-3 cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 transition-colors"
            style={{ fontSize: `${(card.fontSize || 18) - 2}px` }}
            onDoubleClick={handleContentDoubleClick}
            data-todo-interactive
          >
            {card.content}
          </p>
        )}
      </div>
    </div>
  );
};