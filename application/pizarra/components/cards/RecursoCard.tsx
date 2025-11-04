import React from 'react';
import { Card } from '../../types/index';
import { ExternalLink, FileText, File, Link as LinkIcon, Code, Image, Video, Download } from 'lucide-react';

interface RecursoCardProps {
  card: Card;
  editingTitle: string | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
}

// Función para obtener emoji según el tipo de archivo
const getEmojiForResourceType = (resourceType: string): string => {
  const typeMap: { [key: string]: string } = {
    'link': '🔗',
    'code': '💻',
    'image': '🖼️',
    'video': '🎥',
    'download': '📥',
    'file': '📄',
    'pdf': '📕',
    'doc': '📘',
    'spreadsheet': '📊',
    'presentation': '📽️',
    'audio': '🎵',
    'archive': '📦',
    'database': '🗄️'
  };

  return typeMap[resourceType.toLowerCase()] || '📎';
};

export const RecursoCard: React.FC<RecursoCardProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle
}) => {
  const recursoData = card.recursoData;
  const emoji = recursoData?.resourceType ? getEmojiForResourceType(recursoData.resourceType) : '📎';
  const hasUrl = recursoData?.url && recursoData.url.trim() !== '';

  return (
    <div className="flex flex-col h-full w-full p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
      {/* Header con emoji y título */}
      <div className="flex items-center gap-2 mb-3 border-b border-purple-200 pb-2">
        <div className="text-3xl flex-shrink-0">
          {emoji}
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
              className="font-semibold text-purple-900 bg-transparent border-b border-purple-400 focus:outline-none w-full text-sm"
              autoFocus
              data-todo-interactive
            />
          ) : (
            <h3
              className="font-semibold text-purple-900 truncate text-sm"
              style={{ fontSize: `${(card.fontSize || 14)}px` }}
            >
              {card.title}
            </h3>
          )}
        </div>
      </div>

      {/* Tipo de recurso */}
      <div className="mb-3">
        <div className="inline-block bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">
          {recursoData?.resourceType || 'Recurso'}
        </div>
      </div>

      {/* Botón para abrir link */}
      {hasUrl && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(recursoData.url!, '_blank');
          }}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-2"
          data-todo-interactive
        >
          <ExternalLink size={16} />
          Abrir enlace
        </button>
      )}

      {/* URL (si existe) */}
      {hasUrl && (
        <div className="mt-auto pt-2 border-t border-purple-200">
          <p className="text-xs text-purple-600 truncate" title={recursoData.url ?? undefined}>
            {recursoData.url}
          </p>
        </div>
      )}

      {/* Mensaje si no hay URL */}
      {!hasUrl && (
        <div className="flex-1 flex items-center justify-center text-purple-400 text-xs text-center">
          Sin enlace disponible
        </div>
      )}
    </div>
  );
};
