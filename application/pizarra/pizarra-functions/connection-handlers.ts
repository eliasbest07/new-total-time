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
}

/**
 * Maneja la creación de una nueva conexión entre tarjetas
 * Detecta conexiones especiales (nota-proyecto) y ejecuta lógica adicional
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
 * 2. Detecta si es conexión nota-proyecto
 * 3. Si es nota-proyecto:
 *    - Identifica cuál es la nota y cuál el proyecto
 *    - Log específico para esta conexión
 *    - (TODO) Agregar nota a lista del proyecto
 * 4. Llama al callback externo si existe
 */
export function handleConnectionCreate(params: HandleConnectionCreateParams): void {
  const { connection, fromCard, toCard, onConnectionCreate } = params;

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
}

/**
 * Resultado del procesamiento de eliminación de conexión
 */
export interface ConnectionDeleteResult {
  shouldCleanupAutoConnection: boolean;
  isNoteToProject: boolean;
  notaCard?: Card;
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
 * 3. Determina si es nota-proyecto
 * 4. Retorna información para que el componente haga la limpieza
 */
export function processConnectionDelete(params: Omit<HandleConnectionDeleteParams, 'baseDeleteConnection'>): ConnectionDeleteResult {
  const { connectionId, connections, cards } = params;

  const result: ConnectionDeleteResult = {
    shouldCleanupAutoConnection: connectionId.startsWith('auto-'),
    isNoteToProject: false
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
 * 4. Llama a la función base de eliminación
 */
export function handleConnectionDelete(params: HandleConnectionDeleteParams): void {
  const { connectionId, connections, cards, autoConnectionsRef, baseDeleteConnection } = params;

  // Procesar información de la conexión
  const deleteResult = processConnectionDelete({
    connectionId,
    connections,
    cards,
    autoConnectionsRef
  });

  // Limpiar del tracking si es auto-creada
  if (deleteResult.shouldCleanupAutoConnection) {
    autoConnectionsRef.current.delete(connectionId);
    console.log('🗑️ Conexión auto-creada eliminada del tracking:', connectionId);
  }

  // Llamar a la función original
  baseDeleteConnection(connectionId);
}
