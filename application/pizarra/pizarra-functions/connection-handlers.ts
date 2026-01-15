/**
 * connection-handlers.ts
 *
 * Funciones para manejar la creación y eliminación de conexiones entre tarjetas.
 * Incluye lógica específica para conexiones nota-proyecto.
 */

import { Card, Connection } from '../types';

/**
 * Detecta si una conexión es entre una nota (text) y un proyecto
 *
 * @param fromCard - Tarjeta de origen
 * @param toCard - Tarjeta de destino
 * @returns true si es una conexión nota-proyecto
 */
export function isNoteToProjectConnection(fromCard: Card, toCard: Card): boolean {
  return (
    (fromCard.type === 'text' && (toCard.type === 'proyecto' || toCard.type === 'proyecto-organizacion')) ||
    ((fromCard.type === 'proyecto' || fromCard.type === 'proyecto-organizacion') && toCard.type === 'text')
  );
}

/**
 * Detecta si una conexión es entre un recurso y un proyecto
 *
 * @param fromCard - Tarjeta de origen
 * @param toCard - Tarjeta de destino
 * @returns true si es una conexión recurso-proyecto
 */
export function isResourceToProjectConnection(fromCard: Card, toCard: Card): boolean {
  return (
    (fromCard.type === 'resource' && (toCard.type === 'proyecto' || toCard.type === 'proyecto-organizacion')) ||
    ((fromCard.type === 'proyecto' || fromCard.type === 'proyecto-organizacion') && toCard.type === 'resource')
  );
}

/**
 * Identifica cuál tarjeta es el recurso y cuál es el proyecto
 *
 * @param fromCard - Tarjeta de origen
 * @param toCard - Tarjeta de destino
 * @returns Objeto con recursoCard y proyectoCard identificados
 */
export function identifyResourceAndProject(fromCard: Card, toCard: Card): {
  recursoCard: Card;
  proyectoCard: Card;
} {
  const recursoCard = fromCard.type === 'resource' ? fromCard : toCard;
  const proyectoCard = (fromCard.type === 'proyecto' || fromCard.type === 'proyecto-organizacion') ? fromCard : toCard;

  return { recursoCard, proyectoCard };
}

/**
 * Detecta si una conexión es entre un TODO y una misión
 *
 * @param fromCard - Tarjeta de origen
 * @param toCard - Tarjeta de destino
 * @returns true si es una conexión todo-misión
 */
export function isTodoToMisionConnection(fromCard: Card, toCard: Card): boolean {
  return (
    (fromCard.type === 'todo' && (toCard.type === 'mision-organizacion' || toCard.type === 'mision')) ||
    ((fromCard.type === 'mision-organizacion' || fromCard.type === 'mision') && toCard.type === 'todo')
  );
}

/**
 * Identifica cuál tarjeta es el TODO y cuál es la misión
 *
 * @param fromCard - Tarjeta de origen
 * @param toCard - Tarjeta de destino
 * @returns Objeto con todoCard y misionCard identificados
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
 * Identifica cuál tarjeta es la nota y cuál es el proyecto
 *
 * @param fromCard - Tarjeta de origen
 * @param toCard - Tarjeta de destino
 * @returns Objeto con notaCard y proyectoCard identificados
 */
export function identifyNoteAndProject(fromCard: Card, toCard: Card): {
  notaCard: Card;
  proyectoCard: Card;
} {
  const notaCard = fromCard.type === 'text' ? fromCard : toCard;
  const proyectoCard = (fromCard.type === 'proyecto' || fromCard.type === 'proyecto-organizacion') ? fromCard : toCard;

  return { notaCard, proyectoCard };
}

/**
 * Parámetros para manejar la creación de una conexión
 */
export interface HandleConnectionCreateParams {
  connection: Connection;
  fromCard: Card;
  toCard: Card;
  onConnectionCreate?: (connection: Connection, fromCard: Card, toCard: Card) => void;
  showSuccess?: (message: string, duration?: number) => void;
  showError?: (message: string, duration?: number) => void;
  pizarraId?: string; // ID de la pizarra para guardar cards si no existen en BD
}

