import { CardDB } from '@/domain/entities/Card';
import { Card } from '../types';

/**
 * Convierte una CardDB de Supabase al formato Card del frontend
 */
export function mapCardDBToCard(cardDB: CardDB): Card {
  const baseCard: Card = {
    id: cardDB.card_id, // Usar card_id como id en el frontend
    dbId: cardDB.id, // UUID de la BD para referencias
    type: cardDB.type,
    title: cardDB.title || '',
    content: cardDB.content || '',
    x: Number(cardDB.x),
    y: Number(cardDB.y),
    width: Number(cardDB.width),
    height: Number(cardDB.height),
    fontSize: cardDB.font_size,
    isPersistent: cardDB.is_persistent || false
  };

  // BUGFIX (debug recarga): Inicializar todos como array vacío para cards de tipo 'todo'
  // Esto asegura que React detecte cambios cuando loadTodoData asigne los todos desde la BD
  if (cardDB.type === 'todo') {
    baseCard.todos = [];
  }

  // Para cards de tipo recurso, cargar recursoData desde content
  if (cardDB.type === 'resource' && cardDB.content) {
    try {
      const parsed = JSON.parse(cardDB.content);
      if (parsed.recursoData) {
        baseCard.recursoData = parsed.recursoData;
        // Restaurar el content original (descripción del recurso)
        baseCard.content = `Tipo: ${parsed.recursoData.resourceType}`;
      }
    } catch (error) {
      console.error('Error parseando recursoData desde content:', error);
    }
  }

  // Los datos adicionales (misionData, usuarioData, imageUrl, etc.) se cargan por separado
  // y se agregan después mediante otras funciones

  return baseCard;
}

/**
 * Convierte una Card del frontend al formato CreateCardDTO para Supabase
 */
export function mapCardToCardDB(card: Card, idPizarra: string) {
  // Para cards de tipo proyecto, guardar el proyectoId en content como JSON
  let content = card.content;
  if ((card.type === 'proyecto' || card.type === 'proyecto-organizacion') && card.proyectoData?.id) {
    content = JSON.stringify({ proyectoId: card.proyectoData.id });
  }

  // Para cards de tipo recurso, guardar recursoData en content como JSON
  if (card.type === 'resource' && card.recursoData) {
    content = JSON.stringify({
      recursoData: {
        id: card.recursoData.id,
        name: card.recursoData.name,
        resourceType: card.recursoData.resourceType,
        url: card.recursoData.url,
        icon: card.recursoData.icon,
        color: card.recursoData.color
      }
    });
  }

  return {
    id_pizarra: idPizarra,
    card_id: card.id,
    type: card.type,
    title: card.title,
    content: content,
    x: card.x,
    y: card.y,
    width: card.width,
    height: card.height,
    font_size: card.fontSize || 18,
    z_index: 1,
    is_persistent: card.isPersistent || false
  };
}
