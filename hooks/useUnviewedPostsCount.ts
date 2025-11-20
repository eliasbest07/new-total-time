import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { getUnviewedPostsCount } from '@/services/viewedPostsService';
import { RealtimeChannel } from '@supabase/supabase-js';
import { rateLimitHandler } from '@/infrastructure/services/RateLimitHandler';

interface UseUnviewedPostsCountReturn {
  unviewedCount: number;
  loading: boolean;
  refresh: () => void; // Función para refrescar manualmente
}

/**
 * Hook para obtener el contador de posts no vistos de una sala específica
 * Se actualiza en tiempo real cuando se crean nuevos posts
 */
export const useUnviewedPostsCount = (
  salaId: number | null,
  currentUserId: number | null
): UseUnviewedPostsCountReturn => {
  const [unviewedCount, setUnviewedCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [allPostIds, setAllPostIds] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Función para refrescar manualmente
  const refresh = useCallback(() => {
    console.log('📊 [useUnviewedPostsCount] 🔄 Refrescando manualmente...');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Cargar posts iniciales y calcular no vistos
  useEffect(() => {
    if (!salaId) {
      console.log('📊 [useUnviewedPostsCount] No hay salaId, reseteando contador');
      setUnviewedCount(0);
      return;
    }

    const loadPosts = async () => {
      console.log('📊 [useUnviewedPostsCount] Cargando posts para sala:', salaId);
      setLoading(true);
      try {
        const { data: posts, error } = await supabase
          .from('post_sala')
          .select('id')
          .eq('id_sala', salaId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const postIds = (posts || []).map(p => p.id);
        console.log('📊 [useUnviewedPostsCount] Posts encontrados:', postIds.length, 'IDs:', postIds);
        setAllPostIds(postIds);

        // Calcular posts no vistos
        const count = getUnviewedPostsCount(salaId, postIds);
        console.log('📊 [useUnviewedPostsCount] Posts NO VISTOS para sala', salaId, ':', count);
        setUnviewedCount(count);
      } catch (error) {
        console.error('📊 [useUnviewedPostsCount] Error cargando posts:', error);
        setUnviewedCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [salaId, refreshTrigger]);

  // Guardar el último currentUserId para mantener la suscripción durante cooldown
  const lastValidUserIdRef = useRef<number | null>(currentUserId);
  
  // Actualizar la referencia cuando hay un userId válido
  useEffect(() => {
    if (currentUserId) {
      lastValidUserIdRef.current = currentUserId;
    }
  }, [currentUserId]);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!salaId) {
      console.log('📊 [useUnviewedPostsCount] No hay salaId, no suscribiendo a realtime');
      return;
    }

    // Si estamos en cooldown por rate limiting, usar el último userId válido
    const effectiveUserId = rateLimitHandler.isRateLimited() 
      ? lastValidUserIdRef.current 
      : currentUserId;

    if (!effectiveUserId) {
      console.log('📊 [useUnviewedPostsCount] No hay userId válido, no suscribiendo a realtime');
      return;
    }

    // Si estamos en cooldown, no crear nueva suscripción pero mantener la existente
    if (rateLimitHandler.isRateLimited() && !currentUserId) {
      const remaining = Math.ceil(rateLimitHandler.getRemainingCooldown() / 1000);
      console.warn(`⚠️ [useUnviewedPostsCount] En cooldown por rate limiting. Manteniendo suscripción existente. Esperando ${remaining} segundos...`);
      // No retornar, continuar con la suscripción usando el último userId válido
    }

    console.log('📊 [useUnviewedPostsCount] Suscribiendo a realtime para sala:', salaId, 'con userId:', effectiveUserId);

    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      channel = supabase
        .channel(`unviewed-posts-count-${salaId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'post_sala',
            filter: `id_sala=eq.${salaId}`
          },
          async (payload) => {
            console.log('📊 [useUnviewedPostsCount] 🆕 NUEVO POST detectado en sala', salaId, ':', payload.new);
            const newPost = payload.new;

            // Solo incrementar si NO es del usuario actual (usar effectiveUserId)
            const effectiveUserId = rateLimitHandler.isRateLimited() 
              ? lastValidUserIdRef.current 
              : currentUserId;
            
            if (newPost.id_usuario === effectiveUserId) {
              console.log('📊 [useUnviewedPostsCount] Post creado por el usuario actual, ignorando');
              return;
            }

            console.log('📊 [useUnviewedPostsCount] Post de otro usuario, agregando a la lista');

            // Agregar nuevo post a la lista
            setAllPostIds(prev => {
              const updated = [newPost.id, ...prev];
              console.log('📊 [useUnviewedPostsCount] Lista actualizada de posts:', updated);
              return updated;
            });

            // Recalcular contador - usar el estado más reciente
            setUnviewedCount(prev => {
              const updatedPostIds = [newPost.id, ...allPostIds];
              const count = getUnviewedPostsCount(salaId, updatedPostIds);
              console.log('📊 [useUnviewedPostsCount] 🔢 Nuevo contador de NO VISTOS:', count, '(anterior:', prev, ')');
              return count;
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'post_sala',
            filter: `id_sala=eq.${salaId}`
          },
          async (payload) => {
            console.log('📊 [useUnviewedPostsCount] 🗑️ POST ELIMINADO en sala', salaId, ':', payload.old);
            const deletedPost = payload.old;

            // Remover post eliminado de la lista
            setAllPostIds(prev => prev.filter(id => id !== deletedPost.id));

            // Recalcular contador
            const updatedPostIds = allPostIds.filter(id => id !== deletedPost.id);
            const count = getUnviewedPostsCount(salaId, updatedPostIds);
            console.log('📊 [useUnviewedPostsCount] Contador actualizado después de eliminar:', count);
            setUnviewedCount(count);
          }
        )
        .subscribe((status) => {
          console.log('📊 [useUnviewedPostsCount] 📡 Estado de suscripción para sala', salaId, ':', status);
        });

      console.log('📊 [useUnviewedPostsCount] ✅ Canal creado y suscrito:', `unviewed-posts-count-${salaId}`);
    };

    setupSubscription();

    return () => {
      // No limpiar la suscripción si estamos en cooldown por rate limiting
      if (rateLimitHandler.isRateLimited() && !currentUserId) {
        const remaining = Math.ceil(rateLimitHandler.getRemainingCooldown() / 1000);
        console.warn(`⚠️ [useUnviewedPostsCount] En cooldown, NO limpiando suscripción de sala ${salaId}. Esperando ${remaining} segundos...`);
        return;
      }
      
      console.log('📊 [useUnviewedPostsCount] Limpiando suscripción de sala:', salaId);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [salaId, currentUserId, allPostIds]);

  // Recalcular cuando cambie allPostIds (por ejemplo, cuando se marcan posts como vistos)
  useEffect(() => {
    if (!salaId || allPostIds.length === 0) {
      setUnviewedCount(0);
      return;
    }

    // Escuchar cambios en localStorage
    const handleStorageChange = () => {
      const count = getUnviewedPostsCount(salaId, allPostIds);
      console.log('📊 [useUnviewedPostsCount] ♻️ Storage change detectado, recalculando contador:', count);
      setUnviewedCount(count);
    };

    // Escuchar evento personalizado de nuevo post
    const handleNewPost = (event: CustomEvent) => {
      const { salaId: newPostSalaId } = event.detail;
      console.log('📊 [useUnviewedPostsCount] 🔔 Evento de nuevo post recibido para sala:', newPostSalaId);
      if (newPostSalaId === salaId) {
        console.log('📊 [useUnviewedPostsCount] Es para nuestra sala, refrescando...');
        refresh();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('new-post-created', handleNewPost as EventListener);

    // También crear un intervalo para verificar cambios locales
    const interval = setInterval(() => {
      const count = getUnviewedPostsCount(salaId, allPostIds);
      const currentCount = unviewedCount;
      if (count !== currentCount) {
        console.log('📊 [useUnviewedPostsCount] ⏱️ Intervalo detectó cambio:', currentCount, '->', count);
        setUnviewedCount(count);
      }
    }, 2000); // Verificar cada 2 segundos

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('new-post-created', handleNewPost as EventListener);
      clearInterval(interval);
    };
  }, [salaId, allPostIds, refresh]);

  return {
    unviewedCount,
    loading,
    refresh
  };
};
