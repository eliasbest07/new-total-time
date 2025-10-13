import { supabase } from "@/infrastructure/services/SupabaseClient";
import { Post } from "@/domain/entities/Post";
import { PostRepository } from "@/infrastructure/repositories/PostRepository";

export class SupabasePostRepository implements PostRepository {
  async getPostsBySala(idSala: number): Promise<Post[]> {
    try {
      console.log('📋 Obteniendo posts de sala:', idSala);

      // Obtenemos los posts
      const { data: posts, error } = await supabase
        .from('post_sala')
        .select('*')
        .eq('id_sala', idSala)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo posts:', error);
        return [];
      }

      if (!posts || posts.length === 0) {
        console.log('⚠️ No se encontraron posts');
        return [];
      }

      console.log('✅ Posts obtenidos:', posts.length);
      console.log('📝 Estructura del primer post:', posts[0]);
      console.log('🔍 creado_por del primer post:', posts[0]?.creado_por);
      console.log('🔍 id_usuario del primer post:', posts[0]?.id_usuario);

      // Obtenemos los UUIDs únicos de usuarios desde creado_por
      const userUUIDs = [...new Set(
        posts
          .map(p => p.creado_por)
          .filter(id => {
            // Filtrar valores válidos: no null, no undefined, no string "undefined"
            if (!id || id === 'undefined' || id === '') {
              return false;
            }
            return true;
          })
      )];

      console.log('👥 UUIDs de usuarios a buscar:', userUUIDs);
      console.log('📊 Total de UUIDs válidos:', userUUIDs.length);

      // Si no hay UUIDs válidos de creado_por, intentar con id_usuario (fallback)
      if (userUUIDs.length === 0) {
        console.log('⚠️ No hay creado_por, intentando con id_usuario como fallback');
        const userIds = [...new Set(
          posts
            .map(p => p.id_usuario)
            .filter(id => id !== null && id !== undefined)
        )];

        if (userIds.length > 0) {
          console.log('👥 IDs numéricos de usuarios a buscar:', userIds);

          // Intentar buscar por id numérico
          const { data: usuarios, error: userError } = await supabase
            .from('usuario')
            .select('id, id_usuario, nombre, avatar')
            .in('id_usuario', userIds);

          console.log('📊 Respuesta usuarios (por id_usuario):', { usuarios, error: userError });

          if (!userError && usuarios) {
            const usuariosMap = new Map(
              usuarios.map(u => [u.id_usuario, { nombre: u.nombre, avatar: u.avatar }])
            );

            return posts.map(post => ({
              ...post,
              id_comentarios: [],
              edited_at: null,
              likes_count: 0,
              dislikes_count: 0,
              usuario: post.id_usuario ? usuariosMap.get(post.id_usuario) : undefined
            }));
          }
        }
      }

      if (userUUIDs.length === 0) {
        console.log('⚠️ No hay UUIDs de usuarios válidos');
        // Si no hay usuarios, devolvemos posts sin datos de usuario
        return posts.map(post => ({
          ...post,
          id_comentarios: [],
          edited_at: null,
          likes_count: 0,
          dislikes_count: 0,
          usuario: undefined
        }));
      }

      // Obtenemos los datos de los usuarios usando id como UUID
      const { data: usuarios, error: userError } = await supabase
        .from('usuario')
        .select('id, nombre, avatar')
        .in('id', userUUIDs);

      console.log('📊 Respuesta usuarios:', { usuarios, error: userError });

      if (userError) {
        console.error('❌ Error obteniendo usuarios:', userError);
        // Si hay error obteniendo usuarios, devolvemos posts sin datos de usuario
        return posts.map(post => ({
          ...post,
          id_comentarios: [],
          edited_at: null,
          likes_count: 0,
          dislikes_count: 0,
          usuario: undefined
        }));
      }

      // Creamos un mapa de usuarios por UUID (campo id en tabla usuario)
      const usuariosMap = new Map(
        (usuarios || []).map(u => [u.id, { nombre: u.nombre, avatar: u.avatar }])
      );

      console.log('✅ Usuarios mapeados:', usuariosMap.size);

      // Combinamos los posts con los datos de usuario
      const postsWithExtraFields = posts.map(post => ({
        ...post,
        id_comentarios: [], // Campo virtual para comentarios
        edited_at: null, // Campo virtual para fecha de edición
        likes_count: 0, // Campo virtual para likes
        dislikes_count: 0, // Campo virtual para dislikes
        usuario: post.creado_por ? usuariosMap.get(post.creado_por) : undefined
      }));

      console.log('✅ Posts con datos de usuario:', postsWithExtraFields.length);

      return postsWithExtraFields;
    } catch (error) {
      console.error('❌ Error en getPostsBySala:', error);
      return [];
    }
  }

  async createPost(post: Omit<Post, 'id' | 'created_at'>): Promise<Post | null> {
    try {
      // Crear el objeto con solo los campos que existen en la tabla
      const postData = {
        id_sala: post.id_sala,
        contenido: post.contenido,
        creado_por: post.creado_por
      };

      console.log('📝 Creando post con datos:', postData);

      const { data, error } = await supabase
        .from('post_sala')
        .insert([postData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando post:', error);
        console.error('❌ Detalles del error:', JSON.stringify(error, null, 2));
        return null;
      }

      // Agregar campos virtuales al post creado
      const postWithExtraFields = {
        ...data,
        id_comentarios: [],
        edited_at: null,
        likes_count: 0,
        dislikes_count: 0,
        usuario: undefined
      };

      return postWithExtraFields;
    } catch (error) {
      console.error('❌ Error en createPost:', error);
      return null;
    }
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post | null> {
    try {
      // Solo permitir actualizar campos que existen en la tabla
      const allowedUpdates: any = {};
      if (updates.contenido !== undefined) allowedUpdates.contenido = updates.contenido;
      if (updates.id_sala !== undefined) allowedUpdates.id_sala = updates.id_sala;

      const { data, error } = await supabase
        .from('post_sala')
        .update(allowedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando post:', error);
        return null;
      }

      // Agregar campos virtuales
      const postWithExtraFields = {
        ...data,
        id_comentarios: [],
        edited_at: null,
        likes_count: 0,
        dislikes_count: 0,
        usuario: undefined
      };

      return postWithExtraFields;
    } catch (error) {
      console.error('❌ Error en updatePost:', error);
      return null;
    }
  }

  async deletePost(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('post_sala')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error eliminando post:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error en deletePost:', error);
      return false;
    }
  }
}