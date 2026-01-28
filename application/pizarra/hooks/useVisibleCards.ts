import { useMemo, useCallback, useState, useEffect, RefObject } from 'react';
import { Card } from '../types';

interface ViewportDimensions {
  width: number;
  height: number;
}

interface VisibilityConfig {
  bufferMargin?: number; // Margen extra para pre-cargar cards cercanos
  debounceMs?: number;   // Debounce para evitar recálculos excesivos
}

/**
 * Determina si un card está visible en el viewport actual
 */
export function isCardVisible(
  card: Card,
  panOffset: { x: number; y: number },
  zoomLevel: number,
  viewport: ViewportDimensions,
  bufferMargin: number = 200
): boolean {
  // Calcular posición visual del card (en coordenadas de pantalla)
  const visualX = (card.x + panOffset.x) * zoomLevel;
  const visualY = (card.y + panOffset.y) * zoomLevel;

  // Dimensiones escaladas del card
  const scaledWidth = card.width * zoomLevel;
  const scaledHeight = card.height * zoomLevel;

  // Buffer escalado
  const scaledBuffer = bufferMargin * zoomLevel;

  // Comprobar si el card intersecta con el viewport + buffer
  const isVisibleX = (visualX + scaledWidth + scaledBuffer > 0) &&
                     (visualX - scaledBuffer < viewport.width);
  const isVisibleY = (visualY + scaledHeight + scaledBuffer > 0) &&
                     (visualY - scaledBuffer < viewport.height);

  return isVisibleX && isVisibleY;
}

/**
 * Filtra cards visibles de un array
 */
export function filterVisibleCards(
  cards: Card[],
  panOffset: { x: number; y: number },
  zoomLevel: number,
  viewport: ViewportDimensions,
  bufferMargin: number = 200
): Card[] {
  return cards.filter(card =>
    isCardVisible(card, panOffset, zoomLevel, viewport, bufferMargin)
  );
}

/**
 * Retorna un Set de IDs de cards visibles (más eficiente para lookups)
 */
export function getVisibleCardIds(
  cards: Card[],
  panOffset: { x: number; y: number },
  zoomLevel: number,
  viewport: ViewportDimensions,
  bufferMargin: number = 200
): Set<string> {
  const visibleIds = new Set<string>();

  for (const card of cards) {
    if (isCardVisible(card, panOffset, zoomLevel, viewport, bufferMargin)) {
      visibleIds.add(card.id);
    }
  }

  return visibleIds;
}

/**
 * Hook para obtener las dimensiones del viewport
 */
export function useViewportDimensions(
  canvasRef: RefObject<HTMLDivElement | null>
): ViewportDimensions {
  const [dimensions, setDimensions] = useState<ViewportDimensions>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080
  });

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      } else {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, [canvasRef]);

  return dimensions;
}

/**
 * Hook principal para obtener cards visibles con memoización
 */
export function useVisibleCards(
  cards: Card[],
  panOffset: { x: number; y: number },
  zoomLevel: number,
  canvasRef: RefObject<HTMLDivElement | null>,
  config: VisibilityConfig = {}
): {
  visibleCards: Card[];
  visibleCardIds: Set<string>;
  isCardVisible: (cardId: string) => boolean;
  totalCards: number;
  visibleCount: number;
} {
  const { bufferMargin = 300 } = config;
  const viewport = useViewportDimensions(canvasRef);

  // Memoizar el Set de IDs visibles
  const visibleCardIds = useMemo(() => {
    return getVisibleCardIds(cards, panOffset, zoomLevel, viewport, bufferMargin);
  }, [cards, panOffset.x, panOffset.y, zoomLevel, viewport.width, viewport.height, bufferMargin]);

  // Memoizar el array de cards visibles
  const visibleCards = useMemo(() => {
    return cards.filter(card => visibleCardIds.has(card.id));
  }, [cards, visibleCardIds]);

  // Función helper para verificar si un card específico es visible
  const checkCardVisible = useCallback((cardId: string) => {
    return visibleCardIds.has(cardId);
  }, [visibleCardIds]);

  return {
    visibleCards,
    visibleCardIds,
    isCardVisible: checkCardVisible,
    totalCards: cards.length,
    visibleCount: visibleCardIds.size
  };
}

/**
 * Hook simplificado que solo retorna los IDs visibles (más ligero)
 */
export function useVisibleCardIds(
  cards: Card[],
  panOffset: { x: number; y: number },
  zoomLevel: number,
  viewport: ViewportDimensions,
  bufferMargin: number = 300
): Set<string> {
  return useMemo(() => {
    return getVisibleCardIds(cards, panOffset, zoomLevel, viewport, bufferMargin);
  }, [cards, panOffset.x, panOffset.y, zoomLevel, viewport.width, viewport.height, bufferMargin]);
}
