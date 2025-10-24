import { useEffect, useRef } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useChatWindows } from '@/app/contexts/ChatWindowContext';
import { supabase } from '@/infrastructure/services/SupabaseClient';

interface UseIncomingMessagesOptions {
  onNewMessage?: (userData: {
    userId: string;
    userName: string;
    userAvatar: string;
    userColor: string;
    isOnline: boolean;
  }) => void;
}

/**
 * Hook para detectar mensajes entrantes y abrir automáticamente ventanas de chat
 * @param userId - ID del usuario (opcional, si no se pasa usa el del contexto Auth)
 * @param options - Opciones con callback onNewMessage (opcional)
 */
export const useIncomingMessages = (
  userId?: string | null,
  options?: UseIncomingMessagesOptions
) => {
  const { usuario } = useAuth();
  const chatWindowsContext = useChatWindows();
  const processedMessagesRef = useRef<Set<string>>(new Set());

  // ✅ FIX: Usar useRef para mantener estable el callback y evitar recrear el canal
  const onNewMessageRef = useRef(options?.onNewMessage);
  const chatWindowsContextRef = useRef(chatWindowsContext);

  // Actualizar refs cuando cambien
  useEffect(() => {
    onNewMessageRef.current = options?.onNewMessage;
    chatWindowsContextRef.current = chatWindowsContext;
  }, [options?.onNewMessage, chatWindowsContext]);

  // Usar el userId pasado por parámetro o el del contexto
  const currentUserId = userId || usuario?.userAuth;

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    // ✅ FIX: Nombre único de canal por usuario para evitar conflictos
    const channel = supabase
      .channel(`incoming-messages-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `id_receptor=eq.${currentUserId}`
        },
        async (payload) => {
          const mensajeId = payload.new.id;
          const idEmisor = payload.new.id_emisor;

          // Evitar procesar el mismo mensaje múltiples veces
          if (processedMessagesRef.current.has(mensajeId)) {
            return;
          }

          // Marcar como procesado
          processedMessagesRef.current.add(mensajeId);

          // Obtener información del emisor
          try {

            // Intentar con user_auth primero
            let { data: emisorData, error } = await supabase
              .from('usuario')
              .select('id, correo, nombre, avatar, marco, username, user_auth')
              .eq('user_auth', idEmisor)
              .maybeSingle(); // maybeSingle no falla si no hay resultados

            // Si no se encuentra con user_auth, intentar con id_usuario
            if (!emisorData || error) {
              console.log('📬 useIncomingMessages - No encontrado con user_auth, intentando con id_usuario');
              const result = await supabase
                .from('usuario')
                .select('id, correo, nombre, avatar, marco, username, user_auth, id_usuario')
                .eq('id_usuario', idEmisor)
                .maybeSingle();

              emisorData = result.data;
              error = result.error;
            }

            // Si aún no se encuentra, intentar con id
            if (!emisorData || error) {
              console.log('📬 useIncomingMessages - No encontrado con id_usuario, intentando con id');
              const result = await supabase
                .from('usuario')
                .select('id, correo, nombre, avatar, marco, username, user_auth, id_usuario')
                .eq('id', idEmisor)
                .maybeSingle();

              emisorData = result.data;
              error = result.error;
            }

            if (!emisorData || error) {
              // Abrir ventana con datos por defecto si hay error
              const defaultUserData = {
                userId: idEmisor,
                userName: 'Usuario Desconocido',
                userAvatar: 'UD',
                userColor: 'bg-purple-600',
                isOnline: true
              };

              // ✅ FIX: Usar refs estables en lugar de options/context directamente
              if (onNewMessageRef.current) {
                onNewMessageRef.current(defaultUserData);
              } else if (chatWindowsContextRef.current?.openChatWindow) {
                chatWindowsContextRef.current.openChatWindow(defaultUserData);
              }
              return;
            }

            // Obtener nombre completo (solo hay nombre, no apellido)
            const nombreCompleto = emisorData?.nombre || emisorData?.username || 'Usuario';

            // Obtener iniciales del nombre
            const palabras = nombreCompleto.split(' ').filter(p => p.length > 0);
            const iniciales = palabras.length >= 2
              ? `${palabras[0][0]}${palabras[1][0]}`.toUpperCase()
              : nombreCompleto.substring(0, 2).toUpperCase();

            // Obtener avatar (puede ser URL, iniciales o un emoji)
            // Si avatar es una URL, usarla directamente. Si no, usar iniciales
            let userAvatar = iniciales;
            if (emisorData?.avatar) {
              // Si avatar empieza con http:// o https://, es una URL
              if (emisorData.avatar.startsWith('http://') || emisorData.avatar.startsWith('https://')) {
                userAvatar = emisorData.avatar;
              } else {
                // Si no, puede ser un emoji o texto corto
                userAvatar = emisorData.avatar;
              }
            }

            // Obtener color del marco
            const colorMarco = emisorData?.marco || '';
            // Si el marco tiene un color hex, usarlo, sino usar clase por defecto
            const colorClass = colorMarco && colorMarco.startsWith('#')
              ? `bg-[${colorMarco}]`
              : colorMarco || 'bg-purple-600';

            // Datos del usuario para abrir la ventana
            const userData = {
              userId: idEmisor,
              userName: nombreCompleto,
              userAvatar: userAvatar,
              userColor: colorClass,
              isOnline: true // Asumimos que está online porque acaba de enviar un mensaje
            };

            // ✅ FIX: Usar refs estables en lugar de options/context directamente
            if (onNewMessageRef.current) {
              onNewMessageRef.current(userData);
            } else if (chatWindowsContextRef.current?.openChatWindow) {
              chatWindowsContextRef.current.openChatWindow(userData);
            }
          } catch (err) {
            console.error('❌ Error procesando mensaje entrante:', err);
          }
        }
      )
      .subscribe();

    // ✅ FIX: Limpieza mejorada para evitar memory leaks
    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [currentUserId]); // ✅ FIX: Solo currentUserId como dependencia
};
