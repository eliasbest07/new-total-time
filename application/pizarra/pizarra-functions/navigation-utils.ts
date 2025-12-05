/**
 * navigation-utils.ts
 *
 * Funciones de utilidad para navegación en el canvas de la pizarra.
 * Incluye funciones para centrar cards, manejar z-index y buscar cards.
 */

import { Card } from '../types';

/**
 * Resultado del cálculo de posición para centrar una card
 */
export interface CenterCardResult {
  newPanX: number;
  newPanY: number;
}

/**
 * Actualización de z-index para una card
 */
export interface ZIndexUpdate {
  cardId: string;
  newZIndex: number;
}

/**
 * Calcula el offset necesario para centrar una card en el canvas
 *
 * @param card - Card a centrar
 * @param canvasWidth - Ancho del canvas
 * @param canvasHeight - Alto del canvas
 * @returns Objeto con los nuevos valores de pan (newPanX, newPanY)
 *
 * @example
 * const result = calculateCenterCardPosition(card, 1920, 1080);
 * setPanOffset({ x: result.newPanX, y: result.newPanY });
 *
 * Cálculo:
 * 1. Encuentra el centro del canvas (canvasWidth/2, canvasHeight/2)
 * 2. Encuentra el centro de la card (card.x + card.width/2, card.y + card.height/2)
 * 3. Calcula el offset necesario para alinear ambos centros
 */
export function calculateCenterCardPosition(
  card: Card,
  canvasWidth: number,
  canvasHeight: number
): CenterCardResult {
  const canvasCenterX = canvasWidth / 2;
  const canvasCenterY = canvasHeight / 2;

  const cardCenterX = card.x + card.width / 2;
  const cardCenterY = card.y + card.height / 2;

  const newPanX = canvasCenterX - cardCenterX;
  const newPanY = canvasCenterY - cardCenterY;

  return { newPanX, newPanY };
}

/**
 * Parámetros para navegar a una card
 */
export interface NavigateToCardParams {
  cardId: string;
  cards: Card[];
  canvasRef: React.RefObject<HTMLDivElement>;
  setPanOffset: (offset: { x: number; y: number }) => void;
  bringToFront: (cardId: string) => void;
}

/**
 * Navega a una card específica centrándola en el canvas y trayéndola al frente
 *
 * @param params - Parámetros de navegación
 * @returns true si la navegación fue exitosa, false si no se encontró la card o canvas
 *
 * @example
 * const success = navigateToCard({
 *   cardId: 'card-123',
 *   cards,
 *   canvasRef,
 *   setPanOffset,
 *   bringToFront: (id) => bringCardToFront(id)
 * });
 *
 * Proceso:
 * 1. Busca la card por ID
 * 2. Verifica que el canvas esté disponible
 * 3. Calcula la posición para centrar la card
 * 4. Actualiza el panOffset
 * 5. Trae la card al frente (z-index)
 */
export function navigateToCard(params: NavigateToCardParams): boolean {
  const { cardId, cards, canvasRef, setPanOffset, bringToFront } = params;

  const card = cards.find(c => c.id === cardId);
  if (!card || !canvasRef.current) {
    console.warn('⚠️ No se puede navegar a la card:', { cardId, found: !!card, hasCanvas: !!canvasRef.current });
    return false;
  }

  const canvasRect = canvasRef.current.getBoundingClientRect();
  const { newPanX, newPanY } = calculateCenterCardPosition(
    card,
    canvasRect.width,
    canvasRect.height
  );

  setPanOffset({ x: newPanX, y: newPanY });
  bringToFront(cardId);

  console.log('🎯 Navegando a card:', { cardId, title: card.title, newPanX, newPanY });
  return true;
}

/**
 * Calcula el siguiente z-index disponible para traer una card al frente
 *
 * @param currentMaxZIndex - El z-index máximo actual
 * @returns Objeto con el nuevo z-index y la actualización para la card
 *
 * @example
 * const update = calculateNextZIndex(maxZIndex);
 * setCardZIndices(prev => ({ ...prev, [cardId]: update.newZIndex }));
 * setMaxZIndex(update.newMaxZIndex);
 */