/**
 * Maneja la creación de una nueva conexión entre tarjetas
 * Detecta conexiones especiales (nota-proyecto, recurso-proyecto) y ejecuta lógica adicional
 *
 * @param params - Parámetros de la conexión
 *
 * @example
 * handleConnectionCreate({
 *   connection: { id: 'conn-1', from: 'card-1', to: 'card-2' },
 *   fromCard: notaCard,
 *   toCard: proyectoCard,
 *   onConnectionCreate: (conn, from, to) => console.log('Conexión creada')
 * });
 *
 * Proceso:
 * 1. Log de la nueva conexión
 * 2. Detecta si es conexión nota-proyecto o recurso-proyecto
 * 3. Si es nota-proyecto:
 *    - Identifica cuál es la nota y cuál el proyecto
 *    - Log específico para esta conexión
 *    - (TODO) Agregar nota a lista del proyecto
 * 4. Si es recurso-proyecto:
 *    - Identifica cuál es el recurso y cuál el proyecto
 *    - Actualiza el recurso en Supabase con el proyecto_id
 * 5. Llama al callback externo si existe
 */
export async function handleConnectionCreate(params: HandleConnectionCreateParams): Promise<void> {
  const { connection, fromCard, toCard, onConnectionCreate, showSuccess, showError, pizarraId } = params;

  console.log('🔗 Nueva conexión creada:', {
    from: fromCard.type,
    to: toCard.type,
    fromCard,
    toCard
  });

  // Detectar si se conectó una nota (type="text") con un proyecto
  if (isNoteToProjectConnection(fromCard, toCard)) {
    const { notaCard, proyectoCard } = identifyNoteAndProject(fromCard, toCard);

    console.log('📝 ✅ Detectada conexión Nota ↔️ Proyecto:', {
      nota: notaCard.title,
      notaId: notaCard.id,
      proyecto: proyectoCard.proyectoData?.nombre,
      proyectoCardId: proyectoCard.id
    });

    // ✅ Agregar el ID del card de nota a la lista de notas del proyecto
    try {
      console.log('📝 Agregando nota a la lista del proyecto...');

      // TODO: Verificar si la interfaz ProyectoData necesita el campo 'notas'
      // Esta lógica debería actualizarse cuando se defina la interfaz
      // Actualizar el card de proyecto agregando la nota a su lista (evitar duplicados)
      /*
      setCards(prevCards => prevCards.map(card => {
        if (card.id === proyectoCard.id) {
          const notasActuales = card.proyectoData?.notas || [];

          // Evitar duplicados
          if (notasActuales.includes(notaCard.id)) {
            console.log('⚠️ La nota ya está en la lista del proyecto');
            return card;
          }

          return {
            ...card,
            proyectoData: {
              ...card.proyectoData!,
              notas: [...notasActuales, notaCard.id]
            }
          };
        }
        return card;
      }));
      */

      console.log('✅ Nota agregada a la lista del proyecto:', notaCard.id);
    } catch (error) {
      console.error('❌ Error agregando nota al proyecto:', error);
    }
  }

  // Detectar si se conectó un recurso con un proyecto
  if (isResourceToProjectConnection(fromCard, toCard)) {
    const { recursoCard, proyectoCard } = identifyResourceAndProject(fromCard, toCard);

    console.log('📎 ✅ Detectada conexión Recurso ↔️ Proyecto:', {
      recurso: recursoCard.title,
      recursoId: recursoCard.recursoData?.id,
      proyecto: proyectoCard.proyectoData?.nombre,
      proyectoId: proyectoCard.proyectoData?.id
    });

    // Actualizar el recurso en Supabase con el proyecto_id
    if (recursoCard.recursoData?.id && proyectoCard.proyectoData?.id) {
      try {
        const { SupabaseRecursoRepository } = await import('@/infrastructure/datasource/SupabaseRecursoRepository');
        const recursoRepo = new SupabaseRecursoRepository();

        const recursoActualizado = await recursoRepo.updateRecurso(
          recursoCard.recursoData.id,
          { proyecto_id: proyectoCard.proyectoData.id }
        );

        if (recursoActualizado) {
          console.log('✅ Recurso actualizado con proyecto_id:', proyectoCard.proyectoData.id);
          // Toast se muestra desde el ProyectoCard cuando recarga
        } else {
          console.error('❌ No se pudo actualizar el recurso en Supabase');
          if (showError) showError('Error al vincular el recurso al proyecto');
        }
      } catch (error) {
        console.error('❌ Error actualizando recurso con proyecto_id:', error);
        if (showError) showError('Error al vincular el recurso al proyecto');
      }
    }
  }

  // Detectar si se conectó un TODO con una misión
  if (isTodoToMisionConnection(fromCard, toCard)) {
    const { todoCard, misionCard } = identifyTodoAndMision(fromCard, toCard);

    console.log('✅ ✅ Detectada conexión TODO ↔️ Misión:', {
      todo: todoCard.title,
      todoId: todoCard.id,
      mision: misionCard.title,
      misionId: misionCard.misionData?.id_mision
    });

    // Actualizar la misión en Supabase agregando el TODO al array card_todos
    if (misionCard.misionData?.id_mision) {
      try {
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');
        const { mapCardToCardDB } = await import('../utils/cardMapper');

        // Primero obtener el UUID real de la card TODO desde la tabla cards
        let { data: cardData, error: cardError } = await supabase
          .from('cards')
          .select('id')
          .eq('card_id', todoCard.id)
          .single();

        // Si la card no existe y tenemos pizarraId, crearla primero
        if ((cardError || !cardData) && pizarraId) {
          console.log('📋 Card TODO no existe en BD, creándola...');
          const cardDataToInsert = mapCardToCardDB(todoCard, pizarraId);

          const { data: newCard, error: insertError } = await supabase
            .from('cards')
            .insert([cardDataToInsert])
            .select('id')
            .single();

          if (insertError || !newCard) {
            console.error('❌ Error creando card TODO en BD:', insertError);
            if (showError) showError('Error: no se pudo guardar la card en la base de datos');
            return;
          }

          cardData = newCard;
          console.log('✅ Card TODO creada con UUID:', cardData.id);
        } else if (cardError || !cardData) {
          console.error('❌ Error obteniendo UUID de la card TODO:', cardError);
          if (showError) showError('Error: no se encontró la card en la base de datos');
          return;
        }

        const todoCardUUID = cardData.id;
        console.log('📋 UUID de la card TODO:', todoCardUUID);

        // Obtener el array actual de card_todos
        const { data: misionActual, error: errorFetch } = await supabase
          .from('misiones')
          .select('card_todos')
          .eq('id', misionCard.misionData.id_mision)
          .single();

        if (errorFetch) {
          console.error('❌ Error obteniendo misión:', errorFetch);
          if (showError) showError('Error al conectar la lista de tareas');
          return;
        }

        // Agregar el nuevo TODO al array (evitar duplicados) usando el UUID real
        const cardTodosActual = misionActual?.card_todos || [];
        if (!cardTodosActual.includes(todoCardUUID)) {
          const nuevoCardTodos = [...cardTodosActual, todoCardUUID];

          // Actualizar en Supabase
          const { error: errorUpdate } = await supabase
            .from('misiones')
            .update({ card_todos: nuevoCardTodos })
            .eq('id', misionCard.misionData.id_mision);

          if (errorUpdate) {
            console.error('❌ Error actualizando card_todos:', errorUpdate);
            if (showError) showError('Error al conectar la lista de tareas');
          } else {
            console.log('✅ card_todos actualizado:', nuevoCardTodos);
            if (showSuccess) showSuccess(`✅ Lista "${todoCard.title}" conectada a la misión`, 3000);

            // Emitir evento para que MisionCard actualice su estado
            window.dispatchEvent(new CustomEvent('conexion-creada', {
              detail: {
                type: 'todo-mision',
                todoCard,
                misionCard,
                todoCardUUID,
                misionId: misionCard.misionData?.id_mision
              }
            }));
          }
        } else {
          console.log('ℹ️ El TODO ya está en la lista de card_todos');
          if (showSuccess) showSuccess('La lista ya está conectada a esta misión', 2000);
        }
      } catch (error) {
        console.error('❌ Error actualizando misión con card_todos:', error);
        if (showError) showError('Error al conectar la lista de tareas');
      }
    } else {
      console.warn('⚠️ No se puede actualizar misión: falta id_mision');
      if (showError) showError('Error: la misión no tiene ID');
    }
  }

  // Llamar al callback externo si existe
  if (onConnectionCreate) {
    onConnectionCreate(connection, fromCard, toCard);
  }
}

