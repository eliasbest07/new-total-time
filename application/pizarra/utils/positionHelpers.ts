import { Card } from '../types';

export const getCardCenter = (card: Card) => {
  return {
    x: card.x + card.width / 2,
    y: card.y + card.height / 2
  };
};

export const getCardButtonPosition = (card: Card) => {
  return {
    x: card.x + card.width - 4,
    y: card.y - 8
  };
};

export const getCardEdgePoint = (fromCard: Card, toX: number, toY: number) => {
  const centerX = fromCard.x + fromCard.width / 2;
  const centerY = fromCard.y + fromCard.height / 2;

  const dx = toX - centerX;
  const dy = toY - centerY;

  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
    return { x: centerX, y: centerY };
  }

  let edgeX, edgeY;

  const halfWidth = fromCard.width / 2;
  const halfHeight = fromCard.height / 2;

  const absRatioX = Math.abs(dx / halfWidth);
  const absRatioY = Math.abs(dy / halfHeight);

  if (absRatioX > absRatioY) {
    edgeX = dx > 0 ? fromCard.x + fromCard.width : fromCard.x;
    edgeY = centerY + (dy * halfWidth) / Math.abs(dx);
  } else {
    edgeY = dy > 0 ? fromCard.y + fromCard.height : fromCard.y;
    edgeX = centerX + (dx * halfHeight) / Math.abs(dy);
  }

  return { x: edgeX, y: edgeY };
};
