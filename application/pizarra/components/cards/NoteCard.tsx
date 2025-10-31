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
    // Guardar con Ctrl/Cmd + Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const value = e.currentTarget.value;
      updateCardContent(card.id, value);
      setEditingContent(false);
    }
    // Cerrar sin guardar con Escape
    if (e.key === 'Escape') {
      setEditingContent(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header con emoji y título */}
      <div className="flex items-center gap-2 flex-shrink-0 mb-2">
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
        </div>
      </div>

      {/* Área de contenido - ocupa todo el espacio restante */}
      <div className="flex-1 min-h-0 w-full">
        {editingContent ? (
          <textarea
            defaultValue={card.content}
            onBlur={(e) => handleContentBlur(e.target.value)}
            onKeyDown={handleContentKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="text-gray-600 w-full h-full bg-transparent border border-gray-400 rounded px-2 py-1 focus:outline-none focus:border-blue-500 resize-none overflow-y-auto"
            style={{
              fontSize: `${(card.fontSize || 18) - 2}px`
            }}
            autoFocus
            data-todo-interactive
          />
        ) : (
          <div
            className="text-gray-600 cursor-pointer hover:bg-gray-100 rounded px-2 py-1 transition-colors w-full h-full overflow-y-auto whitespace-pre-wrap break-words"
            style={{ fontSize: `${(card.fontSize || 18) - 2}px` }}
            onDoubleClick={handleContentDoubleClick}
            data-todo-interactive
          >
            {card.content}
          </div>
        )}
      </div>
    </div>
  );
};