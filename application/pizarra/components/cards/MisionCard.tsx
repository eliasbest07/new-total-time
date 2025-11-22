import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../../types';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMisionActiva } from '@/hooks/useMisionActiva';
import { misionActivaRepository } from '@/infrastructure/datasource/SupabaseMisionActivaRepository';
import { supabase } from '@/infrastructure/services/SupabaseClient';

interface MisionCardProps {
  card: Card;
  editingTitle: string | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
  handleMisionPlayPause: (cardId: string, isRunning: boolean) => void;
  screenshots: any[];
  isCapturing: boolean;
  captureNow: () => Promise<string | null>;
}

export const MisionCard: React.FC<MisionCardProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle,
  handleMisionPlayPause,
  screenshots,
  isCapturing,
  captureNow
}) => {
  const [chatMessage, setChatMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // Estados para el contador de tiempo
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEntregarModal, setShowEntregarModal] = useState(false);
  const [entregaTexto, setEntregaTexto] = useState('');
  const [entregaImagen, setEntregaImagen] = useState<File | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Obtener el usuario actual (UUID del auth)
  const { usuario } = useAuth();
  const currentUserUuid = usuario?.id || null;

  // Obtener el UUID del creador directamente de misionData
  // Si no hay id_creador, usar el usuario actual como fallback (para misiones antiguas)
  const creadorUuid = card.misionData?.idCreador || currentUserUuid;

  // console.log('💬 [MisionCard] currentUserUuid:', currentUserUuid);
  // console.log('💬 [MisionCard] creadorUuid desde misionData:', card.misionData?.idCreador);
  // console.log('💬 [MisionCard] creadorUuid final (con fallback):', creadorUuid);

  // Hook para gestionar misiones activas
  const { submitEntrega } = useMisionActiva();

  // Estado para rastrear capture_now
  const [captureNowValue, setCaptureNowValue] = useState<string | null>(null);
  const captureNowValueRef = useRef<string | null>(null);
  const isProcessingCapture = useRef(false);

  // Mantener la ref sincronizada con el estado
  useEffect(() => {
    captureNowValueRef.current = captureNowValue;
    console.log('🔔 [CAPTURE NOW VALUE CHANGED] captureNowValue cambió a:', captureNowValue);
  }, [captureNowValue]);

  // Hook de chat para mensajes reales
  const {
    mensajes,
    loading: loadingMensajes,
    sending,
    enviarMensaje
  } = useChatMessages(currentUserUuid, creadorUuid);

  // Efecto para el contador de tiempo
  useEffect(() => {
    if (card.misionData?.isRunning) {
      // ✅ FIX MEMORY LEAK: Limpiar intervalo anterior antes de crear uno nuevo
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      // Limpiar cuando no está corriendo
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // ✅ FIX MEMORY LEAK: Cleanup que siempre limpia el intervalo y la ref
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [card.misionData?.isRunning]);

  // Efecto para actualizar el título de la pestaña del navegador
  useEffect(() => {
    if (card.misionData?.isRunning && elapsedSeconds > 0) {
      const timeString = formatTime(elapsedSeconds);
      const misionTitle = card.misionData?.title || card.title;
      document.title = `⏱️ ${timeString} - ${misionTitle}`;
    } else if (!card.misionData?.isRunning && elapsedSeconds > 0) {
      // Si se pausa, mostrar el tiempo pausado
      const timeString = formatTime(elapsedSeconds);
      const misionTitle = card.misionData?.title || card.title;
      document.title = `⏸️ ${timeString} - ${misionTitle}`;
    }

    // Restaurar el título original cuando se desmonte o cuando se reinicie
    return () => {
      if (elapsedSeconds === 0 || !card.misionData?.isRunning) {
        document.title = 'Pizarra'; // Título por defecto
      }
    };
  }, [card.misionData?.isRunning, elapsedSeconds, card.misionData?.title, card.title]);
// Efecto para suscribirse a cambios en capture_now
useEffect(() => {
  const idMision = card.misionData?.id_mision;
  const isRunning = card.misionData?.isRunning;
  const misionActivaId = card.misionData?.misionActivaId;

  console.log('📡 [MISION CARD - SUBSCRIPTION CHECK]', {
    cardId: card.id,
    cardType: card.type,
    isRunning,
    idMision,
    misionActivaId,
    willSubscribe: !!(isRunning && idMision)
  });

  if (!isRunning || !idMision) {
    console.log('⏸️ [MISION CARD] No se suscribe porque:', {
      isRunning,
      idMision,
      razon: !isRunning ? 'misión no está corriendo' : 'no tiene id_mision'
    });
    return;
  }

  console.log('✅ [MISION CARD] *** INICIANDO SUSCRIPCIÓN A CAPTURE_NOW ***');
  console.log('📡 [MISION CARD] Suscribiéndose a capture_now para:', {
    tipo: 'mision',
    id_referencia: idMision,
    misionActivaId
  });

  const normalizarCaptureNow = (valor: string | null): string | null => {
    if (!valor) return valor;
    let valorNormalizado = valor;
    try {
      if (typeof valor === 'string' && (valor.startsWith('"{') || valor.startsWith('"'))) {
        valorNormalizado = JSON.parse(valor);
      }
    } catch {
      // no-op
    }
    return valorNormalizado;
  };

  // 🔹 Obtener el valor actual
  const obtenerValorActual = async () => {
    try {
      console.log('🔍 [MISION CARD] Consultando valor actual de capture_now en BD...');
      const misionActual = await misionActivaRepository.getByTipoAndReferenciaOnly('mision', Number(idMision));

      if (misionActual) {
        const valorNormalizado = normalizarCaptureNow(misionActual.capture_now);
        console.log('📊 [MISION CARD] Valor inicial de capture_now:', valorNormalizado);
        setCaptureNowValue(valorNormalizado);
      } else {
        console.warn('⚠️ [MISION CARD] No se encontró la misión activa en BD');
      }
    } catch (error) {
      console.error('❌ [MISION CARD] Error obteniendo valor actual de capture_now:', error);
    }
  };

  obtenerValorActual();

  // 🔹 Suscripción realtime mejorada
  const channelName = `misiones_activas_mision_${idMision}_${Date.now()}`;
  console.log('🔌 [MISION CARD] Creando canal:', channelName);

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'misiones_activas',
        // Usar filtro simple y verificar condiciones en el callback
        filter: `tipo=eq.mision`,
      },
      (payload) => {
        console.log('📡 [MISION CARD] *** EVENTO RECIBIDO EN TIEMPO REAL ***');
        console.log('📡 [MISION CARD] payload completo:', JSON.stringify(payload, null, 2));

        const updatedMision = payload.new;
        if (!updatedMision) {
          console.log('⚠️ [MISION CARD] updatedMision es null, ignorando');
          return;
        }

        // Verificar que sea nuestra misión específica
        if (updatedMision.id_referencia !== Number(idMision)) {
          console.log('⏭️ [MISION CARD] No es nuestra misión, ignorando:', {
            recibido: updatedMision.id_referencia,
            esperado: Number(idMision)
          });
          return;
        }

        console.log('✅ [MISION CARD] Es nuestra misión, procesando...');
        console.log('📡 [MISION CARD] Datos de la misión actualizada:', {
          id: updatedMision.id,
          tipo: updatedMision.tipo,
          id_referencia: updatedMision.id_referencia,
          capture_now: updatedMision.capture_now,
          capture_now_type: typeof updatedMision.capture_now
        });

        const newCaptureNow = updatedMision.capture_now;
        const valorNormalizado = normalizarCaptureNow(newCaptureNow);

        console.log('📡 [MISION CARD] Cambio en capture_now:', {
          anterior: captureNowValue,
          nuevo: valorNormalizado,
          esIgual: captureNowValue === valorNormalizado,
          tipoAnterior: typeof captureNowValue,
          tipoNuevo: typeof valorNormalizado
        });

        setCaptureNowValue(valorNormalizado);
      }
    )
    .on('system', {}, (payload) => {
      console.log('🔌 [MISION CARD] Evento del sistema:', payload);
    })
    .subscribe((status, err) => {
      console.log('🔌 [MISION CARD] Estado de suscripción:', status);
      if (err) {
        console.error('❌ [MISION CARD] Error en suscripción:', err);
      }
      if (status === 'SUBSCRIBED') {
        console.log('✅ [MISION CARD] *** SUSCRIPCIÓN ACTIVA Y CONFIRMADA ***');
      }
    });

  // 🔹 Suscripción adicional para debugging (escucha TODOS los cambios)
  const debugChannelName = `debug_misiones_activas_${Date.now()}`;
  const debugChannel = supabase
    .channel(debugChannelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'misiones_activas',
      },
      (payload) => {
        console.log('🐛 [DEBUG] Cambio detectado en misiones_activas:', {
          id: payload.new?.id,
          tipo: payload.new?.tipo,
          id_referencia: payload.new?.id_referencia,
          capture_now: payload.new?.capture_now,
          esNuestraMision: payload.new?.tipo === 'mision' && payload.new?.id_referencia === Number(idMision)
        });
      }
    )
    .subscribe();

  console.log('📡 [MISION CARD] *** SUSCRIPCIONES ACTIVAS Y ESCUCHANDO ***');

  // ✅ FIX MEMORY LEAK: Cleanup que desuscribe correctamente ambos canales
  return () => {
    console.log('🔌 [MISION CARD] *** DESUSCRIBIÉNDOSE DE CAPTURE_NOW ***');

    // Desuscribir y eliminar los canales correctamente
    channel.unsubscribe().then(() => {
      console.log('✅ [MISION CARD] Canal principal desuscrito');
      supabase.removeChannel(channel);
    });

    debugChannel.unsubscribe().then(() => {
      console.log('✅ [MISION CARD] Canal debug desuscrito');
      supabase.removeChannel(debugChannel);
    });
  };
}, [card.misionData?.isRunning, card.misionData?.id_mision]);

