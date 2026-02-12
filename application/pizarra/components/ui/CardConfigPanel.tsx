import React from 'react';
import { Card } from '../../types';

interface CardConfigPanelProps {
  card: Card;
  isOpen: boolean;
  onClose: () => void;
  onOpenConfig: () => void;
  onChangeFontSize: (cardId: string, increment: number) => void;
  onEditTitle: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onTogglePersistent?: (cardId: string, isPersistent: boolean) => void;
  onShareCard?: (cardId: string) => void;
}

export const CardConfigPanel: React.FC<CardConfigPanelProps> = ({
  card,
  isOpen,
  onClose,
  onOpenConfig,
  onChangeFontSize,
  onEditTitle,
  onDeleteCard,
  onTogglePersistent,
  onShareCard
}) => {
  return (
    <div
      data-config-button="true"
      className={`absolute top-1 left-1 z-30 transition-all duration-300 ${isOpen ? 'w-48' : 'w-8'}`}
    >
      {isOpen ? (
        <div className="bg-gray-800 rounded-lg p-3 shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-white text-xs font-medium">Configuración</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="text-white hover:text-gray-300 text-xs"
            >
              ✕
            </button>
          </div>

          {/* Control de tamaño de fuente */}
          <div className="mb-3">
            <label className="text-white text-xs block mb-1">Tamaño texto:</label>
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChangeFontSize(card.id, -2);
                }}
                className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs"
                disabled={(card.fontSize || 18) <= 12}
              >
                A-
              </button>
              <span className="text-white text-xs px-2 py-1">{card.fontSize || 18}px</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChangeFontSize(card.id, 2);
                }}
                className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs"
                disabled={(card.fontSize || 18) >= 32}
              >
                A+
              </button>
            </div>
          </div>

          {/* Botón editar título */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEditTitle(card.id);
              onClose();
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs mb-2"
          >
            ✏️ Editar título
          </button>

          {/* Botón persistir */}
          {onTogglePersistent && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePersistent(card.id, !card.isPersistent);
                onClose();
              }}
              className={`w-full px-2 py-1 rounded text-xs mb-2 ${
                card.isPersistent
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-white'
              }`}
            >
              {card.isPersistent ? '📌 Quitar persistencia' : '📌 Persistir'}
            </button>
          )}

          {/* Botón compartir */}
          {onShareCard && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShareCard(card.id);
                onClose();
              }}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded text-xs mb-2"
            >
              🔗 Compartir
            </button>
          )}

          {/* Botón eliminar */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDeleteCard(card.id);
            }}
            className="w-full bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs"
          >
            🗑️ Eliminar card
          </button>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenConfig();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="w-8 h-8 bg-gray-700 hover:bg-gray-800 text-white rounded-md flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg"
        >
          <span className="text-xs">⚙️</span>
        </button>
      )}
    </div>
  );
};
