/**
 * todo-mision-handlers.ts
 *
 * Funciones específicas para manejar conexiones entre cards TODO y Misiones.
 * Incluye lógica de persistencia en Supabase y emisión de eventos.
 */

import { Card } from '../types';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { emitConexionCreada, emitConexionEliminada, isUUID } from '../hooks/useTodoMisionSync';

/**
 * Detecta si una conexión es entre un TODO y una misión
 */
export function isTodoToMisionConnection(fromCard: Card, toCard: Card): boolean {
  return (
    (fromCard.type === 'todo' && (toCard.type === 'mision-organizacion' || toCard.type === 'mision')) ||
    ((fromCard.type === 'mision-organizacion' || fromCard.type === 'mision') && toCard.type === 'todo')
  );
}

/**
 * Identifica cuál tarjeta es el TODO y cuál es la misión
 */
export function identifyTodoAndMision(fromCard: Card, toCard: Card): {
  todoCard: Card;
  misionCard: Card;
} {
  const todoCard = fromCard.type === 'todo' ? fromCard : toCard;
  const misionCard = (fromCard.type === 'mision-organizacion' || fromCard.type === 'mision') ? fromCard : toCard;
  return { todoCard, misionCard };
}

/**
 * Obtiene o crea el UUID de una card TODO en la BD
 */
export async function getOrCreateTodoCardUUID(
  todoCard: Card,
  pizarraId?: string
): Promise<string | null> {
  // Si ya es UUID, verificar que existe
  if (isUUID(todoCard.id)) {
    const { data } = await supabase
      .from('cards')
      .select('id')
      .eq('id', todoCard.id)
      .single();

    return data?.id || null;
  }

  // Buscar por card_id
  const { data: cardByCardId } = await supabase
    .from('cards')
    .select('id')
    .eq('card_id', todoCard.id)
    .single();

  if (cardByCardId) {
    return cardByCardId.id;
  }

  // Si no existe y tenemos pizarraId, crear la card
  if (pizarraId) {
    const { mapCardToCardDB } = await import('../utils/cardMapper');
    const cardDataToInsert = mapCardToCardDB(todoCard, pizarraId);

    const { data: newCard, error } = await supabase
      .from('cards')
      .insert([cardDataToInsert])
      .select('id')
      .single();

    if (error || !newCard) {
      console.error('❌ Error creando card TODO en BD:', error);
      return null;
    }

    return newCard.id;
  }

  return null;
}

interface HandleTodoMisionConnectParams {
  todoCard: Card;
  misionCard: Card;
  pizarraId?: string;
  showSuccess?: (message: string, duration?: number) => void;
  showError?: (message: string, duration?: number) => void;
}

/**
 * Maneja la creación de una conexión TODO-Misión
 * - Obtiene/crea el UUID del TodoCard
 * - Agrega el UUID al array card_todos de la misión
 * - Emite evento de conexión creada
 */
export async function handleTodoMisionConnect(params: HandleTodoMisionConnectParams): Promise<boolean> {
  const { todoCard, misionCard, pizarraId, showSuccess, showError } = params;

  if (!misionCard.misionData?.id_mision) {
    console.warn('⚠️ No se puede conectar: misión sin id_mision');
    showError?.('Error: la misión no tiene ID');
    return false;
  }

  try {
    // Obtener o crear UUID del TodoCard
    const todoCardUUID = await getOrCreateTodoCardUUID(todoCard, pizarraId);

    if (!todoCardUUID) {
      showError?.('Error: no se pudo obtener la card en la base de datos');
      return false;
    }

    // Obtener array actual de card_todos
    const { data: misionActual, error: errorFetch } = await supabase
      .from('misiones')
      .select('card_todos')
      .eq('id', misionCard.misionData.id_mision)
      .single();

    if (errorFetch) {
      console.error('❌ Error obteniendo misión:', errorFetch);
      showError?.('Error al conectar la lista de tareas');
      return false;
    }

    // Verificar si ya está conectado
    const cardTodosActual = misionActual?.card_todos || [];
    if (cardTodosActual.includes(todoCardUUID)) {
      showSuccess?.('La lista ya está conectada a esta misión', 2000);
      return true;
    }

    // Agregar al array
    const nuevoCardTodos = [...cardTodosActual, todoCardUUID];

    const { error: errorUpdate } = await supabase
      .from('misiones')
      .update({ card_todos: nuevoCardTodos })
      .eq('id', misionCard.misionData.id_mision);

    if (errorUpdate) {
      console.error('❌ Error actualizando card_todos:', errorUpdate);
      showError?.('Error al conectar la lista de tareas');
      return false;
    }

    // Emitir evento
    emitConexionCreada({
      type: 'todo-mision',
      todoCard,
      misionCard,
      todoCardUUID,
      misionId: misionCard.misionData.id_mision
    });

    showSuccess?.(`Lista "${todoCard.title}" conectada a la misión`, 3000);
    return true;

  } catch (error) {
    console.error('❌ Error en handleTodoMisionConnect:', error);
    showError?.('Error al conectar la lista de tareas');
    return false;
  }
}

interface HandleTodoMisionDisconnectParams {
  todoCard: Card;
  misionCard: Card;
  showSuccess?: (message: string, duration?: number) => void;
  showError?: (message: string, duration?: number) => void;
}

/**
 * Maneja la eliminación de una conexión TODO-Misión
 * - Busca el UUID del TodoCard
 * - Elimina el UUID del array card_todos de la misión
 * - Emite evento de conexión eliminada
 */
export async function handleTodoMisionDisconnect(params: HandleTodoMisionDisconnectParams): Promise<boolean> {
  const { todoCard, misionCard, showSuccess, showError } = params;

  if (!misionCard.misionData?.id_mision) {
    return false;
  }

  try {
    // Buscar UUID del TodoCard
    let todoCardUUID: string | null = null;

    if (isUUID(todoCard.id)) {
      todoCardUUID = todoCard.id;
    } else {
      const { data: cardByCardId } = await supabase
        .from('cards')
        .select('id')
        .eq('card_id', todoCard.id)
        .single();

      todoCardUUID = cardByCardId?.id || null;
    }

    if (!todoCardUUID) {
      showError?.('Error: card no encontrada');
      return false;
    }

    // Obtener array actual
    const { data: misionActual, error: errorFetch } = await supabase
      .from('misiones')
      .select('card_todos')
      .eq('id', misionCard.misionData.id_mision)
      .single();

    if (errorFetch) {
      return false;
    }

    // Filtrar el UUID
    const cardTodosActual = misionActual?.card_todos || [];
    const nuevoCardTodos = cardTodosActual.filter((id: string) => id !== todoCardUUID);

    const { error: errorUpdate } = await supabase
      .from('misiones')
      .update({ card_todos: nuevoCardTodos })
      .eq('id', misionCard.misionData.id_mision);

    if (errorUpdate) {
      showError?.('Error al desconectar');
      return false;
    }

    // Emitir evento
    emitConexionEliminada({
      type: 'todo-mision',
      todoCard,
      misionCard,
      misionId: misionCard.misionData.id_mision
    });

    showSuccess?.('Lista desconectada');
    return true;

  } catch (error) {
    showError?.('Error al desconectar');
    return false;
  }
}