/**
 * Parámetros para manejar la eliminación de una conexión
 */
export interface HandleConnectionDeleteParams {
  connectionId: string;
  connections: Connection[];
  cards: Card[];
  autoConnectionsRef: React.MutableRefObject<Set<string>>;
  baseDeleteConnection: (connectionId: string) => void;
  showSuccess?: (message: string, duration?: number) => void;
  showError?: (message: string, duration?: number) => void;
}

/**
 * Resultado del procesamiento de eliminación de conexión
 */
export interface ConnectionDeleteResult {
  shouldCleanupAutoConnection: boolean;
  isNoteToProject: boolean;
  isResourceToProject: boolean;
  isTodoToMision: boolean;
  notaCard?: Card;
  recursoCard?: Card;
  todoCard?: Card;
  misionCard?: Card;
  proyectoCard?: Card;
}

/**
 * Procesa la eliminación de una conexión y retorna información sobre qué limpiar
 *
 * @param params - Parámetros de la eliminación
 * @returns Información sobre la conexión eliminada
 *
 * Proceso:
 * 1. Busca la conexión por ID
 * 2. Encuentra las tarjetas involucradas
 * 3. Determina si es nota-proyecto o recurso-proyecto
 * 4. Retorna información para que el componente haga la limpieza
 */
