/**
 * auto-connection.ts
 *
 * Funciones para gestionar auto-conexiones entre misiones y proyectos.
 * Cuando se añade una misión o proyecto a la pizarra, automáticamente se conectan
 * si existe una relación en la base de datos.
 */

import { Card, Connection } from '../types';

/**
 * Parámetros para auto-conectar una misión a su proyecto
 */
export interface AutoConnectMisionParams {
  misionCardId: string;
  misionId: number;
  cards: Card[];
  connections: Connection[];
  autoConnectionsRef: React.MutableRefObject<Set<string>>;
  onAddConnection: (connection: Connection) => void;
}

/**
 * Parámetros para auto-conectar un proyecto a sus misiones
 */
export interface AutoConnectProyectoParams {
  proyectoCardId: string;
  proyectoId: number;
  cards: Card[];
  connections: Connection[];
  autoConnectionsRef: React.MutableRefObject<Set<string>>;
  onAddConnections: (connections: Connection[]) => void;
}

/**
 * Auto-conecta una misión recién añadida a su proyecto correspondiente
 *
 * @param params - Parámetros de la conexión
 *
 * @example
 * await autoConnectMisionToProyecto({
 *   misionCardId: 'card-123',
 *   misionId: 45,
 *   cards,
 *   connections,
 *   autoConnectionsRef,
 *   onAddConnection: (conn) => setConnections(prev => [...prev, conn])
 * });
 *
 * Proceso:
 * 1. Consulta Supabase para obtener id_proyecto de la misión
 * 2. Busca la card de proyecto en la pizarra
 * 3. Verifica que no exista ya una conexión
 * 4. Crea la conexión con ID único "auto-{misionId}-{proyectoId}"
 * 5. Registra en autoConnectionsRef para tracking
 * 6. Llama al callback para agregar la conexión
 */
