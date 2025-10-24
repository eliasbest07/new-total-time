import { useState, useEffect, useCallback } from 'react';
import { Mensaje } from '@/domain/entities/Mensaje';
import { SupabaseMensajeRepository } from '@/infrastructure/datasource/SupabaseMensajeRepository';
import { supabase } from '@/infrastructure/services/SupabaseClient';

export const useChatMessages = (currentUserId: string | null, otherUserId: string | null) => {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const mensajeRepository = new SupabaseMensajeRepository();

  const loadMensajes = useCallback(async () => {
    // console.log('💬 useChatMessages - loadMensajes llamado:', { currentUserId, otherUserId });

    if (!currentUserId || !otherUserId) {
      // console.log('💬 useChatMessages - No hay usuarios, limpiando mensajes');
      setMensajes([]);
      setLoading(false);
      return;
    }

    try {
      // console.log('💬 useChatMessages - Cargando conversación');
      setLoading(true);
      setError(null);
      const mensajesData = await mensajeRepository.getConversacion(currentUserId, otherUserId);
      // console.log('💬 useChatMessages - Mensajes obtenidos:', mensajesData.length);
      setMensajes(mensajesData);
    } catch (err) {
      console.error('💬 useChatMessages - Error cargando mensajes:', err);
      setError('Error al cargar mensajes');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, otherUserId]);

  const enviarMensaje = async (texto: string) => {
    if (!currentUserId || !otherUserId || !texto.trim()) {
      console.error('💬 useChatMessages - Faltan datos para enviar mensaje');
      return null;
    }

    try {
      // console.log('💬 useChatMessages - Enviando mensaje');
      setSending(true);
      setError(null);
      const nuevoMensaje = await mensajeRepository.enviarMensaje(currentUserId, otherUserId, texto.trim());

      if (nuevoMensaje) {
        // Agregar el mensaje optimísticamente al estado local SOLO si no existe ya
        setMensajes(prev => {
          const existe = prev.some(m => m.id === nuevoMensaje.id);
          if (existe) {
            // console.log('💬 useChatMessages - Mensaje ya existe, no se duplica');
            return prev;
          }
          // console.log('💬 useChatMessages - Mensaje agregado optimísticamente');
          return [...prev, nuevoMensaje];
        });
        // console.log('💬 useChatMessages - Mensaje enviado exitosamente');
        return nuevoMensaje;
      }

      throw new Error('No se pudo enviar el mensaje');
    } catch (err) {
      console.error('💬 useChatMessages - Error enviando mensaje:', err);
      setError('Error al enviar mensaje');
      throw err;
    } finally {
      setSending(false);
    }
  };

  const marcarComoLeido = async (mensajeId: string) => {
    try {
      const success = await mensajeRepository.marcarComoLeido(mensajeId);
      if (success) {
        // Actualizar estado local
        setMensajes(prev => prev.map(m =>
          m.id === mensajeId ? { ...m, leido: true } : m
        ));
      }
      return success;
    } catch (err) {
      console.error('💬 useChatMessages - Error marcando mensaje como leído:', err);
      return false;
    }
  };

  const marcarConversacionComoLeida = async () => {
    if (!currentUserId || !otherUserId) return false;

    try {
      const success = await mensajeRepository.marcarConversacionComoLeida(currentUserId, otherUserId);
      if (success) {
        // Actualizar estado local
        setMensajes(prev => prev.map(m =>
          m.idReceptor === currentUserId ? { ...m, leido: true } : m
        ));
      }
      return success;
    } catch (err) {
      console.error('💬 useChatMessages - Error marcando conversación como leída:', err);
      return false;
    }
  };

  // Cargar mensajes iniciales
  useEffect(() => {
    // console.log('💬 useChatMessages - useEffect inicial ejecutado');

    if (!currentUserId || !otherUserId) {
      // console.log('💬 useChatMessages - No hay usuarios, limpiando mensajes');
      setMensajes([]);
      setLoading(false);
      return;
    }

    // console.log('💬 useChatMessages - Cargando mensajes iniciales');
    loadMensajes();
  }, [currentUserId, otherUserId, loadMensajes]);

  // Suscripción a cambios en tiempo real
  useEffect(() => {
    if (!currentUserId || !otherUserId) {
      return;
    }

    // Calcular el id_conversacion para filtrar correctamente
    const idConversacion = Mensaje.generarIdConversacion(currentUserId, otherUserId);

    // ✅ FIX: Nombre único de canal por conversación para evitar conflictos
    const channel = supabase
      .channel(`chat-${idConversacion}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mensajes',
          filter: `id_conversacion=eq.${idConversacion}`
        },
        (payload) => {

          if (payload.eventType === 'INSERT') {
            const nuevoMensaje = new Mensaje(
              payload.new.id,
              payload.new.id_emisor,
              payload.new.id_receptor,
              payload.new.texto,
              payload.new.leido,
              new Date(payload.new.created_at),
              new Date(payload.new.updated_at),
              payload.new.id_conversacion
            );

            // Agregar solo si no existe ya (evitar duplicados de cualquier origen)
            setMensajes(prev => {
              const existe = prev.some(m => m.id === nuevoMensaje.id);
              if (existe) {
                return prev;
              }
              return [...prev, nuevoMensaje];
            });
          } else if (payload.eventType === 'UPDATE') {
            setMensajes(prev => prev.map(m =>
              m.id === payload.new.id
                ? new Mensaje(
                    payload.new.id,
                    payload.new.id_emisor,
                    payload.new.id_receptor,
                    payload.new.texto,
                    payload.new.leido,
                    new Date(payload.new.created_at),
                    new Date(payload.new.updated_at),
                    payload.new.id_conversacion
                  )
                : m
            ));
          } else if (payload.eventType === 'DELETE') {
            setMensajes(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // ✅ FIX: Limpieza mejorada para evitar memory leaks
    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [currentUserId, otherUserId]);

  return {
    mensajes,
    loading,
    error,
    sending,
    enviarMensaje,
    marcarComoLeido,
    marcarConversacionComoLeida,
    refetch: loadMensajes
  };
};