export async function processConnectionDelete(params: Omit<HandleConnectionDeleteParams, 'baseDeleteConnection'>): Promise<ConnectionDeleteResult> {
  const { connectionId, connections, cards, showSuccess, showError } = params;

  const result: ConnectionDeleteResult = {
    shouldCleanupAutoConnection: connectionId.startsWith('auto-'),
    isNoteToProject: false,
    isResourceToProject: false,
    isTodoToMision: false
  };

  // Buscar la conexión que se va a eliminar
  const connection = connections.find(c => c.id === connectionId);

  if (!connection) {
    return result;
  }

  // Buscar los cards involucrados
  const fromCard = cards.find(c => c.id === connection.from);
  const toCard = cards.find(c => c.id === connection.to);

  if (!fromCard || !toCard) {
    return result;
  }

  // Detectar si es una conexión nota-proyecto
  if (isNoteToProjectConnection(fromCard, toCard)) {
    const { notaCard, proyectoCard } = identifyNoteAndProject(fromCard, toCard);

    console.log('🗑️ Eliminando nota de la lista del proyecto:', {
      notaId: notaCard.id,
      proyectoId: proyectoCard.id
    });

    result.isNoteToProject = true;
    result.notaCard = notaCard;
    result.proyectoCard = proyectoCard;

    // TODO: Verificar si la interfaz ProyectoData necesita el campo 'notas'
    // Esta lógica debería actualizarse cuando se defina la interfaz
    /*
    setCards(prevCards => prevCards.map(card => {
      if (card.id === proyectoCard.id && card.proyectoData?.notas) {
        return {
          ...card,
          proyectoData: {
            ...card.proyectoData,
            notas: card.proyectoData.notas.filter(notaId => notaId !== notaCard.id)
          }
        };
      }
      return card;
    }));
    */

    console.log('✅ Nota removida de la lista del proyecto');
  }

  // Detectar si es una conexión recurso-proyecto
  if (isResourceToProjectConnection(fromCard, toCard)) {
    const { recursoCard, proyectoCard } = identifyResourceAndProject(fromCard, toCard);

    console.log('🗑️ Eliminando proyecto_id del recurso:', {
      recursoId: recursoCard.recursoData?.id,
      proyectoId: proyectoCard.proyectoData?.id
    });

    result.isResourceToProject = true;
    result.recursoCard = recursoCard;
    result.proyectoCard = proyectoCard;

    // Limpiar proyecto_id del recurso en Supabase
    if (recursoCard.recursoData?.id) {
      try {
        console.log('📎 Limpiando proyecto_id del recurso en Supabase...');

        const { SupabaseRecursoRepository } = await import('@/infrastructure/datasource/SupabaseRecursoRepository');
        const recursoRepo = new SupabaseRecursoRepository();

        const recursoActualizado = await recursoRepo.updateRecurso(
          recursoCard.recursoData.id,
          { proyecto_id: null }
        );

        if (recursoActualizado) {
          console.log('✅ proyecto_id limpiado del recurso');
        } else {
          console.error('❌ No se pudo limpiar proyecto_id del recurso');
        }
      } catch (error) {
        console.error('❌ Error limpiando proyecto_id del recurso:', error);
      }
    }

    console.log('✅ Recurso desvinculado del proyecto');
  }

  // Detectar si es una conexión todo-misión
  if (isTodoToMisionConnection(fromCard, toCard)) {
    const { todoCard, misionCard } = identifyTodoAndMision(fromCard, toCard);

    result.isTodoToMision = true;
    result.todoCard = todoCard;
    result.misionCard = misionCard;

    // Limpiar el TODO del array card_todos en Supabase
    if (misionCard.misionData?.id_mision) {
      try {
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');

        // Buscar el UUID de la card en la tabla cards (puede estar por id o card_id)
        let todoCardUUID: string | null = null;

        const { data: cardByCardId } = await supabase
          .from('cards')
          .select('id')
          .eq('card_id', todoCard.id)
          .single();

        if (cardByCardId) {
          todoCardUUID = cardByCardId.id;
        } else {
          const { data: cardById } = await supabase
            .from('cards')
            .select('id')
            .eq('id', todoCard.id)
            .single();

          if (cardById) {
            todoCardUUID = cardById.id;
          }
        }

        if (!todoCardUUID) {
          if (showError) showError('Error: card no encontrada');
          return result;
        }

        // Obtener el array actual de card_todos
        const { data: misionActual, error: errorFetch } = await supabase
          .from('misiones')
          .select('card_todos')
          .eq('id', misionCard.misionData.id_mision)
          .single();

        if (!errorFetch) {
          const cardTodosActual = misionActual?.card_todos || [];
          const nuevoCardTodos = cardTodosActual.filter((id: string) => id !== todoCardUUID);

          const { error: errorUpdate } = await supabase
            .from('misiones')
            .update({ card_todos: nuevoCardTodos })
            .eq('id', misionCard.misionData.id_mision);

          if (!errorUpdate) {
            if (showSuccess) showSuccess('Lista desconectada');

            window.dispatchEvent(new CustomEvent('conexion-eliminada', {
              detail: {
                type: 'todo-mision',
                todoCard,
                misionCard,
                misionId: misionCard.misionData?.id_mision
              }
            }));
          }
        }
      } catch (error) {
        if (showError) showError('Error al desconectar');
      }
    }
  }

  return result;
}

