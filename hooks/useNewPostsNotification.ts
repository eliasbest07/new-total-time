import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  getUnviewedPostsCount,
  markPostAsViewed,
  isPostViewed
} from '@/services/viewedPostsService';
import { userCacheService } from '@/infrastructure/services/UserCacheService';

interface NewPostNotification {
  postId: string;
  autorId: string;
  autorNombre: string;
  contenido: string;
  salaId: number;
  timestamp: string; // Timestamp de cuándo se creó la notificación
}

interface UseNewPostsNotificationReturn {
  newPostsCount: number;
  notifications: NewPostNotification[];
  clearNotifications: () => void;
  markAsRead: () => void;
  markPostAsViewed: (postId: string) => void; // Nueva función para marcar posts individuales
}

const NOTIFICATIONS_KEY = 'post_notifications';

export const useNewPostsNotification = (
  currentUserId: number | null,
  salaId: number | null,
  allPostIds: string[] = [] // IDs de todos los posts actuales para calcular no vistos
): UseNewPostsNotificationReturn => {
  const [newPostsCount, setNewPostsCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NewPostNotification[]>([]);

  // Cargar notificaciones desde localStorage al iniciar
  useEffect(() => {
    if (!salaId) return;

    const storedNotifications = localStorage.getItem(`${NOTIFICATIONS_KEY}_${salaId}`);

    if (storedNotifications) {
      try {
        const parsed = JSON.parse(storedNotifications);
        setNotifications(parsed);
      } catch (error) {
        console.error('Error parsing notifications:', error);
      }
    }
  }, [salaId]);

  // Calcular contador de posts no vistos basado en localStorage
  useEffect(() => {
    if (!salaId || allPostIds.length === 0) {
      setNewPostsCount(0);
      return;
    }

    const unviewedCount = getUnviewedPostsCount(salaId, allPostIds);
    setNewPostsCount(unviewedCount);
  }, [salaId, allPostIds]);

  // Guardar notificaciones en localStorage cuando cambien
  useEffect(() => {
    if (!salaId) return;
    localStorage.setItem(`${NOTIFICATIONS_KEY}_${salaId}`, JSON.stringify(notifications));
  }, [notifications, salaId]);

  // Marcar como leído (limpiar solo las notificaciones toast, no los posts no vistos)
  const markAsRead = useCallback(() => {
    if (!salaId) return;

    // Solo limpiar las notificaciones de toast, el contador se mantiene hasta que vean los posts
    setNotifications([]);
    localStorage.setItem(`${NOTIFICATIONS_KEY}_${salaId}`, '[]');
  }, [salaId]);

  // Marcar un post individual como visto
  const markPostAsViewedHandler = useCallback((postId: string) => {
    if (!salaId) return;

    markPostAsViewed(salaId, postId);

    // Recalcular contador
    if (allPostIds.length > 0) {
      const unviewedCount = getUnviewedPostsCount(salaId, allPostIds);
      setNewPostsCount(unviewedCount);
    }
  }, [salaId, allPostIds]);

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
      // console.log('📬 useNewPostsNotification - No hay usuario o sala');
      return;
    }

    // console.log('📬 useNewPostsNotification - Suscribiendo a posts de sala:', salaId);

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
            // console.log('📬 Nuevo post detectado:', payload);

            const newPost = payload.new;
            const autorId = newPost.id_usuario; // ID numérico del usuario

            // Solo mostrar notificación si NO es del usuario actual
            if (autorId === currentUserId) {
              // console.log('📬 Post creado por el usuario actual, ignorando notificación');
              return;
            }

            // Verificar si el post ya fue visto (por si acaso)
            if (isPostViewed(salaId, newPost.id)) {
              // console.log('📬 Post ya fue visto anteriormente, ignorando');
              return;
            }

            // ✅ Obtener información del autor usando el servicio de caché (buscar por ID numérico)
            try {
              // Obtener el usuario usando el ID numérico
              const usuariosData = await userCacheService.getUsersById([autorId]);
              const autorData = usuariosData.get(autorId);

              const autorNombre = autorData?.nombre || autorData?.username || 'Usuario Desconocido';

              const notification: NewPostNotification = {
                postId: newPost.id,
                autorId: autorId,
                autorNombre: autorNombre,
                contenido: newPost.contenido?.substring(0, 100) || 'Nuevo post',
                salaId: salaId,
                timestamp: new Date().toISOString()
              };

              // console.log('📬 Agregando notificación:', notification);

              setNotifications(prev => [...prev, notification]);

              // El contador se actualiza automáticamente por el efecto que calcula posts no vistos
            } catch (error) {
              console.error('Error obteniendo información del autor:', error);
            }
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      // console.log('📬 Limpiando suscripción de posts');
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUserId, salaId]);

  return {
    newPostsCount,
    notifications,
    clearNotifications,
    markAsRead,
    markPostAsViewed: markPostAsViewedHandler
  };
};
