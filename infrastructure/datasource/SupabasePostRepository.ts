import { supabase } from "@/infrastructure/services/SupabaseClient";
import { Post } from "@/domain/entities/Post";
import { PostRepository } from "@/infrastructure/repositories/PostRepository";

export class SupabasePostRepository implements PostRepository {
  async getPostsBySala(idSala: number): Promise<Post[]> {
    try {
      // console.log('📋 Obteniendo posts de sala:', idSala);

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
        // console.log('⚠️ No se encontraron posts');
        return [];
      }

      // console.log('✅ Posts obtenidos:', posts.length);
      // console.log('📝 Estructura del primer post:', posts[0]);
      // console.log('🔍 id_usuario del primer post:', posts[0]?.id_usuario);

      // Obtenemos los IDs únicos de usuarios desde id_usuario
      const userIds = [...new Set(
        posts
          .map(p => p.id_usuario)
          .filter(id => id !== null && id !== undefined)
      )];

      // console.log('👥 IDs de usuarios a buscar:', userIds);
      // console.log('📊 Total de IDs válidos:', userIds.length);

      // Si no hay IDs válidos, devolver posts sin datos de usuario
      if (userIds.length === 0) {
        return posts.map(post => ({
          ...post,
          edited_at: post.edited_at || null,
          likes_count: post.likes_count || 0,
          dislikes_count: post.dislikes_count || 0,
          usuario: undefined
        }));
      }

      // Buscar usuarios por id_usuario
      const { data: usuarios, error: userError } = await supabase
        .from('usuario')
        .select('id, id_usuario, nombre, avatar')
        .in('id_usuario', userIds);

      // console.log('📊 Respuesta usuarios (por id_usuario):', { usuarios, error: userError });

      if (userError) {
        console.error('❌ Error obteniendo usuarios:', userError);
        // Si hay error obteniendo usuarios, devolvemos posts sin datos de usuario
        return posts.map(post => ({
          ...post,
          edited_at: post.edited_at || null,
          likes_count: post.likes_count || 0,
          dislikes_count: post.dislikes_count || 0,
          usuario: undefined
        }));
      }

      // Creamos un mapa de usuarios por id_usuario
      const usuariosMap = new Map(
        (usuarios || []).map(u => [u.id_usuario, { nombre: u.nombre, avatar: u.avatar }])
      );

      // Combinamos los posts con los datos de usuario
      const postsWithExtraFields = posts.map(post => ({
        ...post,
        edited_at: post.edited_at || null,
        likes_count: post.likes_count || 0,
        dislikes_count: post.dislikes_count || 0,
        usuario: post.id_usuario ? usuariosMap.get(post.id_usuario) : undefined
      }));

      // console.log('✅ Posts con datos de usuario:', postsWithExtraFields.length);

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
        id_usuario: post.id_usuario
      };

      // console.log('📝 Creando post con datos:', postData);

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

      // Agregar campos desde la DB o valores por defecto
      const postWithExtraFields = {
        ...data,
        edited_at: data.edited_at || null,
        likes_count: data.likes_count || 0,
        dislikes_count: data.dislikes_count || 0,
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

      // Agregar campos desde la DB o valores por defecto
      const postWithExtraFields = {
        ...data,
        edited_at: data.edited_at || null,
        likes_count: data.likes_count || 0,
        dislikes_count: data.dislikes_count || 0,
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