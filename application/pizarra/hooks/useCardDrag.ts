import { useState, useCallback, useRef } from 'react';
import { Card } from '../types';

export const useCardDrag = (
  cards: Card[],
  setCards: React.Dispatch<React.SetStateAction<Card[]>>,
  panOffset: { x: number; y: number },
  isConnecting: boolean,
  canvasRef: React.RefObject<HTMLDivElement>
) => {
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleCardMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, card: Card) => {
    if ((e.target as HTMLElement).closest('[data-connection-button]') ||
      (e.target as HTMLElement).closest('[data-config-button]') ||
      (e.target as HTMLElement).closest('[data-todo-interactive]')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (isConnecting) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - panOffset.x - card.x;
    const offsetY = e.clientY - rect.top - panOffset.y - card.y;

    setDraggedCard(card.id);
    setDragOffset({ x: offsetX, y: offsetY });
  }, [panOffset, isConnecting, canvasRef]);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current || !draggedCard) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - panOffset.x - dragOffset.x;
    const newY = e.clientY - rect.top - panOffset.y - dragOffset.y;

    setCards(prev => prev.map(card =>
      card.id === draggedCard
        ? { ...card, x: newX, y: newY }
        : card
    ));
  }, [draggedCard, dragOffset, panOffset, canvasRef, setCards]);

  const handleMouseUp = useCallback(() => {
    if (draggedCard) {
      setDraggedCard(null);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [draggedCard]);

  return {
    draggedCard,
    handleCardMouseDown,
    handleGlobalMouseMove,
    handleMouseUp
  };
};
