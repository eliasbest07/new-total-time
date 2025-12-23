import { useState, useCallback, useRef, useEffect } from 'react';
import { Card } from '../types';

export const useCardDrag = (
  cards: Card[],
  setCards: React.Dispatch<React.SetStateAction<Card[]>>,
  panOffset: { x: number; y: number },
  isConnecting: boolean,
  canvasRef: React.RefObject<HTMLDivElement>,
  zoomLevel: number = 1
) => {
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggedMisionId, setDraggedMisionId] = useState<string | null>(null);

  // Log cada vez que cambia draggedMisionId
  useEffect(() => {
    console.log('📊 [ESTADO MISION] draggedMisionId cambió a:', draggedMisionId);
  }, [draggedMisionId]);

  // Sincronizar: si la misión fue eliminada de cards, limpiar el estado
  useEffect(() => {
    if (draggedMisionId) {
      const misionExists = cards.find(card => card.id === draggedMisionId);
      if (!misionExists) {
        console.log('🗑️ [SYNC] La misión fue eliminada de la pizarra, limpiando estado:', draggedMisionId);
        setDraggedMisionId(null);
      }
    }
  }, [cards, draggedMisionId]);

  // Monitorear cantidad de misiones y eliminar la NUEVA si ya hay una (mantener la primera)
  useEffect(() => {
    const misionCards = cards.filter(c => c.type === 'mision');
    console.log('📊 [MONITOR] Total misiones detectadas:', misionCards.length);

    if (misionCards.length > 1) {
      console.log('⚠️ [MONITOR] Se detectaron', misionCards.length, 'misiones. Solo se permite 1.');
      console.log('   Misiones actuales:', misionCards.map(c => c.id));

      // Mantener la PRIMERA misión (la que ya estaba) y eliminar las nuevas
      const firstMision = misionCards[0];
      console.log('   Misión que se MANTIENE (primera):', firstMision.id);
      console.log('   Misiones que se ELIMINAN (nuevas):', misionCards.slice(1).map(c => c.id));

      // Eliminar todas las misiones NUEVAS, mantener solo la primera
      setCards(prev => {
        const filtered = prev.filter(c => c.type !== 'mision' || c.id === firstMision.id);
        const removed = prev.filter(c => c.type === 'mision' && c.id !== firstMision.id);

        console.log('🗑️ [AUTO-LIMPIEZA] Eliminando misiones nuevas:', removed.map(c => c.id));
        console.log('✅ [AUTO-LIMPIEZA] Misión que permanece (la primera):', firstMision.id);

        return filtered;
      });

      // El draggedMisionId se mantiene como la primera misión
      if (draggedMisionId !== firstMision.id) {
        setDraggedMisionId(firstMision.id);
        console.log('📌 [ACTUALIZACIÓN] draggedMisionId se mantiene como:', firstMision.id);
      }
    } else if (misionCards.length === 1) {
      // Si solo hay 1 misión, asegurarse de que esté en el estado
      const misionId = misionCards[0].id;
      if (draggedMisionId !== misionId) {
        console.log('🔄 [SYNC] Sincronizando draggedMisionId con la única misión:', misionId);
        setDraggedMisionId(misionId);
      }
    }
  }, [cards, setCards, draggedMisionId]);

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
    // Compensar el zoom dividiendo las coordenadas relativas
    const mouseX = (e.clientX - rect.left) / zoomLevel;
    const mouseY = (e.clientY - rect.top) / zoomLevel;
    const offsetX = mouseX - panOffset.x - card.x;
    const offsetY = mouseY - panOffset.y - card.y;

    setDraggedCard(card.id);
    setDragOffset({ x: offsetX, y: offsetY });
  }, [panOffset, isConnecting, canvasRef, zoomLevel]);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current || !draggedCard) return;

    const rect = canvasRef.current.getBoundingClientRect();
    // Compensar el zoom dividiendo las coordenadas relativas
    const mouseX = (e.clientX - rect.left) / zoomLevel;
    const mouseY = (e.clientY - rect.top) / zoomLevel;
    const newX = mouseX - panOffset.x - dragOffset.x;
    const newY = mouseY - panOffset.y - dragOffset.y;

    setCards(prev => prev.map(card =>
      card.id === draggedCard
        ? { ...card, x: newX, y: newY }
        : card
    ));
  }, [draggedCard, dragOffset, panOffset, canvasRef, setCards, zoomLevel]);

  const handleMouseUp = useCallback(() => {
    console.log('🖱️ [DRAG] handleMouseUp ejecutado');
    console.log('   draggedCard:', draggedCard);

    if (draggedCard) {
      // Buscar la card arrastrada
      const card = cards.find(c => c.id === draggedCard);
      console.log('   Card encontrada:', card ? `${card.type} - ${card.id}` : 'NO ENCONTRADA');

      // El useEffect se encargará de la limpieza automática y actualización del estado
      // Solo loggear información aquí
      if (card && card.type === 'mision') {
        console.log('✅ [MISION DETECTADA] Card tipo mision arrastrada:', card.id);
      } else if (card) {
        console.log('⛔ [RECHAZADO] Card tipo:', card.type, '(solo se monitorean misiones)');
      }

      setDraggedCard(null);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [draggedCard, cards]);

  return {
    draggedCard,
    draggedMisionId,
    handleCardMouseDown,
    handleGlobalMouseMove,
    handleMouseUp
  };
};
