import { useState, useCallback } from 'react';
import { Card } from '../types';

export const useCardResize = (
  cards: Card[],
  setCards: React.Dispatch<React.SetStateAction<Card[]>>
) => {
  const [resizingCard, setResizingCard] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const handleResizeStart = useCallback((e: React.MouseEvent, cardId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    setResizingCard(cardId);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: card.width,
      height: card.height
    });
  }, [cards]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingCard) return;

    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;

    const newWidth = Math.max(250, Math.min(600, resizeStart.width + deltaX));
    const newHeight = Math.max(200, Math.min(500, resizeStart.height + deltaY));

    setCards(prev => prev.map(card =>
      card.id === resizingCard
        ? { ...card, width: newWidth, height: newHeight }
        : card
    ));
  }, [resizingCard, resizeStart, setCards]);

  const handleResizeEnd = useCallback(() => {
    setResizingCard(null);
  }, []);

  return {
    resizingCard,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd
  };
};
