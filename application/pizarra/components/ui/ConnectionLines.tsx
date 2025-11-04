import React from 'react';
import { Card, Connection } from '../../types/index';
import { getCardEdgePoint } from '../../utils/positionHelpers';

interface ConnectionLinesProps {
  connections: Connection[];
  cards: Card[];
  panOffset: { x: number; y: number };
  isConnecting: boolean;
  connectingFrom: string | null;
  mousePosition: { x: number; y: number };
  deleteConnection: (connectionId: string) => void;
  navigateToCard?: (cardId: string) => void;
}

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  connections,
  cards,
  panOffset,
  isConnecting,
  connectingFrom,
  mousePosition,
  deleteConnection,
  navigateToCard
}) => {
  const [hoveredConnection, setHoveredConnection] = React.useState<string | null>(null);
  return (
    <svg
      className="absolute inset-0 pointer-events-none z-0 w-full h-full"
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

        // Position delete button at arrow start point
        const deleteX = fromEdge.x;
        const deleteY = fromEdge.y;

        // Detectar la dirección de la flecha para posicionar el botón correctamente
        const deltaX = toEdge.x - fromEdge.x;
        const deltaY = toEdge.y - fromEdge.y;
        const isPointingLeft = deltaX < 0; // Flecha apunta hacia la izquierda
        const isPointingUp = deltaY < 0; // Flecha apunta hacia arriba

        // Calcular el ángulo de la flecha para determinar la dirección predominante
        const angle = Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * (180 / Math.PI);
        const isMoreVertical = angle > 45; // Si el ángulo es > 45°, la flecha es más vertical que horizontal

        // Calcular el ángulo desde el destino hacia el origen (para rotar la flecha del botón)
        const angleToOrigin = Math.atan2(fromEdge.y - toEdge.y, fromEdge.x - toEdge.x) * (180 / Math.PI);

        // Ajustar posición del botón según la dirección
        let navButtonX, navButtonY;

        if (isMoreVertical) {
          // Flecha principalmente vertical - colocar botón a un lado
          navButtonX = toEdge.x + (isPointingLeft ? 5 : -22);
          navButtonY = isPointingUp ? toEdge.y + 5 : toEdge.y - 22;
        } else {
          // Flecha principalmente horizontal
          navButtonX = isPointingLeft ? toEdge.x + 5 : toEdge.x - 22;
          navButtonY = toEdge.y - 10; // Centrado verticalmente
        }

        return (
          <g
            key={connection.id}
            onMouseEnter={() => setHoveredConnection(connection.id)}
            onMouseLeave={() => setHoveredConnection(null)}
          >
            {/* Clickable invisible line for better interaction */}
            <line
              x1={fromEdge.x}
              y1={fromEdge.y}
              x2={toEdge.x}
              y2={toEdge.y}
              stroke="transparent"
              strokeWidth="20"
              className="pointer-events-auto cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (navigateToCard) {
                  navigateToCard(connection.to);
                }
              }}
            />
            {/* Visible line */}
            <line
              x1={fromEdge.x}
              y1={fromEdge.y}
              x2={toEdge.x}
              y2={toEdge.y}
              stroke={hoveredConnection === connection.id ? "#3b82f6" : "#000000"}
              strokeWidth="3"
              markerEnd="url(#arrowhead)"
              className="pointer-events-none"
            />
            {/* Buttons - only visible on hover */}
            {hoveredConnection === connection.id && (
              <>
                {/* Delete button at arrow start */}
                <foreignObject
                  x={deleteX - 5}
                  y={deleteY - 7}
                  width="20"
                  height="20"
                  className="pointer-events-auto"
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteConnection(connection.id);
                    }}
                    className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors shadow-lg"
                    title="Eliminar conexión"
                  >
                    ×
                  </button>
                </foreignObject>
                {/* Navigate button to origin - at destination point */}
                <foreignObject
                  x={navButtonX}
                  y={navButtonY}
                  width="20"
                  height="20"
                  className="pointer-events-auto"
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (navigateToCard && connection.from) {
                        navigateToCard(connection.from);
                      }
                    }}
                    className="w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs transition-colors shadow-lg"
                    style={{
                      transform: `rotate(${angleToOrigin}deg)`
                    }}
                    title="Navegar al origen"
                  >
                    →
                  </button>
                </foreignObject>
              </>
            )}
          </g>
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
