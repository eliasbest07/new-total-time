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
  zoomLevel?: number;
}

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  connections,
  cards,
  panOffset,
  isConnecting,
  connectingFrom,
  mousePosition,
  deleteConnection,
  navigateToCard,
  zoomLevel = 1
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

        // Calcular la longitud y dirección de la línea
        const deltaX = toEdge.x - fromEdge.x;
        const deltaY = toEdge.y - fromEdge.y;
        const lineLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Vector unitario de la dirección
        const unitX = deltaX / lineLength;
        const unitY = deltaY / lineLength;

        // Calcular ángulos para rotar las flechas de navegación
        const angleToOrigin = Math.atan2(fromEdge.y - toEdge.y, fromEdge.x - toEdge.x) * (180 / Math.PI);
        const angleToDestination = Math.atan2(toEdge.y - fromEdge.y, toEdge.x - fromEdge.x) * (180 / Math.PI);

        // Posicionar botones a lo largo de la línea, un poco adentro desde cada extremo
        const offsetFromEdge = 25; // Distancia desde el borde hacia el centro de la línea

        // Botones en el ORIGEN: un poco adentro desde fromEdge hacia toEdge
        const originButtonsX = fromEdge.x + (unitX * offsetFromEdge) - 22;
        const originButtonsY = fromEdge.y + (unitY * offsetFromEdge) - 10;

        // Botón en el DESTINO: un poco adentro desde toEdge hacia fromEdge
        const destButtonX = toEdge.x - (unitX * offsetFromEdge) - 10;
        const destButtonY = toEdge.y - (unitY * offsetFromEdge) - 10;

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
                {/* Grupo de botones en el ORIGEN: eliminar + navegar al destino */}
                <foreignObject
                  x={originButtonsX}
                  y={originButtonsY}
                  width="45"
                  height="20"
                  className="pointer-events-auto"
                >
                  <div className="flex gap-1">
                    {/* Delete button */}
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
                    {/* Navigate to destination button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (navigateToCard && connection.to) {
                          navigateToCard(connection.to);
                        }
                      }}
                      className="w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs transition-colors shadow-lg"
                      style={{
                        transform: `rotate(${angleToDestination}deg)`
                      }}
                      title="Navegar al destino"
                    >
                      →
                    </button>
                  </div>
                </foreignObject>
                {/* Botón en el DESTINO: navegar al origen */}
                <foreignObject
                  x={destButtonX}
                  y={destButtonY}
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

        // Compensar el zoom dividiendo las coordenadas del mouse
        const cursorX = (mousePosition.x / zoomLevel) - panOffset.x;
        const cursorY = (mousePosition.y / zoomLevel) - panOffset.y;
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