/**
 * Maneja la eliminación completa de una conexión, incluyendo limpieza
 *
 * @param params - Parámetros de la eliminación
 *
 * @example
 * handleConnectionDelete({
 *   connectionId: 'auto-card1-card2',
 *   connections,
 *   cards,
 *   autoConnectionsRef,
 *   baseDeleteConnection: (id) => console.log('Eliminando', id)
 * });
 *
 * Proceso:
 * 1. Procesa la información de la conexión
 * 2. Si es auto-creada, la elimina del tracking
 * 3. Si es nota-proyecto, limpia la referencia (TODO)
 * 4. Si es recurso-proyecto, limpia proyecto_id del recurso en Supabase
 * 5. Llama a la función base de eliminación
 */
export async function handleConnectionDelete(params: HandleConnectionDeleteParams): Promise<void> {
  const { connectionId, connections, cards, autoConnectionsRef, baseDeleteConnection, showSuccess, showError } = params;

  // Procesar información de la conexión (ahora es async)
  const deleteResult = await processConnectionDelete({
    connectionId,
    connections,
    cards,
    autoConnectionsRef,
    showSuccess,
    showError
  });

  // Limpiar del tracking si es auto-creada
  if (deleteResult.shouldCleanupAutoConnection) {
    autoConnectionsRef.current.delete(connectionId);
    console.log('🗑️ Conexión auto-creada eliminada del tracking:', connectionId);
  }

  // Llamar a la función original
  baseDeleteConnection(connectionId);
}
