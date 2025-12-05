/**
 * connection-loader.ts
 *
 * Funciones para cargar conexiones entre tarjetas desde Supabase.
 * Maneja la sincronización de conexiones cuando se visualiza la pizarra de otro usuario.
 */

import { Connection } from '../types';

/**
 * Interfaz para las conexiones desde la base de datos
 */
export interface ConnectionDB {
  connection_id: string;
  from_card_id: string | null;
  to_card_id: string;
  id_pizarra: string;
  created_at?: string;
}

/**
 * Parámetros para cargar conexiones desde Supabase
 */
export interface LoadConnectionsParams {
  pizarraId: string;
  isViewingOtherUser: boolean;
}

/**
 * Determina si se deben cargar conexiones desde Supabase
 *
 * @param pizarra - Objeto de pizarra
 * @param isViewingOtherUser - Si está viendo pizarra de otro usuario
 * @returns true si debe cargar conexiones, false si no
 *
 * Lógica:
 * - Solo cargar cuando se está viendo la pizarra de OTRO usuario
 * - Para la pizarra propia, usar LocalStorage normalmente
 */
export function shouldLoadConnectionsFromDB(
  pizarra: any,
  isViewingOtherUser: boolean
): boolean {
  // IMPORTANTE: Solo cargar conexiones cuando estamos viendo la pizarra de OTRO usuario
  if (!isViewingOtherUser) {
    console.log('📦 [CONNECTIONS] Pizarra propia, usando LocalStorage');
    return false;
  }

  if (!pizarra) {
    console.log('⚠️ [CONNECTIONS] No hay pizarra disponible');
    return false;
  }

  return true;
}

/**
 * Mapea una conexión de base de datos a formato local
 *
 * @param connDB - Conexión desde la base de datos
 * @returns Conexión en formato local
 *
 * Transformación:
 * - connection_id → id
 * - from_card_id → from (undefined si es null)
 * - to_card_id → to
 */
export function mapConnectionDBToConnection(connDB: ConnectionDB): Connection {
  return {
    id: connDB.connection_id,
    from: connDB.from_card_id || undefined,
    to: connDB.to_card_id
  };
}

/**
 * Carga conexiones desde Supabase para una pizarra específica
 *
 * @param params - Parámetros de carga
 * @returns Array de conexiones mapeadas o null si no debe cargar
 *
 * @example
 * const connections = await loadConnectionsFromDB({
 *   pizarraId: 'abc-123',
 *   isViewingOtherUser: true
 * });
 * if (connections) {
 *   setConnections(connections);
 * }
 *
 * Proceso:
 * 1. Importa dinámicamente el repositorio de conexiones
 * 2. Obtiene conexiones por ID de pizarra
 * 3. Mapea cada conexión al formato local
 * 4. Retorna array de conexiones
 * 5. Maneja errores y retorna null en caso de fallo
 */
export async function loadConnectionsFromDB(
  params: LoadConnectionsParams
): Promise<Connection[] | null> {
  const { pizarraId, isViewingOtherUser } = params;

  try {
    console.log('🔗 [PIZARRA COMPARTIDA] Cargando conexiones desde Supabase...');

    const { SupabaseCardConnectionRepository } = await import(
      '@/infrastructure/datasource/SupabaseCardConnectionRepository'
    );
    const cardConnectionRepo = new SupabaseCardConnectionRepository();

    const connectionesEnBD = await cardConnectionRepo.getByPizarraId(pizarraId);

    const mappedConnections = connectionesEnBD.map(mapConnectionDBToConnection);

    console.log('✅ [PIZARRA COMPARTIDA] Conexiones cargadas:', mappedConnections.length);

    return mappedConnections;
  } catch (error) {
    console.error('❌ Error cargando conexiones:', error);
    return null;
  }
}

/**
 * Hook helper para cargar conexiones con validación
 * Combina shouldLoadConnectionsFromDB y loadConnectionsFromDB
 *
 * @param pizarra - Objeto de pizarra
 * @param isViewingOtherUser - Si está viendo pizarra de otro usuario
 * @returns Array de conexiones o null si no debe/puede cargar
 *
 * @example
 * const connections = await loadConnectionsIfNeeded(pizarra, isViewingOtherUser);
 * if (connections) {
 *   setConnections(connections);
 * }
 *
 * Ventajas:
 * - Combina validación y carga en una sola función
 * - Maneja todos los casos de borde
 * - Retorna null de forma consistente si no debe cargar
 */
export async function loadConnectionsIfNeeded(
  pizarra: any,
  isViewingOtherUser: boolean
): Promise<Connection[] | null> {
  if (!shouldLoadConnectionsFromDB(pizarra, isViewingOtherUser)) {
    return null;
  }

  return await loadConnectionsFromDB({
    pizarraId: pizarra.id,
    isViewingOtherUser
  });
}
