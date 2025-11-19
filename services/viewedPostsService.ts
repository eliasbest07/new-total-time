/**
 * Servicio para gestionar posts vistos/no vistos en localStorage
 * Cada sala mantiene su propio conjunto de posts vistos
 */

export interface ViewedPostsData {
  salaId: number;
  viewedPostIds: string[]; // IDs de posts que el usuario ya ha visto
  lastUpdated: string;      // Timestamp de última actualización
}

const STORAGE_PREFIX = 'viewed_posts_sala_';

/**
 * Obtiene los IDs de posts vistos para una sala específica
 */
export const getViewedPosts = (salaId: number): string[] => {
  try {
    const key = `${STORAGE_PREFIX}${salaId}`;
    const stored = localStorage.getItem(key);

    if (!stored) {
      console.log(`💾 [viewedPostsService] No hay posts vistos guardados para sala ${salaId}`);
      return [];
    }

    const data: ViewedPostsData = JSON.parse(stored);
    // console.log(`💾 [viewedPostsService] Posts vistos para sala ${salaId}:`, data.viewedPostIds?.length || 0, 'posts');
    return data.viewedPostIds || [];
  } catch (error) {
    console.error('💾 [viewedPostsService] Error obteniendo posts vistos:', error);
    return [];
  }
};

/**
 * Marca posts como vistos para una sala específica
 * @param salaId - ID de la sala
 * @param postIds - Array de IDs de posts a marcar como vistos
 * @param replace - Si es true, reemplaza todos los posts vistos. Si es false, agrega a los existentes
 */
export const markPostsAsViewed = (
  salaId: number,
  postIds: string[],
  replace: boolean = false
): void => {
  try {
    const key = `${STORAGE_PREFIX}${salaId}`;

    let viewedPostIds: string[];

    if (replace) {
      console.log(`💾 [viewedPostsService] ✅ Reemplazando posts vistos para sala ${salaId}. Total:`, postIds.length);
      viewedPostIds = postIds;
    } else {
      const existing = getViewedPosts(salaId);
      // Combinar y eliminar duplicados
      viewedPostIds = Array.from(new Set([...existing, ...postIds]));
      console.log(`💾 [viewedPostsService] ✅ Agregando posts vistos para sala ${salaId}. Existentes:`, existing.length, 'Nuevos:', postIds.length, 'Total:', viewedPostIds.length);
    }

    const data: ViewedPostsData = {
      salaId,
      viewedPostIds,
      lastUpdated: new Date().toISOString()
    };

    localStorage.setItem(key, JSON.stringify(data));
    console.log(`💾 [viewedPostsService] Guardado en localStorage:`, key, 'IDs:', viewedPostIds);
  } catch (error) {
    console.error('💾 [viewedPostsService] Error guardando posts vistos:', error);
  }
};

/**
 * Marca un solo post como visto
 */
export const markPostAsViewed = (salaId: number, postId: string): void => {
  markPostsAsViewed(salaId, [postId], false);
};

/**
 * Verifica si un post ha sido visto
 */
export const isPostViewed = (salaId: number, postId: string): boolean => {
  const viewedPosts = getViewedPosts(salaId);
  return viewedPosts.includes(postId);
};

/**
 * Obtiene el conteo de posts no vistos
 * @param salaId - ID de la sala
 * @param allPostIds - Array con todos los IDs de posts existentes
 * @returns Número de posts no vistos
 */
export const getUnviewedPostsCount = (
  salaId: number,
  allPostIds: string[]
): number => {
  const viewedPosts = getViewedPosts(salaId);
  const unviewedPosts = allPostIds.filter(id => !viewedPosts.includes(id));
  return unviewedPosts.length;
};

/**
 * Obtiene los IDs de posts no vistos
 */
export const getUnviewedPostIds = (
  salaId: number,
  allPostIds: string[]
): string[] => {
  const viewedPosts = getViewedPosts(salaId);
  return allPostIds.filter(id => !viewedPosts.includes(id));
};

/**
 * Limpia todos los posts vistos de una sala (útil para debug o reset)
 */
export const clearViewedPosts = (salaId: number): void => {
  try {
    const key = `${STORAGE_PREFIX}${salaId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error limpiando posts vistos:', error);
  }
};

/**
 * Limpia posts vistos que ya no existen (cleanup de posts eliminados)
 * @param salaId - ID de la sala
 * @param existingPostIds - IDs de posts que actualmente existen
 */
export const cleanupDeletedPosts = (
  salaId: number,
  existingPostIds: string[]
): void => {
  try {
    const viewedPosts = getViewedPosts(salaId);
    const existingSet = new Set(existingPostIds);

    // Mantener solo los IDs que todavía existen
    const cleanedViewedPosts = viewedPosts.filter(id => existingSet.has(id));

    if (cleanedViewedPosts.length !== viewedPosts.length) {
      markPostsAsViewed(salaId, cleanedViewedPosts, true);
    }
  } catch (error) {
    console.error('Error limpiando posts eliminados:', error);
  }
};
