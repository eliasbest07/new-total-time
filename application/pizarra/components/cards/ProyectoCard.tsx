import React from 'react';
import { Card } from '../../types/index';

interface ProyectoCardProps {
  card: Card;
  editingTitle: string | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
}

export const ProyectoCard: React.FC<ProyectoCardProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle
}) => {
  return (
    <div className="flex flex-col h-full w-full p-2 overflow-y-auto todo-scroll">
      {/* Header con nombre e indicador público/privado */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-shrink-0">
        <div style={{ fontSize: `${Math.max(14, (card.fontSize || 14) + 2)}px` }}>📁</div>
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
            className="font-bold text-indigo-900 bg-transparent border-b border-indigo-400 focus:outline-none w-full text-sm"
            autoFocus
            data-todo-interactive
          />
        ) : (
          <h3
            className="font-bold text-indigo-900 flex-1 leading-tight"
            style={{ fontSize: `${(card.fontSize || 14)}px` }}
          >
            {card.proyectoData?.nombre || card.title}
          </h3>
        )}
        {card.proyectoData?.publico !== undefined && (
          <div
            className={`px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${card.proyectoData.publico
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
              }`}
            style={{ fontSize: '10px' }}
            title={card.proyectoData.publico ? 'Público' : 'Privado'}
          >
            {card.proyectoData.publico ? '🌐' : '🔒'}
          </div>
        )}
      </div>

      {/* Imagen del proyecto con overlay de producto */}
      <div className="mb-2 w-full rounded-lg overflow-hidden border-2 border-indigo-200 relative flex-shrink-0" style={{ height: '100px' }}>
        {card.proyectoData?.imagen_url ? (
          <img
            src={card.proyectoData.imagen_url}
            alt={card.proyectoData.nombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-200 via-indigo-300 to-indigo-400 flex items-center justify-center">
            <div
              className="text-indigo-700 font-bold"
              style={{ fontSize: `${(card.fontSize || 14) + 8}px` }}
            >
              📁
            </div>
          </div>
        )}
        {/* Overlay de producto */}
        {card.proyectoData?.producto && (
          <div className="absolute top-1 right-1 bg-indigo-600/90 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-xs font-medium">
            {card.proyectoData.producto}
          </div>
        )}
      </div>

      {/* Descripción */}
      {card.proyectoData?.description && (
        <div className="mb-2 flex-shrink-0">
          <p
            className="text-indigo-800 leading-snug line-clamp-2"
            style={{ fontSize: `${(card.fontSize || 14) - 2}px` }}
            title={card.proyectoData.description}
          >
            {card.proyectoData.description}
          </p>
        </div>
      )}

      {/* Paleta de colores */}
      {card.proyectoData?.colors && card.proyectoData.colors.length > 0 && (
        <div className="mb-2 flex-shrink-0">
          <div
            className="text-indigo-700 font-semibold mb-1"
            style={{ fontSize: `${(card.fontSize || 14) - 3}px` }}
          >
            🎨 Colores
          </div>
          <div className="flex gap-1 flex-wrap">
            {card.proyectoData.colors.slice(0, 6).map((color, index) => (
              <div
                key={index}
                className="rounded shadow-sm border border-indigo-200/50"
                style={{
                  backgroundColor: color,
                  width: '24px',
                  height: '24px'
                }}
                title={color}
              />
            ))}
            {card.proyectoData.colors.length > 6 && (
              <div
                className="rounded shadow-sm border border-indigo-200 bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold"
                style={{
                  width: '24px',
                  height: '24px',
                  fontSize: '10px'
                }}
                title={`+${card.proyectoData.colors.length - 6} colores más`}
              >
                +{card.proyectoData.colors.length - 6}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tags de tipo, utilidad y paleta */}
      <div className="flex gap-1 mt-2 flex-wrap flex-shrink-0">
        {card.proyectoData?.type && (
          <div className="bg-indigo-600 text-white rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm">
            {card.proyectoData.type}
          </div>
        )}
        {card.proyectoData?.utility && (
          <div className="bg-indigo-500 text-white rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm">
            {card.proyectoData.utility}
          </div>
        )}
        {card.proyectoData?.palette && (
          <div className="bg-purple-500 text-white rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm">
            {card.proyectoData.palette}
          </div>
        )}
      </div>
    </div>
  );
};
