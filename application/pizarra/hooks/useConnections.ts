import { useState, useCallback } from 'react';
import { Connection, Card } from '../types';
import { generateUniqueId } from '../utils/idGenerator';

interface UseConnectionsProps {
  cards: Card[];
  onConnectionCreate?: (connection: Connection, fromCard: Card, toCard: Card) => void;
}

export const useConnections = ({ cards, onConnectionCreate }: UseConnectionsProps) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleConnectionPointClick = useCallback((
    e: React.MouseEvent<HTMLDivElement>,
    cardId: string,
    canvasRef: React.RefObject<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isConnecting) {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
      setIsConnecting(true);
      setConnectingFrom(cardId);
    } else {
      if (connectingFrom === cardId) {
        setIsConnecting(false);
        setConnectingFrom(null);
      } else {
        // Allow multiple connections - just check if exact same connection exists
        const connectionExists = connections.some(conn =>
          conn.from === connectingFrom && conn.to === cardId
        );

        if (!connectionExists) {
          const newConnection = {
            id: `connection-${connectingFrom}-${cardId}-${Date.now()}`,
            from: connectingFrom ?? undefined,
            to: cardId
          };
          setConnections(prev => [...prev, newConnection]);

          // Llamar callback si existe
          if (onConnectionCreate && connectingFrom) {
            const fromCard = cards.find(c => c.id === connectingFrom);
            const toCard = cards.find(c => c.id === cardId);
            if (fromCard && toCard) {
              // Llamar al callback
              onConnectionCreate(newConnection, fromCard, toCard);

              // Disparar evento personalizado para actualización instantánea
              console.log('[CONEXION] Disparando evento conexion-creada', {
                from_card_id: connectingFrom,
                to_card_id: cardId,
                fromCard,
                toCard
              });

              window.dispatchEvent(new CustomEvent('conexion-creada', {
                detail: {
                  connection_id: newConnection.id,
                  from_card_id: connectingFrom,
                  to_card_id: cardId,
                  fromCard: fromCard,
                  toCard: toCard
                }
              }));
            }
          }
        }
        setIsConnecting(false);
        setConnectingFrom(null);
      }
    }
  }, [isConnecting, connectingFrom, connections, cards, onConnectionCreate]);

  const handleCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>, cardId: string) => {
    if (isConnecting &&
      !(e.target as HTMLElement).closest('[data-connection-button]') &&
      !(e.target as HTMLElement).closest('[data-config-button]')) {
      e.preventDefault();
      e.stopPropagation();

      if (connectingFrom === cardId) {
        setIsConnecting(false);
        setConnectingFrom(null);
      } else {
        // Allow multiple connections - just check if exact same connection exists
        const connectionExists = connections.some(conn =>
          conn.from === connectingFrom && conn.to === cardId
        );

        if (!connectionExists) {
          const newConnection = {
            id: `connection-${connectingFrom}-${cardId}-${Date.now()}`,
            from: connectingFrom ?? undefined,
            to: cardId
          };
          setConnections(prev => [...prev, newConnection]);

          // Llamar callback si existe
          if (onConnectionCreate && connectingFrom) {
            const fromCard = cards.find(c => c.id === connectingFrom);
            const toCard = cards.find(c => c.id === cardId);
            if (fromCard && toCard) {
              // Llamar al callback
              onConnectionCreate(newConnection, fromCard, toCard);

              // Disparar evento personalizado para actualización instantánea
              console.log('[CONEXION] Disparando evento conexion-creada', {
                from_card_id: connectingFrom,
                to_card_id: cardId,
                fromCard,
                toCard
              });

              window.dispatchEvent(new CustomEvent('conexion-creada', {
                detail: {
                  connection_id: newConnection.id,
                  from_card_id: connectingFrom,
                  to_card_id: cardId,
                  fromCard: fromCard,
                  toCard: toCard
                }
              }));
            }
          }
        }
        setIsConnecting(false);
        setConnectingFrom(null);
      }
    }
  }, [isConnecting, connectingFrom, connections, cards, onConnectionCreate]);

  const updateMousePosition = useCallback((x: number, y: number) => {
    setMousePosition({ x, y });
  }, []);

  const deleteConnection = useCallback((connectionId: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
  }, []);

  return {
    connections,
    setConnections,
    isConnecting,
    connectingFrom,
    mousePosition,
    handleConnectionPointClick,
    handleCardClick,
    updateMousePosition,
    deleteConnection
  };
};
