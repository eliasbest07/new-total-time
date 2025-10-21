import { CardDB } from '@/domain/entities/Card';
import { Card } from '../types';

/**
 * Convierte una CardDB de Supabase al formato Card del frontend
 */
export function mapCardDBToCard(cardDB: CardDB): Card {
  const baseCard: Card = {
    id: cardDB.card_id, // Usar card_id como id en el frontend
    type: cardDB.type,
    title: cardDB.title || '',
    content: cardDB.content || '',
    x: Number(cardDB.x),
    y: Number(cardDB.y),
    width: Number(cardDB.width),
    height: Number(cardDB.height),
    fontSize: cardDB.font_size
  };

  // Los datos adicionales (misionData, usuarioData, imageUrl, etc.) se cargan por separado
  // y se agregan después mediante otras funciones

  return baseCard;
}

/**
 * Convierte una Card del frontend al formato CreateCardDTO para Supabase
 */
export function mapCardToCardDB(card: Card, idPizarra: string) {
  return {
    id_pizarra: idPizarra,
    card_id: card.id,
    type: card.type,
    title: card.title,
    content: card.content,
    x: card.x,
    y: card.y,
    width: card.width,
    height: card.height,
    font_size: card.fontSize || 18,
    z_index: 1
  };
}
