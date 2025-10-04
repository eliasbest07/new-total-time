import React from 'react';
import { Card, Connection } from '../../types';
import { getCardEdgePoint } from '../../utils/positionHelpers';

interface ConnectionLinesProps {
  connections: Connection[];
  cards: Card[];
  panOffset: { x: number; y: number };
  isConnecting: boolean;
  connectingFrom: string | null;
  mousePosition: { x: number; y: number };
}

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  connections,
  cards,
  panOffset,
  isConnecting,
  connectingFrom,
  mousePosition
}) => {
  return (
    <svg
      className="absolute inset-0 pointer-events-none z-40 w-full h-full"
      style={{
        transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
        overflow: 'visible'
      }}
    >
      {/* Líneas de conexión establecidas */}
      {connections.map(connection => {
        const fromCard = cards.find(card => card.id === connection.from);
        const toCard = cards.find(card => card.id === connection.to);

        if (!fromCard || !toCard) return null;

        const toCenterX = toCard.x + toCard.width / 2;
        const toCenterY = toCard.y + toCard.height / 2;

        const fromEdge = getCardEdgePoint(fromCard, toCenterX, toCenterY);
        const toEdge = getCardEdgePoint(toCard, fromEdge.x, fromEdge.y);

        return (
          <line
            key={connection.id}
            x1={fromEdge.x}
            y1={fromEdge.y}
            x2={toEdge.x}
            y2={toEdge.y}
            stroke="#000000"
            strokeWidth="3"
            markerEnd="url(#arrowhead)"
          />
        );
      })}

      {/* Línea temporal durante modo conexión */}
      {isConnecting && connectingFrom && (() => {
        const fromCard = cards.find(card => card.id === connectingFrom);
        if (!fromCard) return null;

        const cursorX = mousePosition.x - panOffset.x;
        const cursorY = mousePosition.y - panOffset.y;
        const fromEdge = getCardEdgePoint(fromCard, cursorX, cursorY);

        return (
          <line
            x1={fromEdge.x}
            y1={fromEdge.y}
            x2={cursorX}
            y2={cursorY}
            stroke="#000000"
            strokeWidth="3"
            opacity="1"
          />
        );
      })()}

      {/* Definir marcador de flecha */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#000000"
          />
        </marker>
      </defs>
    </svg>
  );
};