export async function autoConnectMisionToProyecto(
  params: AutoConnectMisionParams
): Promise<void> {
  const { misionCardId, misionId, cards, connections, autoConnectionsRef, onAddConnection } = params;

  try {
    const { supabase } = await import('@/infrastructure/services/SupabaseClient');

    console.log('🔍 [AUTO-CONEXIÓN] Verificando misión:', { misionCardId, misionId });

    // Obtener id_proyecto de la misión desde Supabase
    const { data: misionData } = await supabase
      .from('misiones')
      .select('id_proyecto')
      .eq('id', misionId)
      .single();

    if (misionData?.id_proyecto) {
      // Buscar el proyecto correspondiente en las cards
      const proyectoCard = cards.find(card =>
        (card.type === 'proyecto-organizacion' || card.type === 'proyecto') &&
        (card.proyectoData as any)?.id === misionData.id_proyecto
      );

      if (proyectoCard) {
        // Crear ID único para esta conexión
        const connectionId = `auto-${misionCardId}-${proyectoCard.id}`;

        // Verificar si ya existe una conexión
        const connectionExists = connections.some(conn =>
          conn.from === misionCardId && conn.to === proyectoCard.id
        );

        if (!connectionExists) {
          console.log('🔗 [AUTO-CONEXIÓN] Creando conexión:', {
            mision: cards.find(c => c.id === misionCardId)?.title,
            proyecto: proyectoCard.title,
            id_proyecto: misionData.id_proyecto
          });

          // Marcar como creada
          autoConnectionsRef.current.add(connectionId);

          // Crear la conexión
          const newConnection: Connection = {
            id: connectionId,
            from: misionCardId,
            to: proyectoCard.id
          };

          onAddConnection(newConnection);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error en auto-conexión:', error);
  }
}

/**
 * Auto-conecta un proyecto recién añadido con todas las misiones existentes que le pertenecen
 *
 * @param params - Parámetros de la conexión
 *
 * @example
 * await autoConnectProyectoToMisiones({
 *   proyectoCardId: 'card-456',
 *   proyectoId: 10,
 *   cards,
 *   connections,
 *   autoConnectionsRef,
 *   onAddConnections: (conns) => setConnections(prev => [...prev, ...conns])
 * });
 *
 * Proceso:
 * 1. Filtra todas las cards de tipo misión en la pizarra
 * 2. Para cada misión:
 *    - Consulta Supabase para obtener su id_proyecto
 *    - Verifica si coincide con el proyecto actual
 *    - Si coincide, crea conexión "auto-{misionId}-{proyectoId}"
 * 3. Evita duplicados verificando conexiones existentes
 * 4. Registra todas las nuevas conexiones en autoConnectionsRef
 * 5. Llama al callback con todas las conexiones en lote
 */
export async function autoConnectProyectoToMisiones(
  params: AutoConnectProyectoParams
): Promise<void> {
  const { proyectoCardId, proyectoId, cards, connections, autoConnectionsRef, onAddConnections } = params;

  try {
    console.log('🔍 [AUTO-CONEXIÓN] Verificando misiones del proyecto:', { proyectoCardId, proyectoId });

    // Buscar todas las cards de misión que ya están en la pizarra
    const misionCards = cards.filter(card =>
      (card.type === 'mision-organizacion' || card.type === 'mision') &&
      card.misionData?.id_mision
    );

    if (misionCards.length === 0) {
      console.log('📭 [AUTO-CONEXIÓN] No hay misiones en la pizarra');
      return;
    }

    const { supabase } = await import('@/infrastructure/services/SupabaseClient');
    const newConnections: Connection[] = [];

    // Verificar cada misión
    for (const misionCard of misionCards) {
      try {
        // Obtener id_proyecto de la misión
        const { data: misionData } = await supabase
          .from('misiones')
          .select('id_proyecto')
          .eq('id', misionCard.misionData!.id_mision)
          .single();

        if (misionData?.id_proyecto === proyectoId) {
          // Esta misión pertenece a este proyecto
          const connectionId = `auto-${misionCard.id}-${proyectoCardId}`;

          // Verificar si ya existe
          const connectionExists = connections.some(conn =>
            conn.from === misionCard.id && conn.to === proyectoCardId
          );

          if (!connectionExists && !autoConnectionsRef.current.has(connectionId)) {
            console.log('🔗 [AUTO-CONEXIÓN] Conectando misión existente al proyecto:', {
              mision: misionCard.title,
              proyecto: cards.find(c => c.id === proyectoCardId)?.title
            });

            autoConnectionsRef.current.add(connectionId);
            newConnections.push({
              id: connectionId,
              from: misionCard.id,
              to: proyectoCardId
            });
          }
        }
      } catch (error) {
        console.error('❌ Error verificando misión:', error);
      }
    }

    // Agregar las nuevas conexiones en lote
    if (newConnections.length > 0) {
      console.log(`✅ [AUTO-CONEXIÓN] Creadas ${newConnections.length} conexiones`);
      onAddConnections(newConnections);
    } else {
      console.log('📭 [AUTO-CONEXIÓN] No se crearon nuevas conexiones');
    }
  } catch (error) {
    console.error('❌ Error en auto-conexión de proyecto:', error);
  }
}

/**
 * Verifica si una conexión es auto-generada
 *
 * @param connectionId - ID de la conexión
 * @returns true si la conexión fue auto-generada
 *
 * Las conexiones auto-generadas tienen IDs que empiezan con "auto-"
 */
export function isAutoConnection(connectionId: string): boolean {
  return connectionId.startsWith('auto-');
}

/**
 * Limpia una auto-conexión del tracking
 *
 * @param connectionId - ID de la conexión a limpiar
 * @param autoConnectionsRef - Referencia al Set de auto-conexiones
 *
 * @example
 * cleanupAutoConnection('auto-card1-card2', autoConnectionsRef);
 */
export function cleanupAutoConnection(
  connectionId: string,
  autoConnectionsRef: React.MutableRefObject<Set<string>>
): void {
  if (isAutoConnection(connectionId)) {
    autoConnectionsRef.current.delete(connectionId);
    console.log('🗑️ Auto-conexión limpiada del tracking:', connectionId);
  }
}
