import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabasePostRepository } from '@/infrastructure/datasource/SupabasePostRepository';
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

  const postRepository = useRef(new SupabasePostRepository());

  const loadPosts = useCallback(async () => {
    if (!idSala) {
      setPosts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📝 Cargando posts para sala:', idSala);
      const postsData = await postRepository.current.getPostsBySala(idSala);

      setPosts(postsData);
      console.log('✅ Posts cargados exitosamente:', postsData.length);
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
