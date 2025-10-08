import { supabase } from "@/infrastructure/services/SupabaseClient";
import { Comentario } from "@/domain/entities/Comentario";
import { ComentarioRepository } from "@/infrastructure/repositories/ComentarioRepository";

export class SupabaseComentarioRepository implements ComentarioRepository {
  async getComentariosByIds(ids: string[]): Promise<Comentario[]> {
    try {
      if (ids.length === 0) {
        return [];
      }

      console.log('💬 Cargando comentarios con IDs:', ids);

      // Primero obtenemos los comentarios
      const { data: comentarios, error } = await supabase
        .from('comentario_sala')
        .select('*')
        .in('id', ids)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error obteniendo comentarios:', error);
        return [];
      }

      if (!comentarios || comentarios.length === 0) {
        console.log('✅ Comentarios cargados: 0');
        return [];
      }

      // Obtenemos los IDs únicos de usuarios
      const userIds = [...new Set(comentarios.map(c => c.idUsuario).filter(id => id !== null))];

      if (userIds.length === 0) {
        console.log('✅ Comentarios cargados:', comentarios.length);
        return comentarios;
      }

      // Obtenemos los datos de los usuarios
      const { data: usuarios, error: userError } = await supabase
        .from('usuario')
        .select('id, nombre')
        .in('id', userIds);

      if (userError) {
        console.error('❌ Error obteniendo usuarios:', userError);
        console.log('✅ Comentarios cargados sin usuarios:', comentarios.length);
        return comentarios;
      }

      // Creamos un mapa de usuarios
      const usuariosMap = new Map(
        (usuarios || []).map(u => [u.id, { nombre: u.nombre }])
      );

      // Combinamos los comentarios con los datos de usuario
      const result = comentarios.map(comentario => ({
        ...comentario,
        usuario: comentario.idUsuario ? usuariosMap.get(comentario.idUsuario) : undefined
      }));

      console.log('✅ Comentarios cargados con usuarios:', result.length);
      return result;
    } catch (error) {
      console.error('❌ Error en getComentariosByIds:', error);
      return [];
    }
  }
}
