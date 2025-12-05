/**
 * user-id-converter.ts
 *
 * Funciones para convertir entre diferentes formatos de ID de usuario.
 * Maneja la conversión de UUID (id_usuario) a ID numérico de la base de datos.
 */

/**
 * Convierte un UUID de usuario (id_usuario) a su ID numérico correspondiente
 *
 * @param viewingUserId - El UUID del usuario (id_usuario de auth)
 * @returns Promise con el ID numérico del usuario o null si no se encuentra
 *
 * @example
 * const numericId = await loadViewingUserId('550e8400-e29b-41d4-a716-446655440000');
 * console.log(numericId); // 123
 *
 * Proceso:
 * 1. Valida que el viewingUserId no sea nulo
 * 2. Consulta la tabla 'usuario' en Supabase buscando por id_usuario (UUID)
 * 3. Obtiene el campo 'id' (numérico) de la base de datos
 * 4. Maneja errores específicos como usuario no encontrado (PGRST116)
 * 5. Retorna el ID numérico parseado o null si no se encuentra
 */
export async function loadViewingUserId(viewingUserId: string | null): Promise<number | null> {
  if (!viewingUserId) {
    return null;
  }

  try {
    console.log('🔍 [Pizarra] Buscando ID numérico para id_usuario:', viewingUserId);
    const { supabase } = await import('@/infrastructure/services/SupabaseClient');

    const { data, error } = await supabase
      .from('usuario')
      .select('id, id_usuario, nombre, username')
      .eq('id_usuario', viewingUserId)
      .maybeSingle();

    if (error) {
      console.error('❌ [Pizarra] Error obteniendo ID de usuario:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        viewingUserId: viewingUserId
      });

      // Si no se encuentra el usuario, es un error esperado
      if (error.code === 'PGRST116') {
        console.warn('⚠️ [Pizarra] No se encontró usuario con id_usuario:', viewingUserId);
      }
      return null;
    }

    if (data) {
      console.log('✅ [Pizarra] Usuario encontrado:', {
        id: data.id,
        id_usuario: data.id_usuario,
        nombre: data.nombre || data.username
      });
      return parseInt(data.id);
    } else {
      console.warn('⚠️ [Pizarra] No se encontró usuario con id_usuario:', viewingUserId);
      return null;
    }
  } catch (error) {
    console.error('❌ Error en loadViewingUserId:', error);
    return null;
  }
}
