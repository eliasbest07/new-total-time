import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

interface NewPostNotification {
  postId: string;
  autorId: string;
  autorNombre: string;
  contenido: string;
  salaId: number;
}

interface UseNewPostsNotificationReturn {
  newPostsCount: number;
  notifications: NewPostNotification[];
  clearNotifications: () => void;
  markAsRead: () => void;
}

const STORAGE_KEY = 'new_posts_count';
const NOTIFICATIONS_KEY = 'post_notifications';

export const useNewPostsNotification = (
  currentUserId: number | null,
  salaId: number | null
): UseNewPostsNotificationReturn => {
  const [newPostsCount, setNewPostsCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NewPostNotification[]>([]);

  // Cargar contador desde localStorage al iniciar
  useEffect(() => {
    if (!salaId) return;

    const storedCount = localStorage.getItem(`${STORAGE_KEY}_${salaId}`);
    const storedNotifications = localStorage.getItem(`${NOTIFICATIONS_KEY}_${salaId}`);

    if (storedCount) {
      setNewPostsCount(parseInt(storedCount, 10));
    }

    if (storedNotifications) {
      try {
        setNotifications(JSON.parse(storedNotifications));
      } catch (error) {
        console.error('Error parsing notifications:', error);
      }
    }
  }, [salaId]);

  // Guardar en localStorage cuando cambie
  useEffect(() => {
    if (!salaId) return;

    localStorage.setItem(`${STORAGE_KEY}_${salaId}`, newPostsCount.toString());
    localStorage.setItem(`${NOTIFICATIONS_KEY}_${salaId}`, JSON.stringify(notifications));
  }, [newPostsCount, notifications, salaId]);

  // Marcar como leído (resetear contador)
  const markAsRead = useCallback(() => {
    if (!salaId) return;

    setNewPostsCount(0);
    setNotifications([]);
    localStorage.setItem(`${STORAGE_KEY}_${salaId}`, '0');
    localStorage.setItem(`${NOTIFICATIONS_KEY}_${salaId}`, '[]');
  }, [salaId]);

  // Limpiar notificaciones sin resetear contador
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    if (salaId) {
      localStorage.setItem(`${NOTIFICATIONS_KEY}_${salaId}`, '[]');
    }
  }, [salaId]);

  // Suscribirse a nuevos posts
  useEffect(() => {
    if (!currentUserId || !salaId) {
      console.log('📬 useNewPostsNotification - No hay usuario o sala');
      return;
    }

    console.log('📬 useNewPostsNotification - Suscribiendo a posts de sala:', salaId);

    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      channel = supabase
        .channel(`new-posts-${salaId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'post_sala',
            filter: `id_sala=eq.${salaId}`
          },
          async (payload) => {
            console.log('📬 Nuevo post detectado:', payload);

            const newPost = payload.new;
            const autorId = newPost.id_usuario;

            // Solo mostrar notificación si NO es del usuario actual
            if (autorId === currentUserId) {
              console.log('📬 Post creado por el usuario actual, ignorando notificación');
              return;
            }

            // Obtener información del autor
            try {
              const { data: autor, error } = await supabase
                .from('usuario')
                .select('nombre, username')
                .eq('id_usuario', autorId)
                .single();

              const autorNombre = autor?.nombre || autor?.username || 'Usuario Desconocido';

              const notification: NewPostNotification = {
                postId: newPost.id,
                autorId: autorId,
                autorNombre: autorNombre,
                contenido: newPost.contenido?.substring(0, 100) || 'Nuevo post',
                salaId: salaId
              };

              console.log('📬 Agregando notificación:', notification);

              setNotifications(prev => [...prev, notification]);
              setNewPostsCount(prev => prev + 1);
            } catch (error) {
              console.error('Error obteniendo información del autor:', error);
            }
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      console.log('📬 Limpiando suscripción de posts');
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUserId, salaId]);

  return {
    newPostsCount,
    notifications,
    clearNotifications,
    markAsRead
  };
};
