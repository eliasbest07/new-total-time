import { supabase } from "@/infrastructure/services/SupabaseClient";
import { Post } from "@/domain/entities/Post";
import { PostRepository } from "@/infrastructure/repositories/PostRepository";

export class SupabasePostRepository implements PostRepository {
  async getPostsBySala(idSala: number): Promise<Post[]> {
    try {
      // Primero obtenemos los posts
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
      const userIds = [...new Set(posts.map(p => p.id_usuario).filter(id => id !== null))];

      if (userIds.length === 0) {
        return posts;
      }

      // Obtenemos los datos de los usuarios
      const { data: usuarios, error: userError } = await supabase
        .from('usuario')
        .select('id, nombre')
        .in('id', userIds);

      if (userError) {
        console.error('❌ Error obteniendo usuarios:', userError);
        return posts;
      }

      // Creamos un mapa de usuarios
      const usuariosMap = new Map(
        (usuarios || []).map(u => [u.id, { nombre: u.nombre }])
      );

      // Combinamos los posts con los datos de usuario
      return posts.map(post => ({
        ...post,
        usuario: post.id_usuario ? usuariosMap.get(post.id_usuario) : undefined
      }));
    } catch (error) {
      console.error('❌ Error en getPostsBySala:', error);
      return [];
    }
  }

  async createPost(post: Omit<Post, 'id' | 'created_at'>): Promise<Post | null> {
    try {
      // Crear el objeto sin el campo 'usuario' que es solo de lectura
      const postData = {
        id_sala: post.id_sala,
        contenido: post.contenido,
        id_usuario: post.id_usuario,
        id_comentarios: post.id_comentarios || []
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

      // Cargar el post con los datos del usuario
      const posts = await this.getPostsBySala(post.id_sala!);
      const newPost = posts.find(p => p.id === data.id);

      return newPost || data;
    } catch (error) {
      console.error('❌ Error en createPost:', error);
      return null;
    }
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post | null> {
    try {
      const { data, error } = await supabase
        .from('post_sala')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando post:', error);
        return null;
      }

      return data;
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
