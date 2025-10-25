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
      // console.log('📝 Cargando posts para sala:', idSala);

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

      // Obtener los IDs únicos de usuarios (filtrar null y undefined)
      const userIds = [...new Set(posts.map(p => p.id_usuario).filter(id => id !== null && id !== undefined))];

      // console.log('👥 IDs de usuarios a buscar:', userIds);

      if (userIds.length === 0) {
        // console.log('⚠️ No hay IDs de usuarios válidos');
        setPosts(posts);
        return;
      }

      // Obtener los datos de los usuarios
      const { data: usuarios, error: userError } = await supabase
        .from('usuario')
        .select('id, id_usuario, nombre, avatar')
        .in('id_usuario', userIds);

      if (userError) {
        console.error('❌ Error obteniendo usuarios:', userError);
        setPosts(posts);
        return;
      }

      // Crear un mapa de usuarios por id_usuario
      const usuariosMap = new Map(
        (usuarios || []).map(u => [u.id_usuario, { nombre: u.nombre, avatar: u.avatar }])
      );

      // Combinar los posts con los datos de usuario
      const postsWithUsers = posts.map(post => ({
        ...post,
        usuario: post.id_usuario ? usuariosMap.get(post.id_usuario) : undefined
      }));

      setPosts(postsWithUsers);
      // console.log('✅ Posts cargados exitosamente:', postsWithUsers.length);
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

    // Configurar suscripción realtime para post_sala
    if (!idSala) return;

    console.log('🔔 [usePosts] Configurando suscripción realtime para sala:', idSala);

    const channel = supabase
      .channel(`post_sala_changes_${idSala}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'post_sala',
          filter: `id_sala=eq.${idSala}`
        },
        (payload) => {
          console.log('🔔 [usePosts] Cambio detectado en post_sala:', payload);

          // Recargar posts cuando hay cambios
          loadPosts();
        }
      )
      .subscribe((status) => {
        console.log('🔔 [usePosts] Estado de suscripción:', status);
      });

    // Cleanup: desuscribirse cuando el componente se desmonte o cambie la sala
    return () => {
      console.log('🔔 [usePosts] Cancelando suscripción realtime para sala:', idSala);
      supabase.removeChannel(channel);
    };
  }, [loadPosts, idSala]);

  return {
    posts,
    loading,
    error,
    refetch: loadPosts
  };
};