// Efecto para procesar capturas cuando capture_now = "0"
useEffect(() => {
  console.log('🔍 [CAPTURE EFFECT] *** EFECTO EJECUTADO ***');
  console.log('🔍 [CAPTURE EFFECT] Estado actual:', {
    captureNowValue,
    captureNowValueTipo: typeof captureNowValue,
    captureNowValueString: String(captureNowValue),
    isProcessingCapture: isProcessingCapture.current,
    isRunning: card.misionData?.isRunning,
    misionActivaId: card.misionData?.misionActivaId,
    cardId: card.id
  });

  const processCaptureRequest = async () => {
    console.log('🔍 [CAPTURE EFFECT] Evaluando condiciones:', {
      'captureNowValue === "0"': captureNowValue === '0',
      'captureNowValue': captureNowValue,
      'captureNowValue (JSON)': JSON.stringify(captureNowValue),
      'isProcessingCapture.current': isProcessingCapture.current,
      'isRunning': card.misionData?.isRunning
    });

    // Verificar cada condición individualmente
    const condicion1 = captureNowValue === '0';
    const condicion2 = !isProcessingCapture.current;
    const condicion3 = card.misionData?.isRunning;

    console.log('🔍 [CAPTURE EFFECT] Condiciones individuales:', {
      'captureNowValue === "0"': condicion1,
      '!isProcessingCapture.current': condicion2,
      'isRunning': condicion3,
      'todasLasCondiciones': condicion1 && condicion2 && condicion3
    });

    if (!condicion1 || !condicion2 || !condicion3) {
      console.log('⏭️ [CAPTURE EFFECT] No se cumplieron las condiciones para capturar:', {
        razon: !condicion1 ? 'captureNowValue no es "0"' : 
               !condicion2 ? 'ya se está procesando una captura' :
               !condicion3 ? 'la misión no está corriendo' : 'desconocida'
      });
      return;
    }

    console.log('🚀 [CAPTURE NOW] *** INICIANDO CAPTURA BAJO DEMANDA ***');

    const misionActivaId = card.misionData?.misionActivaId;
    if (!misionActivaId) {
      console.error('❌ [CAPTURE NOW] No hay misionActivaId disponible');
      return;
    }

    try {
      isProcessingCapture.current = true;

      const captureUrl = await captureNow();
      if (!captureUrl) {
        console.error('❌ [CAPTURE NOW] No se pudo obtener la captura');
        return;
      }

      console.log('✅ [CAPTURE NOW] Captura obtenida:', captureUrl);

      const resultado = await misionActivaRepository.updateCaptureNow(misionActivaId, captureUrl);
      if (resultado) {
        console.log('✅ [CAPTURE NOW] *** CAPTURA COMPLETADA Y GUARDADA EN BD ***');
      } else {
        console.error('❌ [CAPTURE NOW] Error actualizando capture_now en BD');
      }
    } catch (error) {
      console.error('❌ [CAPTURE NOW] Error en procesamiento:', error);
    } finally {
      isProcessingCapture.current = false;
    }
  };

  processCaptureRequest();
}, [captureNowValue, card.misionData?.isRunning, card.misionData?.misionActivaId, captureNow]);
  // Función para formatear el tiempo
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    console.log('💬 [handleSendMessage] Iniciando...');
    console.log('💬 [handleSendMessage] chatMessage:', chatMessage);
    console.log('💬 [handleSendMessage] currentUserUuid:', currentUserUuid);
    console.log('💬 [handleSendMessage] creadorUuid:', creadorUuid);

    if (chatMessage.trim() && currentUserUuid && creadorUuid) {
      try {
        console.log('💬 [handleSendMessage] Enviando mensaje...');
        const resultado = await enviarMensaje(chatMessage.trim());
        console.log('💬 [handleSendMessage] Resultado:', resultado);
        setChatMessage('');
        console.log('💬 Mensaje enviado exitosamente');
      } catch (error) {
        console.error('💬 Error enviando mensaje:', error);
      }
    } else {
      console.log('💬 [handleSendMessage] Condiciones no cumplidas:');
      console.log('  - chatMessage.trim():', chatMessage.trim());
      console.log('  - currentUserUuid:', currentUserUuid);
      console.log('  - creadorUuid:', creadorUuid);
    }
    // Siempre abrir el chat, con o sin mensaje
    setShowChat(true);
  };

  const handleSendNewMessage = async () => {
    console.log('💬 [handleSendNewMessage] Iniciando...');
    console.log('💬 [handleSendNewMessage] newMessage:', newMessage);
    console.log('💬 [handleSendNewMessage] currentUserUuid:', currentUserUuid);
    console.log('💬 [handleSendNewMessage] creadorUuid:', creadorUuid);

    if (newMessage.trim() && currentUserUuid && creadorUuid) {
      try {
        console.log('💬 [handleSendNewMessage] Enviando mensaje...');
        const resultado = await enviarMensaje(newMessage.trim());
        console.log('💬 [handleSendNewMessage] Resultado:', resultado);
        setNewMessage('');
        console.log('💬 Mensaje enviado exitosamente');
      } catch (error) {
        console.error('💬 Error enviando mensaje:', error);
      }
    } else {
      console.log('💬 [handleSendNewMessage] Condiciones no cumplidas:');
      console.log('  - newMessage.trim():', newMessage.trim());
      console.log('  - currentUserUuid:', currentUserUuid);
      console.log('  - creadorUuid:', creadorUuid);
    }
  };

  const handleBackToMision = () => {
    setShowChat(false);
    setNewMessage('');
  };

  // Función para manejar play/pause
  // La solicitud de permiso de pantalla se maneja automáticamente en useScreenshots
  const handlePlayPauseClick = (cardId: string, isRunning: boolean) => {
    handleMisionPlayPause(cardId, isRunning);
  };

  // 🧪 Función de prueba para simular cambio en capture_now
  const testCaptureNow = async () => {
    const idMision = card.misionData?.id_mision;
    if (!idMision) {
      console.log('❌ [TEST] No hay id_mision para probar');
      return;
    }

    try {
      console.log('🧪 [TEST] Simulando cambio en capture_now...');
      
      // Primero obtener la misión activa
      const misionActual = await misionActivaRepository.getByTipoAndReferenciaOnly('mision', Number(idMision));
      
      if (!misionActual) {
        console.log('❌ [TEST] No se encontró la misión activa');
        return;
      }

      console.log('🧪 [TEST] Misión encontrada:', misionActual.id);
      
      // Actualizar capture_now a "0" directamente en Supabase
      const { data, error } = await supabase
        .from('misiones_activas')
        .update({ capture_now: '0' })
        .eq('id', misionActual.id)
        .select()
        .single();

      if (error) {
        console.error('❌ [TEST] Error actualizando capture_now:', error);
      } else {
        console.log('✅ [TEST] capture_now actualizado exitosamente:', data);
      }
    } catch (error) {
      console.error('❌ [TEST] Error en testCaptureNow:', error);
    }
  };

  // Función para manejar el botón de entregar
  const handleEntregar = () => {
    setShowEntregarModal(true);
    // Detener la misión (como si se diera pause)
    if (card.misionData?.isRunning) {
      handleMisionPlayPause(card.id, true);
    }
  };

  // Función para enviar la entrega
  const handleSubmitEntrega = async () => {
    try {
      console.log('📦 [ENTREGA] Iniciando envío de entrega...');

      if (!entregaTexto.trim()) {
        alert('Por favor, agrega una descripción de tu entrega');
        return;
      }

      if (!currentUserUuid) {
        alert('No se pudo identificar el usuario');
        return;
      }

      // 1. Subir imagen si existe (directamente a Supabase Storage)
      let imagenUrl: string | null = null;
      if (entregaImagen) {
        console.log('📸 [ENTREGA] Subiendo imagen de entrega directamente a Supabase...');

        // Generar nombre del archivo
        const timestamp = Date.now();
        const fileExtension = entregaImagen.name.split('.').pop() || 'jpg';
        const filename = `${currentUserUuid}/${card.id}/entrega-${timestamp}.${fileExtension}`;

        // Subir archivo directamente al bucket 'entregables'
        const { data, error } = await supabase.storage
          .from('entregables')
          .upload(filename, entregaImagen, {
            contentType: entregaImagen.type || 'image/jpeg',
            upsert: false
          });

        if (error) {
          console.error('❌ Error subiendo imagen:', error);
          alert(`Error al subir la imagen: ${error.message}`);
          return;
        }

        // Obtener URL pública
        const { data: publicUrlData } = supabase.storage
          .from('entregables')
          .getPublicUrl(filename);

        imagenUrl = publicUrlData.publicUrl;
        console.log('✅ [ENTREGA] Imagen subida:', imagenUrl);
      }

      // 2. Guardar entrega en misiones_activas
      console.log('💾 [ENTREGA] Guardando entrega en Supabase...');

      // Obtener el ID de la misión activa del card
      const misionActivaId = card.misionData?.misionActivaId;

      if (!misionActivaId) {
        console.error('❌ No se encontró el ID de la misión activa');
        alert('Error: No se pudo encontrar la misión activa. Asegúrate de haber iniciado la misión primero.');
        return;
      }

      const result = await submitEntrega(misionActivaId, {
        entrega_descripcion: entregaTexto,
        entrega_imagen_url: imagenUrl ? [imagenUrl] : [],
        tiempo_total_segundos: elapsedSeconds,
        // Aquí podríamos agregar las capturas guardadas durante la ejecución
        capturas_urls: []
      });

      if (result) {
        console.log('✅ [ENTREGA] Entrega guardada exitosamente:', result.id);
        alert('¡Entrega enviada exitosamente! 🎉');

        // Cerrar modal y resetear formulario
        setShowEntregarModal(false);
        setEntregaTexto('');
        setEntregaImagen(null);
        setElapsedSeconds(0);
      } else {
        console.error('❌ Error guardando entrega');
        alert('Error al guardar la entrega. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('❌ Error en handleSubmitEntrega:', error);
      alert('Error al enviar la entrega. Intenta de nuevo.');
    }
  };

  // Función para cancelar la entrega
  const handleCancelEntrega = () => {
    setShowEntregarModal(false);
    setEntregaTexto('');
    setEntregaImagen(null);
  };

  // Vista de chat
  if (showChat) {
    return (
      <div className="flex flex-col h-full w-full p-3">
        {/* Header del chat sin botón volver */}
        <div className="flex items-center gap-2 mb-2 border-b border-green-200 pb-2">
          <div style={{ fontSize: `${Math.max(16, (card.fontSize || 18) + 2)}px` }}>💬</div>
          <h3
            className="font-semibold text-green-800 truncate flex-1"
            style={{ fontSize: `${(card.fontSize || 18) - 2}px` }}
          >
            Chat: {card.misionData?.title || card.title}
          </h3>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto mb-2 space-y-2">
          {loadingMensajes ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-4 h-4 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin" />
            </div>
          ) : mensajes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-xs">
              No hay mensajes aún
            </div>
          ) : (
            mensajes.map((msg) => {
              const esMio = currentUserUuid && msg.esDelUsuario(currentUserUuid);
              return (
                <div
                  key={msg.id}
                  className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      esMio
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-xs leading-tight">{msg.texto}</p>
                    <span className="text-[10px] opacity-70 mt-1 block">
                      {msg.createdAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input para nuevos mensajes y botón back */}
        <div className="border-t border-green-200 pt-2">
          <div className="flex gap-1 items-center">
            {/* Botón de volver en la esquina inferior izquierda */}
            <button
              onClick={handleBackToMision}
              className="text-green-700 hover:text-green-900 transition-colors text-lg font-bold px-2"
              data-todo-interactive
              title="Volver a la misión"
            >
              ←
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !sending) {
                  handleSendNewMessage();
                }
              }}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 placeholder-gray-500 text-gray-700"
              data-todo-interactive
              disabled={sending || !currentUserUuid || !creadorUuid}
            />
            <button
              onClick={handleSendNewMessage}
              disabled={!newMessage.trim() || sending || !currentUserUuid || !creadorUuid}
              className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded text-xs transition-colors"
              data-todo-interactive
            >
              {sending ? '...' : '➤'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determinar si está corriendo para cambiar colores
  const isRunning = card.misionData?.isRunning || false;
  const borderColor = isRunning ? 'border-orange-200' : 'border-green-200';
  const textColor = isRunning ? 'text-orange-800' : 'text-green-800';
  const textColorSecondary = isRunning ? 'text-orange-700' : 'text-green-700';
  const bgColor = isRunning ? 'bg-orange-600' : 'bg-green-600';
  const bgColorHover = isRunning ? 'hover:bg-orange-700' : 'hover:bg-green-700';

  // Modal de entrega
  if (showEntregarModal) {
    return (
      <div className="flex flex-col h-full w-full p-4 bg-white">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📦 Entregar Misión</h2>

        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Título de la misión */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              type="text"
              value={card.misionData?.title || card.title}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-700"
            />
          </div>

          {/* Tiempo transcurrido */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo transcurrido</label>
            <input
              type="text"
              value={formatTime(elapsedSeconds)}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-700"
            />
          </div>

          {/* Descripción/Comentarios */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción/Comentarios</label>
            <textarea
              value={entregaTexto}
              onChange={(e) => setEntregaTexto(e.target.value)}
              placeholder="Describe lo que realizaste..."
              className="w-full px-3 py-2 border text-gray-600 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[80px]"
              data-todo-interactive
            />
          </div>

          {/* Subir imagen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Imagen (opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setEntregaImagen(e.target.files?.[0] || null)}
              className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              data-todo-interactive
            />
            {entregaImagen && (
              <p className="text-xs text-gray-600 mt-1">✓ {entregaImagen.name}</p>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleCancelEntrega}
            className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded transition-colors"
            data-todo-interactive
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmitEntrega}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            data-todo-interactive
          >
            Enviar Entrega
          </button>
        </div>
      </div>
    );
  }

  // Vista normal de la misión
  return (
    <div className="flex flex-col h-full w-full p-3">
      {/* Botón Entregar - Solo visible cuando está corriendo */}
      {isRunning && (
        <div className="flex justify-between mb-2">
          <button
            onClick={testCaptureNow}
            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
            data-todo-interactive
          >
            🔔
          </button>
          <button
            onClick={handleEntregar}
            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            data-todo-interactive
          >
            📦 Entregar
          </button>
        </div>
      )}

      {/* Contador de tiempo - Visible cuando está corriendo */}
      {isRunning && (
        <div className="text-center mb-2">
          <div className="bg-orange-100 border border-orange-300 rounded px-3 py-2">
            <span className="text-orange-900 font-mono text-lg font-bold">
              ⏱️ {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>
      )}

      {/* Header con icono, título y horas */}
      <div className={`flex items-center gap-2 mb-2 border-b ${borderColor} pb-2`}>
        <div style={{ fontSize: `${Math.max(16, (card.fontSize || 18) + 2)}px` }}>🎯</div>
        {editingTitle === card.id ? (
          <input
            type="text"
            defaultValue={card.title}
            onBlur={(e) => updateCardTitle(card.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateCardTitle(card.id, e.currentTarget.value);
              }
              if (e.key === 'Escape') {
                setEditingTitle(null);
              }
            }}
            className={`font-semibold ${textColor} flex-1 bg-transparent border-b ${isRunning ? 'border-orange-400' : 'border-green-400'} focus:outline-none`}
            autoFocus
            data-todo-interactive
          />
        ) : (
          <h3
            className={`font-semibold ${textColor} truncate flex-1`}
            style={{ fontSize: `${(card.fontSize || 18) - 2}px` }}
          >
            {card.misionData?.title || card.title}
          </h3>
        )}
        <div className={`${bgColor} text-white rounded-full px-2 py-1 font-bold text-xs`}>
          {card.misionData?.hours || 1}h
        </div>
      </div>

      {/* Descripción */}
      <div className="mb-2">
        <p
          className={textColorSecondary}
          style={{ fontSize: `${(card.fontSize || 18) - 4}px` }}
        >
          {card.misionData?.description || card.title}
        </p>
      </div>

      {/* Sección central con botón de play e imagen */}
      <div className="flex-1 flex flex-col justify-center items-center gap-2 data-todo-interactive">
        {/* Botón de play/pause centrado */}
        <button
          className={`${bgColor} ${bgColorHover} text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200 shadow-lg hover:shadow-xl`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handlePlayPauseClick(card.id, card.misionData?.isRunning || false);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          data-todo-interactive
        >
          <div style={{ fontSize: `${Math.max(14, (card.fontSize || 18) - 2)}px` }}>
            {card.misionData?.isRunning ? '⏸️' : '▶️'}
          </div>
        </button>

        {/* Imagen aspecto 16x9 - Muestra última captura */}
        <div
          className={`${isRunning ? 'bg-orange-200 border-orange-300' : 'bg-green-200 border-green-300'} rounded border-2 overflow-hidden w-40`}
          style={{ aspectRatio: '16/9' }}
        >
          {card.misionData?.lastCaptureUrl ? (
            <img
              src={card.misionData.lastCaptureUrl}
              alt="Última captura"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${isRunning ? 'from-orange-300 to-orange-500' : 'from-green-300 to-green-500'} flex items-center justify-center`}>
              <div
                className={`${isRunning ? 'text-orange-800' : 'text-green-800'} font-medium text-center`}
                style={{ fontSize: `${(card.fontSize || 18) - 8}px` }}
              >
                📸
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input de chat al final del card */}
      <div className={`mt-2 pt-2 border-t ${borderColor}`}>
        <div className="flex gap-1">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            placeholder="Contactar..."
            className={`flex-1 px-2 py-1 text-xs border ${isRunning ? 'border-orange-300 focus:ring-orange-500' : 'border-green-300 focus:ring-green-500'} rounded focus:outline-none focus:ring-1 placeholder-gray-500 text-gray-700`}
            data-todo-interactive
          />
          <button
            onClick={handleSendMessage}
            className={`px-2 py-1 ${bgColor} ${bgColorHover} text-white rounded text-xs transition-colors`}
            data-todo-interactive
          >
            💬
          </button>
        </div>
      </div>
    </div>
  );
};
