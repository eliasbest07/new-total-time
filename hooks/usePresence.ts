import { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    if (!organizationId || !currentUser) {
      // console.log('⚠️ Presence: No hay organizationId o currentUser');
      return;
    }

    // console.log('🟢 Presence: Iniciando tracking para', currentUser.username);

    // Crear canal de presencia específico para la organización
    const channel = supabase.channel(`presence-org-${organizationId}`, {
      config: {
        presence: {
          key: currentUser.id, // Usar user_id como key única
        },
      },
    });

    // Escuchar cambios de presencia
    channel
      .on('presence', { event: 'sync' }, () => {
        // Sync se dispara cuando hay cambios en la presencia
        const state = channel.presenceState<PresenceUser>();
        // console.log('🔄 Presence Sync:', state);

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
        // console.log(`👥 Usuarios online: ${users.length}`, users.map(u => u.username));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // console.log('✅ Usuario conectado:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // console.log('❌ Usuario desconectado:', leftPresences);
      })
      .subscribe(async (status) => {
        // console.log('📡 Presence status:', status);

        if (status === 'SUBSCRIBED') {
          // Una vez suscrito, trackear la presencia del usuario actual
          await channel.track({
            user_id: currentUser.id,
            username: currentUser.username,
            avatar: currentUser.avatar || null,
            online_at: new Date().toISOString(),
          });
          // console.log('✅ Tracking iniciado para:', currentUser.username);
        }
      });

    channelRef.current = channel;

    // Cleanup: dejar de trackear cuando el componente se desmonta
    return () => {
      // console.log('🔴 Presence: Limpiando tracking para', currentUser.username);
      if (channelRef.current) {
        channelRef.current.untrack();
        channelRef.current.unsubscribe();
      }
    };
  }, [organizationId, currentUser?.id, currentUser?.username, currentUser?.avatar]);

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
