import { useEffect, useRef } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useChatWindows } from '@/app/contexts/ChatWindowContext';
import { supabase } from '@/infrastructure/services/SupabaseClient';

/**
 * Hook para detectar mensajes entrantes y abrir automáticamente ventanas de chat
 */
export const useIncomingMessages = () => {
  const { usuario } = useAuth();
  const { openChatWindow } = useChatWindows();
  const processedMessagesRef = useRef<Set<string>>(new Set());

  console.log('📬 useIncomingMessages - Hook ejecutado');
  console.log('📬 useIncomingMessages - Usuario:', usuario?.userAuth);
  console.log('📬 useIncomingMessages - openChatWindow:', typeof openChatWindow);

  useEffect(() => {
    console.log('📬 useIncomingMessages - useEffect ejecutado');

    if (!usuario?.userAuth) {
      console.log('📬 useIncomingMessages - No hay usuario logeado');
      return;
    }

    const currentUserId = usuario.userAuth;
    console.log('📬 useIncomingMessages - Configurando listener para usuario:', currentUserId);

    // Suscribirse a mensajes donde el usuario actual es el RECEPTOR
    const channel = supabase
      .channel('incoming-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `id_receptor=eq.${currentUserId}`
        },
        async (payload) => {
          console.log('📬 useIncomingMessages - Nuevo mensaje recibido:', payload);

          const mensajeId = payload.new.id;
          const idEmisor = payload.new.id_emisor;

          // Evitar procesar el mismo mensaje múltiples veces
          if (processedMessagesRef.current.has(mensajeId)) {
            console.log('📬 useIncomingMessages - Mensaje ya procesado, ignorando');
            return;
          }

          // Marcar como procesado
          processedMessagesRef.current.add(mensajeId);

          // Obtener información del emisor
          try {
            console.log('📬 useIncomingMessages - Buscando emisor con user_auth:', idEmisor);

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
              console.error('📬 useIncomingMessages - No se pudo encontrar el usuario emisor');
              console.error('📬 useIncomingMessages - Error:', error);

              // Abrir ventana con datos por defecto si hay error
              openChatWindow({
                userId: idEmisor,
                userName: 'Usuario Desconocido',
                userAvatar: 'UD',
                userColor: 'bg-purple-600',
                isOnline: true
              });
              return;
            }

            console.log('📬 useIncomingMessages - Emisor encontrado:', emisorData);

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

            console.log('📬 useIncomingMessages - Datos procesados:', {
              nombreCompleto,
              iniciales,
              userAvatar,
              colorClass,
              colorMarco
            });

            // Abrir ventana de chat
            openChatWindow({
              userId: idEmisor,
              userName: nombreCompleto,
              userAvatar: userAvatar,
              userColor: colorClass,
              isOnline: true // Asumimos que está online porque acaba de enviar un mensaje
            });

            console.log('📬 useIncomingMessages - Ventana de chat abierta para:', nombreCompleto);
          } catch (err) {
            console.error('📬 useIncomingMessages - Error procesando mensaje entrante:', err);
          }
        }
      )
      .subscribe();

    console.log('📬 useIncomingMessages - Suscripción configurada');

    // Limpiar suscripción al desmontar
    return () => {
      console.log('📬 useIncomingMessages - Eliminando suscripción');
      supabase.removeChannel(channel);
    };
  }, [usuario?.userAuth, openChatWindow]);
};
import { useEffect, useCallback } from 'react';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { Mensaje } from '@/domain/entities/Mensaje';

interface IncomingMessageHandler {
  onNewMessage: (mensaje: {
    id: string;
    idEmisor: string;
    idReceptor: string;
    texto: string;
    emisorNombre?: string;
  }) => void;
}

export const useIncomingMessages = (
  currentUserId: string | null,
  handler: IncomingMessageHandler
) => {
  useEffect(() => {
    if (!currentUserId) {
      console.log('🔔 useIncomingMessages - No hay usuario actual, no se configura suscripción');
      return;
    }

    console.log('🔔 useIncomingMessages - Configurando suscripción para usuario:', currentUserId);

    // Suscribirse a TODOS los mensajes donde el usuario actual es el receptor
    const channel = supabase
      .channel('incoming-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `id_receptor=eq.${currentUserId}`
        },
        async (payload) => {
          console.log('🔔 useIncomingMessages - Nuevo mensaje recibido:', payload);

          const nuevoMensaje = {
            id: payload.new.id,
            idEmisor: payload.new.id_emisor,
            idReceptor: payload.new.id_receptor,
            texto: payload.new.texto
          };

          // Intentar obtener el nombre del emisor
          try {
            const { data: userData } = await supabase
              .from('usuario')
              .select('nombre')
              .eq('id', payload.new.id_emisor)
              .single();

            if (userData) {
              handler.onNewMessage({
                ...nuevoMensaje,
                emisorNombre: userData.nombre
              });
            } else {
              handler.onNewMessage(nuevoMensaje);
            }
          } catch (error) {
            console.error('🔔 useIncomingMessages - Error obteniendo nombre de emisor:', error);
            handler.onNewMessage(nuevoMensaje);
          }
        }
      )
      .subscribe();

    console.log('🔔 useIncomingMessages - Suscripción configurada');

    return () => {
      console.log('🔔 useIncomingMessages - Eliminando suscripción');
      supabase.removeChannel(channel);
    };
  }, [currentUserId, handler]);
};
