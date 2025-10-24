import { useEffect, useRef, useState, useMemo } from 'react';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  user_id: string;
  username: string;
  avatar?: string;
  online_at: string;
}

export interface UsePresenceReturn {
  onlineUsers: PresenceUser[];
  isUserOnline: (userId: string) => boolean;
  totalOnline: number;
}

/**
 * Hook para manejar el estado de presencia (online/offline) de usuarios
 * usando Supabase Realtime Presence API
 *
 * @param organizationId - ID de la organización para crear un canal de presencia específico
 * @param currentUser - Usuario actual que se va a trackear
 * @returns Objeto con usuarios online y funciones de utilidad
 */
export const usePresence = (
  organizationId: string | undefined,
  currentUser: { id: string; username: string; avatar?: string } | null
): UsePresenceReturn => {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ✅ FIX: Estabilizar currentUser para evitar recrear el canal constantemente
  const stableCurrentUser = useMemo(() =>
    currentUser ? {
      id: currentUser.id,
      username: currentUser.username,
      avatar: currentUser.avatar
    } : null,
    [currentUser?.id, currentUser?.username, currentUser?.avatar]
  );

  useEffect(() => {
    if (!organizationId || !stableCurrentUser) {
      return;
    }

    // Crear canal de presencia específico para la organización
    const channel = supabase.channel(`presence-org-${organizationId}`, {
      config: {
        presence: {
          key: stableCurrentUser.id, // Usar user_id como key única
        },
      },
    });

    // Escuchar cambios de presencia
    channel
      .on('presence', { event: 'sync' }, () => {
        // Sync se dispara cuando hay cambios en la presencia
        const state = channel.presenceState<PresenceUser>();

        // Convertir el estado en un array de usuarios
        const users: PresenceUser[] = [];
        Object.keys(state).forEach((key) => {
          const presences = state[key];
          if (presences && presences.length > 0) {
            // Tomar la presencia más reciente si hay múltiples
            users.push(presences[0] as PresenceUser);
          }
        });

        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Usuario conectado
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Usuario desconectado
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Una vez suscrito, trackear la presencia del usuario actual
          await channel.track({
            user_id: stableCurrentUser.id,
            username: stableCurrentUser.username,
            avatar: stableCurrentUser.avatar || null,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    // ✅ FIX: Limpieza mejorada para evitar memory leaks
    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, stableCurrentUser]); // ✅ FIX: Usar stableCurrentUser como dependencia

  // Función de utilidad para verificar si un usuario específico está online
  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.some(user => user.user_id === userId);
  };

  return {
    onlineUsers,
    isUserOnline,
    totalOnline: onlineUsers.length,
  };
};
