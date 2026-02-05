import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../../types';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMisionActiva } from '@/hooks/useMisionActiva';
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
  updateCard: (cardId: string, updates: Partial<Card>) => void;
  deleteCard?: (cardId: string) => void;
  readOnly?: boolean; // Si es true, oculta botones de play/pause y otras acciones
  onShowFullDescription?: (title: string, description: string) => void;
}

export const MisionCard: React.FC<MisionCardProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle,
  handleMisionPlayPause,
  screenshots,
  isCapturing,
  captureNow,
  updateCard,
  deleteCard,
  readOnly = false,
  onShowFullDescription
}) => {
  const [chatMessage, setChatMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // Estados para el contador de tiempo
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEntregarModal, setShowEntregarModal] = useState(false);
  const [entregaTexto, setEntregaTexto] = useState('');
  const [entregaImagen, setEntregaImagen] = useState<File | null>(null);
  const [enviandoEntrega, setEnviandoEntrega] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🔒 ESTADO LOCAL SIMPLE - Solo bloquear después de capturas
  const [localIsRunning, setLocalIsRunning] = useState(card.misionData?.isRunning || false);
  const [justProcessedCapture, setJustProcessedCapture] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
  const { submitEntrega, subscribeToMisionActiva, subscribeToMisionActivaByReferencia, updateCaptureNow } = useMisionActiva();

  // SIMPLE: Solo un botón para tomar captura manual
  const [isCapturingManual, setIsCapturingManual] = useState(false);

  // Usar ref para evitar re-suscripciones innecesarias
  const captureRequestedRef = useRef(false);
  const captureNowRef = useRef(captureNow);
  const updateCaptureNowRef = useRef(updateCaptureNow);

  // Guardar el ID de suscripción para no perderlo cuando el card se actualice
  const suscripcionIdRef = useRef<{ id: string | number, tipo: 'misionActivaId' | 'id_mision' } | null>(null);

  // Actualizar refs cuando cambien las funciones
  useEffect(() => {
    captureNowRef.current = captureNow;
    updateCaptureNowRef.current = updateCaptureNow;
  }, [captureNow, updateCaptureNow]);

  // 🧹 CLEANUP: Pausar misiones abandonadas al cargar la página
  useEffect(() => {
    const cleanupAbandonedMision = async () => {
      // Solo ejecutar una vez al montar
      if (card.misionData?.isRunning && card.misionData?.misionActivaId) {
        console.log('🧹 [CLEANUP] Detectada misión en estado running al cargar. Pausando automáticamente...');

        try {
          // Pausar la misión en Supabase
          await supabase
            .from('misiones_activas')
            .update({
              is_running: false,
              estado: 'pausada',
              fecha_fin: new Date().toISOString()
            })
            .eq('id', card.misionData.misionActivaId);

          console.log('✅ [CLEANUP] Misión pausada automáticamente');

          // Actualizar estado local
          setLocalIsRunning(false);
        } catch (error) {
          console.error('❌ [CLEANUP] Error pausando misión:', error);
        }
      }
    };

    // Ejecutar cleanup después de un breve delay para permitir que la UI se inicialice
    const timer = setTimeout(cleanupAbandonedMision, 1000);

    return () => clearTimeout(timer);
  }, []); // Solo ejecutar una vez al montar

  // SUSCRIPCIÓN A CAMBIOS EN MISIONES_ACTIVAS - Detectar solicitudes de captura
  useEffect(() => {
    console.log('🔍 [DEBUG NORMAL] Verificando card.misionData:', {
      existe_misionData: !!card.misionData,
      id_mision: card.misionData?.id_mision,
      misionActivaId: card.misionData?.misionActivaId,
      isRunning: card.misionData?.isRunning,
      suscripcionActual: suscripcionIdRef.current,
      todo_misionData: card.misionData
    });

    // Declarar channel al inicio para evitar problemas en el cleanup
    let channel: any = null;

    // Usar misionActivaId si está disponible, sino usar id_mision
    const idParaSuscribirse = card.misionData?.misionActivaId || card.misionData?.id_mision;
    const usarMisionActivaId = !!card.misionData?.misionActivaId;

    // Si no hay ID pero tenemos una suscripción guardada, mantenerla
    if (!idParaSuscribirse && suscripcionIdRef.current) {
      console.log('🔒 [DEBUG NORMAL] Manteniendo suscripción existente:', suscripcionIdRef.current);
      return;
    }

    // Si no hay ID y tampoco suscripción, no hacer nada
    if (!idParaSuscribirse) {
      console.log('⚠️ [DEBUG NORMAL] No hay misionActivaId ni id_mision para suscribirse');
      return;
    }

    // Si ya hay una suscripción con el mismo ID, no re-suscribir
    if (suscripcionIdRef.current &&
      suscripcionIdRef.current.id === idParaSuscribirse &&
      suscripcionIdRef.current.tipo === (usarMisionActivaId ? 'misionActivaId' : 'id_mision')) {
      console.log('✅ [DEBUG NORMAL] Ya suscrito a este ID, no re-suscribir');
      return;
    }

    // Guardar el ID en la ref
    suscripcionIdRef.current = {
      id: idParaSuscribirse,
      tipo: usarMisionActivaId ? 'misionActivaId' : 'id_mision'
    };

    console.log('🔔 [DEBUG NORMAL] ========== SUSCRIBIENDO A MISIÓN ACTIVA ==========');
    console.log('🔔 [DEBUG NORMAL] Usando:', usarMisionActivaId ? 'misionActivaId' : 'id_mision');
    console.log('🔔 [DEBUG NORMAL] ID:', idParaSuscribirse);

    // Si tenemos misionActivaId, suscribirse directamente
    // Si solo tenemos id_mision, suscribirse por referencia
    channel = usarMisionActivaId
      ? subscribeToMisionActiva(
        String(idParaSuscribirse),
        async (updatedMision) => {
          if (!updatedMision) return;

          console.log('📡 [DEBUG NORMAL] ========== ACTUALIZACIÓN RECIBIDA ==========');
          console.log('📡 [DEBUG NORMAL] Estado completo:', updatedMision);
          console.log('📡 [DEBUG NORMAL] capture_now:', updatedMision.capture_now);
          console.log('📡 [DEBUG NORMAL] is_running ANTES:', card.misionData?.isRunning);
          console.log('📡 [DEBUG NORMAL] is_running NUEVO:', updatedMision.is_running);

          // 🚫 BLOQUEAR CAMBIOS DE ESTADO NO DESEADOS
          // Si la misión estaba corriendo y ahora viene is_running=false, IGNORAR
          if (card.misionData?.isRunning && !updatedMision.is_running) {
            console.log('🚫 [ANTI-PAUSE] BLOQUEANDO cambio de is_running=true a false');
            console.log('🚫 [ANTI-PAUSE] Manteniendo estado local isRunning=true');
            // NO actualizar el estado local - mantener la misión corriendo
          }

          // Detectar solicitud de captura (capture_now === '1')
          if (updatedMision.capture_now === '1' && !captureRequestedRef.current) {
            console.log('🚨 [DEBUG NORMAL] ¡SOLICITUD DE CAPTURA DETECTADA!');
            console.log('🚨 [DEBUG NORMAL] Tomando captura automáticamente...');

            captureRequestedRef.current = true;

            try {
              // Tomar captura automáticamente usando la ref
              const captureUrl = await captureNowRef.current();

              if (captureUrl) {
                console.log('✅ [DEBUG NORMAL] Captura tomada exitosamente:', captureUrl);

                // Marcar que acabamos de procesar una captura
                setJustProcessedCapture(true);

                // Limpiar el flag después de 5 segundos
                setTimeout(() => {
                  setJustProcessedCapture(false);
                  console.log('🔄 [SIMPLE STATE] Flag de captura limpiado');
                }, 5000);

                // Actualizar capture_now con la URL de la captura
                if (updatedMision.id) {
                  console.log('📤 [DEBUG NORMAL] Enviando URL de captura al servidor...');
                  await updateCaptureNowRef.current(updatedMision.id, captureUrl);
                }

              } else {
                console.error('❌ [DEBUG NORMAL] Error al tomar la captura');
              }
            } catch (error) {
              console.error('❌ [DEBUG NORMAL] Error en captura automática:', error);
            } finally {
              // Resetear el flag después de un tiempo
              setTimeout(() => {
                captureRequestedRef.current = false;
                console.log('🔄 [DEBUG NORMAL] Flag de captura reseteado');
              }, 2000);
            }
          } else if (updatedMision.capture_now === '1') {
            console.log('⏭️ [DEBUG NORMAL] Solicitud ya procesada, ignorando...');
          } else if (updatedMision.capture_now && updatedMision.capture_now !== '0') {
            console.log('🖼️ [DEBUG NORMAL] Captura ya tiene URL:', updatedMision.capture_now);
          }

          console.log('📡 [DEBUG NORMAL] ========== FIN ACTUALIZACIÓN ==========');
        }
      )
      : subscribeToMisionActivaByReferencia(
        'mision',
        idParaSuscribirse as number,
        async (updatedMision) => {
          if (!updatedMision) return;

          console.log('📡 [DEBUG NORMAL] ========== ACTUALIZACIÓN RECIBIDA ==========');
          console.log('📡 [DEBUG NORMAL] Estado completo:', updatedMision);
          console.log('📡 [DEBUG NORMAL] capture_now:', updatedMision.capture_now);
          console.log('📡 [DEBUG NORMAL] is_running ANTES:', card.misionData?.isRunning);
          console.log('📡 [DEBUG NORMAL] is_running NUEVO:', updatedMision.is_running);

          // 🚫 BLOQUEAR CAMBIOS DE ESTADO NO DESEADOS
          // Si la misión estaba corriendo y ahora viene is_running=false, IGNORAR
          if (card.misionData?.isRunning && !updatedMision.is_running) {
            console.log('🚫 [ANTI-PAUSE] BLOQUEANDO cambio de is_running=true a false');
            console.log('🚫 [ANTI-PAUSE] Manteniendo estado local isRunning=true');
            // NO actualizar el estado local - mantener la misión corriendo
          }

          // Detectar solicitud de captura (capture_now === '1')
          if (updatedMision.capture_now === '1' && !captureRequestedRef.current) {
            console.log('🚨 [DEBUG NORMAL] ¡SOLICITUD DE CAPTURA DETECTADA!');
            console.log('🚨 [DEBUG NORMAL] Tomando captura automáticamente...');

            captureRequestedRef.current = true;

            try {
              // Tomar captura automáticamente usando la ref
              const captureUrl = await captureNowRef.current();

              if (captureUrl) {
                console.log('✅ [DEBUG NORMAL] Captura tomada exitosamente:', captureUrl);

                // Marcar que acabamos de procesar una captura
                setJustProcessedCapture(true);

                // Limpiar el flag después de 5 segundos
                setTimeout(() => {
                  setJustProcessedCapture(false);
                  console.log('🔄 [SIMPLE STATE] Flag de captura limpiado');
                }, 5000);

                // Actualizar capture_now con la URL de la captura
                if (updatedMision.id) {
                  console.log('📤 [DEBUG NORMAL] Enviando URL de captura al servidor...');
                  await updateCaptureNowRef.current(updatedMision.id, captureUrl);
                  console.log('✅ [DEBUG NORMAL] URL enviada exitosamente');
                }


              } else {
                console.error('❌ [DEBUG NORMAL] Error al tomar la captura');
                alert('❌ Error al tomar la captura');
              }
            } catch (error) {
              console.error('❌ [DEBUG NORMAL] Error en captura automática:', error);
            } finally {
              // Resetear el flag después de un tiempo
              setTimeout(() => {
                captureRequestedRef.current = false;
                console.log('🔄 [DEBUG NORMAL] Flag de captura reseteado');
              }, 2000);
            }
          } else if (updatedMision.capture_now === '1') {
            console.log('⏭️ [DEBUG NORMAL] Solicitud ya procesada, ignorando...');
          } else if (updatedMision.capture_now && updatedMision.capture_now !== '0') {
            console.log('🖼️ [DEBUG NORMAL] Captura ya tiene URL:', updatedMision.capture_now);
          }

          console.log('📡 [DEBUG NORMAL] ========== FIN ACTUALIZACIÓN ==========');
        }
      );

    return () => {
      console.log('🔕 [DEBUG NORMAL] Cleanup llamado');
      // Solo desuscribir si realmente hay un canal
      if (channel) {
        console.log('🔕 [DEBUG NORMAL] Desuscribiendo del canal');
        channel.unsubscribe();
      }
      // NO limpiar la ref aquí - la mantenemos para futuras actualizaciones del card
    };
  }, [card.misionData?.misionActivaId, card.misionData?.id_mision, subscribeToMisionActiva, subscribeToMisionActivaByReferencia]);

  // SIMPLE: Solo mostrar alerta cuando el usuario debe tomar captura - usar estado local
  useEffect(() => {
    // Si la misión está corriendo, mostrar botón de captura manual
    if (localIsRunning) {
      console.log('✅ [SIMPLE] Misión corriendo, usuario puede tomar capturas');
    }
  }, [localIsRunning]);

  // Hook de chat para mensajes reales
  const {
    mensajes,
    loading: loadingMensajes,
    sending,
    enviarMensaje
  } = useChatMessages(currentUserUuid, creadorUuid);

  // Sincronizar estado - SOLO sincronizar, sin bloqueos complejos
  useEffect(() => {
    const dbIsRunning = card.misionData?.isRunning || false;

    console.log('🔄 [SIMPLE STATE] Cambio detectado:', {
      db_state: dbIsRunning,
      local_state: localIsRunning,
      justProcessedCapture
    });

    // Sincronizar siempre, excepto si acabamos de procesar una captura Y es una pausa
    if (dbIsRunning !== localIsRunning) {
      // Si acabamos de procesar una captura y viene una pausa automática, ignorarla
      // Solo bloquear si: 1) hay flag de captura, 2) la BD dice false, 3) local dice true
      if (justProcessedCapture && !dbIsRunning && localIsRunning) {
        console.log('🚫 [SIMPLE STATE] Ignorando pausa automática después de captura');
        return;
      }

      console.log('✅ [SIMPLE STATE] Sincronizando estado:', dbIsRunning);
      setLocalIsRunning(dbIsRunning);
    }
  }, [card.misionData?.isRunning, localIsRunning, justProcessedCapture]);

  // Efecto para el contador de tiempo - usar estado local
  useEffect(() => {
    if (localIsRunning) {
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
  }, [localIsRunning]);

  // Efecto para actualizar el título de la pestaña del navegador - usar estado local
  useEffect(() => {
    if (localIsRunning && elapsedSeconds > 0) {
      const timeString = formatTime(elapsedSeconds);
      const misionTitle = card.misionData?.title || card.title;
      document.title = `⏱️ ${timeString} - ${misionTitle}`;
    } else if (!localIsRunning && elapsedSeconds > 0) {
      // Si se pausa, mostrar el tiempo pausado
      const timeString = formatTime(elapsedSeconds);
      const misionTitle = card.misionData?.title || card.title;
      document.title = `⏸️ ${timeString} - ${misionTitle}`;
    }

    // Restaurar el título original cuando se desmonte o cuando se reinicie
    return () => {
      if (elapsedSeconds === 0 || !localIsRunning) {
        document.title = 'Pizarra'; // Título por defecto
      }
    };
  }, [localIsRunning, elapsedSeconds, card.misionData?.title, card.title]);

  // Auto-pause cuando se cierre o recargue la página
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      console.log('🚪 [BEFOREUNLOAD] Página cerrando, verificando misiones activas...');

      // Si la misión está corriendo, pausarla
      if (localIsRunning && card.misionData?.misionActivaId) {
        console.log('⏸️ [BEFOREUNLOAD] Pausando misión antes de cerrar página...');

        try {
          // Usar sendBeacon para asegurar que la petición se envía incluso al cerrar
          const misionActivaId = card.misionData.misionActivaId;
          const updateData = {
            is_running: false,
            estado: 'pausada',
            fecha_fin: new Date().toISOString()
          };

          // Usar fetch con keepalive para que la petición se complete aunque se cierre la página
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

          if (supabaseUrl && supabaseKey) {
            fetch(`${supabaseUrl}/rest/v1/misiones_activas?id=eq.${misionActivaId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify(updateData),
              keepalive: true  // CRÍTICO: mantiene la petición aunque se cierre la página
            });

            console.log('✅ [BEFOREUNLOAD] Petición de pause enviada con keepalive');
          }
        } catch (error) {
          console.error('❌ [BEFOREUNLOAD] Error pausando misión:', error);
        }
      }
    };

    // Agregar listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [localIsRunning, card.misionData?.misionActivaId]);

  // SIMPLE: Función para tomar captura manual
  const handleManualCapture = async () => {
    console.log('📸 [MANUAL CAPTURE] INICIO - Estado antes:', {
      isRunning: card.misionData?.isRunning,
      estado: card.misionData?.estado,
      misionActivaId: card.misionData?.misionActivaId
    });

    setIsCapturingManual(true);

    try {
      console.log('📸 [MANUAL CAPTURE] Llamando captureNow()...');
      const captureUrl = await captureNow();

      console.log('📸 [MANUAL CAPTURE] captureNow() completado:', captureUrl);
      console.log('📸 [MANUAL CAPTURE] Estado después de captureNow:', {
        isRunning: card.misionData?.isRunning,
        estado: card.misionData?.estado,
        misionActivaId: card.misionData?.misionActivaId
      });

      if (captureUrl) {
        alert('✅ ¡Captura tomada exitosamente!');
        console.log('✅ Captura guardada:', captureUrl);
      } else {
        alert('❌ Error al tomar la captura');
      }
    } catch (error) {
      console.error('❌ Error en captura manual:', error);
      alert('❌ Error al tomar la captura');
    } finally {
      setIsCapturingManual(false);

      console.log('📸 [MANUAL CAPTURE] FIN - Estado final:', {
        isRunning: card.misionData?.isRunning,
        estado: card.misionData?.estado,
        misionActivaId: card.misionData?.misionActivaId
      });
    }
  };
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

  // Función para manejar play/pause con mejor control de flujo
  const handlePlayPauseClick = async (cardId: string, isRunning: boolean) => {
    console.log('🎮 [PLAY/PAUSE] Click detectado:', { cardId, isRunning, newState: !isRunning, isProcessing });

    // Evitar clicks múltiples mientras se procesa
    if (isProcessing) {
      console.log('⏳ [PLAY/PAUSE] Ya se está procesando una acción, ignorando click');
      return;
    }

    const newState = !isRunning;

    // Si vamos a iniciar (play), mostrar loading ANTES de pedir permisos
    if (newState) {
      console.log('🎬 [PLAY/PAUSE] Iniciando play - mostrando estado de carga');
      setIsProcessing(true);
      setIsRequestingPermission(true);
      // NO actualizar localIsRunning aún - esperar a que se acepten permisos
    } else {
      // Si vamos a pausar, actualizar inmediatamente
      console.log('⏸️ [PLAY/PAUSE] Pausando - actualizando estado inmediatamente');
      setIsProcessing(true);
      setLocalIsRunning(false);
    }

    // Limpiar flag de captura cuando el usuario hace cambios manuales
    setJustProcessedCapture(false);

    try {
      // Llamar al handler original (ahora async)
      await handleMisionPlayPause(cardId, isRunning);

      // Si llegamos aquí sin error y era play, actualizar a running
      if (newState && !localIsRunning) {
        console.log('✅ [PLAY/PAUSE] Permisos aceptados, actualizando a running');
        setLocalIsRunning(true);
      }
    } catch (error) {
      console.error('❌ [PLAY/PAUSE] Error en play/pause:', error);
      // Si hubo error, revertir estado
      if (newState) {
        console.log('⚠️ [PLAY/PAUSE] Error o permisos cancelados, revirtiendo estado');
        setLocalIsRunning(false);
      }
    } finally {
      setIsProcessing(false);
      setIsRequestingPermission(false);
    }
  };



  // Función para manejar el botón de entregar
  const handleEntregar = () => {
    setShowEntregarModal(true);
    // Detener la misión (como si se diera pause)
    if (localIsRunning) {
      setJustProcessedCapture(false); // Limpiar flag
      handleMisionPlayPause(card.id, true);
    }
  };

  // Función para enviar la entrega
  const handleSubmitEntrega = async () => {
    if (enviandoEntrega) return;

    setEnviandoEntrega(true);
    try {
      console.log('📦 [ENTREGA] Iniciando envío de entrega...');

      if (!entregaTexto.trim()) {
        alert('Por favor, agrega una descripción de tu entrega');
        setEnviandoEntrega(false);
        return;
      }

      if (!currentUserUuid) {
        alert('No se pudo identificar el usuario');
        setEnviandoEntrega(false);
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
        tiempo_total_segundos: elapsedSeconds
        // Las capturas se guardan automáticamente en la tabla 'capture' y se obtienen al enviar
      });

      if (result) {
        console.log('✅ [ENTREGA] Entrega guardada exitosamente:', result.id);

        // Desasignar el usuario de la misión original
        const misionId = card.misionData?.id_mision;
        if (misionId) {
          const { error: updateError } = await supabase
            .from('misiones')
            .update({ id_usuario: null })
            .eq('id', misionId);

          if (updateError) {
            console.error('⚠️ Error al desasignar usuario:', updateError);
          } else {
            console.log('✅ Usuario desasignado de la misión');
          }
        }

        alert('¡Entrega enviada exitosamente! 🎉');

        // Cerrar modal y resetear formulario
        setShowEntregarModal(false);
        setEntregaTexto('');
        setEntregaImagen(null);
        setElapsedSeconds(0);

        // Eliminar el card de la pizarra
        if (deleteCard) {
          deleteCard(card.id);
          console.log('🗑️ Card eliminado de la pizarra');
        }
      } else {
        console.error('❌ Error guardando entrega');
        alert('Error al guardar la entrega. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('❌ Error en handleSubmitEntrega:', error);
      alert('Error al enviar la entrega. Intenta de nuevo.');
    } finally {
      setEnviandoEntrega(false);
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
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${esMio
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

  // Determinar si está corriendo para cambiar colores - usar estado local protegido
  const isRunning = localIsRunning;
  // Si está solicitando permisos, usar colores amarillos (estado intermedio)
  const borderColor = isRequestingPermission ? 'border-yellow-200' : (isRunning ? 'border-orange-200' : 'border-green-200');
  const textColor = isRequestingPermission ? 'text-yellow-800' : (isRunning ? 'text-orange-800' : 'text-green-800');
  const textColorSecondary = isRequestingPermission ? 'text-yellow-700' : (isRunning ? 'text-orange-700' : 'text-green-700');
  const bgColor = isRequestingPermission ? 'bg-yellow-500' : (isRunning ? 'bg-orange-600' : 'bg-green-600');
  const bgColorHover = isRequestingPermission ? 'hover:bg-yellow-600' : (isRunning ? 'hover:bg-orange-700' : 'hover:bg-green-700');

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
            disabled={enviandoEntrega}
            className={`flex-1 px-4 py-2 rounded transition-colors ${enviandoEntrega
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            data-todo-interactive
          >
            {enviandoEntrega ? 'Enviando...' : 'Enviar Entrega'}
          </button>
        </div>
      </div>
    );
  }

  // Vista normal de la misión
  return (
    <div className={`flex flex-col h-full w-full p-3 ${isRunning ? 'bg-orange-50' : 'bg-white'}`}>
      {/* Botón de entregar - solo visible cuando la misión está activa */}
      {isRunning && (
        <div className="flex justify-end mb-2">
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
          {(() => {
            const description = card.misionData?.description || card.title;
            const MAX_LENGTH = 80;
            const isLong = description.length > MAX_LENGTH;

            if (!isLong) return description;

            return (
              <>
                {description.substring(0, MAX_LENGTH)}...{' '}
                <button
                  onClick={() => onShowFullDescription?.(
                    card.misionData?.title || card.title,
                    description
                  )}
                  className={`${isRunning ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'} underline`}
                  data-todo-interactive
                >
                  ver más
                </button>
              </>
            );
          })()}
        </p>
      </div>

      {/* Sección central con botón de play e imagen */}
      <div className="flex-1 flex flex-col justify-center items-center gap-2 data-todo-interactive">
        {/* Botón de play/pause centrado - Solo visible si no es readOnly */}
        {!readOnly && (
          <button
            className={`${bgColor} ${bgColorHover} text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200 shadow-lg hover:shadow-xl ${isProcessing ? 'cursor-wait' : 'cursor-pointer'}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handlePlayPauseClick(card.id, localIsRunning);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            disabled={isProcessing}
            data-todo-interactive
          >
            <div style={{ fontSize: `${Math.max(14, (card.fontSize || 18) - 2)}px` }}>
              {isRequestingPermission ? '⏳' : (localIsRunning ? '⏸️' : '▶️')}
            </div>
          </button>
        )}

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
