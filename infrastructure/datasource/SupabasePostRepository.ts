import { supabase } from "@/infrastructure/services/SupabaseClient";
import { Post } from "@/domain/entities/Post";
import { PostRepository } from "@/infrastructure/repositories/PostRepository";

export class SupabasePostRepository implements PostRepository {
  async getPostsBySala(idSala: number): Promise<Post[]> {
    try {
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
        return [];
      }

      // Obtenemos los IDs únicos de usuarios
      const userUUIDs = [...new Set(posts.map(p => p.id_usuario).filter(id => id !== null))];

      if (userUUIDs.length === 0) {
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

      // Obtenemos los datos de los usuarios
      const { data: usuarios, error: userError } = await supabase
        .from('usuario')
        .select('id_usuario, nombre, avatar')
        .in('id_usuario', userUUIDs);

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

      // Creamos un mapa de usuarios por UUID
      const usuariosMap = new Map(
        (usuarios || []).map(u => [u.id_usuario, { nombre: u.nombre, avatar: u.avatar }])
      );

      // Combinamos los posts con los datos de usuario
      const postsWithExtraFields = posts.map(post => ({
        ...post,
        id_comentarios: [], // Campo virtual para comentarios
        edited_at: null, // Campo virtual para fecha de edición
        likes_count: 0, // Campo virtual para likes
        dislikes_count: 0, // Campo virtual para dislikes
        usuario: post.id_usuario ? usuariosMap.get(post.id_usuario) : undefined
      }));

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