import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { Post } from '@/domain/entities/Post';

interface UsePostsReturn {
  posts: Post[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const usePosts = (idSala: number | null): UsePostsReturn => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    if (!idSala) {
      setPosts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📝 Cargando posts para sala:', idSala);
      
      // Obtener posts directamente con Supabase
      const { data: posts, error } = await supabase
        .from('post_sala')
        .select('*')
        .eq('id_sala', idSala)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      if (!posts || posts.length === 0) {
        setPosts([]);
        return;
      }

      // Obtener los IDs únicos de usuarios
      const userIds = [...new Set(posts.map(p => p.id_usuario).filter(id => id !== null))];

      if (userIds.length === 0) {
        setPosts(posts);
        return;
      }

      // Obtener los datos de los usuarios
      const { data: usuarios, error: userError } = await supabase
        .from('usuario')
        .select('id, nombre')
        .in('id', userIds);

      if (userError) {
        console.error('❌ Error obteniendo usuarios:', userError);
        setPosts(posts);
        return;
      }

      // Crear un mapa de usuarios
      const usuariosMap = new Map(
        (usuarios || []).map(u => [u.id, { nombre: u.nombre }])
      );

      // Combinar los posts con los datos de usuario
      const postsWithUsers = posts.map(post => ({
        ...post,
        usuario: post.id_usuario ? usuariosMap.get(post.id_usuario) : undefined
      }));

      setPosts(postsWithUsers);
      console.log('✅ Posts cargados exitosamente:', postsWithUsers.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar posts';
      console.error('❌ Error cargando posts:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [idSala]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  return {
    posts,
    loading,
    error,
    refetch: loadPosts
  };
};