export function calculateNextZIndex(currentMaxZIndex: number): {
  newZIndex: number;
  newMaxZIndex: number;
} {
  const newZIndex = currentMaxZIndex + 1;
  return {
    newZIndex,
    newMaxZIndex: newZIndex
  };
}

/**
 * Parámetros para traer una card al frente
 */
export interface BringCardToFrontParams {
  cardId: string;
  currentMaxZIndex: number;
  setCardZIndices: React.Dispatch<React.SetStateAction<{ [cardId: string]: number }>>;
  setMaxZIndex: React.Dispatch<React.SetStateAction<number>>;
}

/**
 * Trae una card al frente incrementando su z-index
 *
 * @param params - Parámetros para la operación
 *
 * @example
 * bringCardToFront({
 *   cardId: 'card-123',
 *   currentMaxZIndex: maxZIndex,
 *   setCardZIndices,
 *   setMaxZIndex
 * });
 *
 * Proceso:
 * 1. Calcula el siguiente z-index (maxZIndex + 1)
 * 2. Actualiza el z-index de la card
 * 3. Actualiza el maxZIndex global
 */
export function bringCardToFront(params: BringCardToFrontParams): void {
  const { cardId, currentMaxZIndex, setCardZIndices, setMaxZIndex } = params;

  const { newZIndex, newMaxZIndex } = calculateNextZIndex(currentMaxZIndex);

  setCardZIndices(prev => ({ ...prev, [cardId]: newZIndex }));
  setMaxZIndex(newMaxZIndex);

  console.log('⬆️ Card traída al frente:', { cardId, zIndex: newZIndex });
}

/**
 * Busca una card por su ID de misión
 *
 * @param cards - Array de cards en la pizarra
 * @param misionId - ID de la misión a buscar
 * @returns ID de la card si se encuentra, null si no existe
 *
 * @example
 * const cardId = findCardByMisionId(cards, 123);
 * if (cardId) {
 *   navigateToCard({ cardId, ... });
 * }
 *
 * Busca en cards de tipo:
 * - 'mision-organizacion'
 * - 'mision'
 *
 * Que tengan misionData.id_mision igual al misionId proporcionado
 */
export function findCardByMisionId(cards: Card[], misionId: number): string | null {
  const card = cards.find(c =>
    (c.type === 'mision-organizacion' || c.type === 'mision') &&
    c.misionData?.id_mision === misionId
  );

  if (card) {
    console.log('🔍 Card encontrada por misionId:', { misionId, cardId: card.id, title: card.title });
  } else {
    console.log('❌ No se encontró card con misionId:', misionId);
  }

  return card ? card.id : null;
}

/**
 * Busca una card por su ID de proyecto
 *
 * @param cards - Array de cards en la pizarra
 * @param proyectoId - ID del proyecto a buscar
 * @returns ID de la card si se encuentra, null si no existe
 *
 * Busca en cards de tipo:
 * - 'proyecto-organizacion'
 * - 'proyecto'
 *
 * Que tengan proyectoData.id igual al proyectoId proporcionado
 */
export function findCardByProyectoId(cards: Card[], proyectoId: number): string | null {
  const card = cards.find(c =>
    (c.type === 'proyecto-organizacion' || c.type === 'proyecto') &&
    (c.proyectoData as any)?.id === proyectoId
  );

  if (card) {
    console.log('🔍 Card encontrada por proyectoId:', { proyectoId, cardId: card.id, title: card.title });
  } else {
    console.log('❌ No se encontró card con proyectoId:', proyectoId);
  }

  return card ? card.id : null;
}

/**
 * Busca una card por su ID de usuario
 *
 * @param cards - Array de cards en la pizarra
 * @param userId - ID del usuario a buscar (userAuth UUID)
 * @returns ID de la card si se encuentra, null si no existe
 *
 * Busca en cards de tipo 'usuario' que tengan
 * usuarioData.userId igual al userId proporcionado
 */
export function findCardByUserId(cards: Card[], userId: string): string | null {
  const card = cards.find(c =>
    c.type === 'usuario' &&
    c.usuarioData?.userId === userId
  );

  if (card) {
    console.log('🔍 Card encontrada por userId:', { userId, cardId: card.id, name: card.usuarioData?.name });
  } else {
    console.log('❌ No se encontró card con userId:', userId);
  }

  return card ? card.id : null;
}
