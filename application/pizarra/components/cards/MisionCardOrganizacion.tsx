import React, { useState, useEffect, useRef } from 'react';
import { Card, SubtareaMision, TodoItem, MisionData } from '../../types';
import { User, Plus, X, ChevronDown, ChevronUp, Camera, ExternalLink, Images } from 'lucide-react';
import { useMisionActiva } from '@/hooks/useMisionActiva';
import { useMisiones } from '@/hooks/useMisiones';
import { useCardTodos } from '@/hooks/useCardTodos';
import { misionActivaRepository } from '@/infrastructure/datasource/SupabaseMisionActivaRepository';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { useToastContext } from '../../contexts/ToastContext';
import { useMisionSubtareas } from '../../hooks/useMisionSubtareas';

interface MisionCardOrganizacionProps {
  card: Card;
  updateCard: (cardId: string, updates: Partial<Omit<Card, 'misionData'>> & { misionData?: Partial<MisionData> }) => void;
  usuarios?: Array<{
    id: number;
    userAuth?: string;
    profile: {
      nombre: string;
      apellido: string;
      avatar?: string;
    };
  }>;
  currentUserId?: string; // UUID del usuario autenticado
  addTodoCard?: (text?: string) => string; // Función para crear cards TODO
  addConnection?: (fromCardId: string, toCardId: string, skipValidation?: boolean) => void; // Función para crear conexiones
  allCards?: React.Dispatch<React.SetStateAction<Card[]>>; // Para verificar si el card TODO existe
  onOpenCapturasModal?: (misionActivaId: string, misionTitle: string) => void; // Callback para abrir modal de capturas a nivel de página
}

export const MisionCardOrganizacion: React.FC<MisionCardOrganizacionProps> = ({
  card,
  updateCard,
  usuarios = [],
  currentUserId,
  addTodoCard,
  addConnection,
  allCards,
  onOpenCapturasModal
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showUsuarioSelector, setShowUsuarioSelector] = useState(false);
  const [showSubtareas, setShowSubtareas] = useState(true);
  const [showEntregas, setShowEntregas] = useState(false);
  const [newSubtareaText, setNewSubtareaText] = useState('');
  const [lastCaptureUrl, setLastCaptureUrl] = useState<string | null>(null);

  // Ref para ignorar eventos realtime temporalmente después de cambios locales
  const ignorarRealtimeHasta = useRef<number>(0);

  const { info: showInfo, error: showError } = useToastContext();

  const {
    subscribeToMisionActiva,
    subscribeToMisionActivaByReferencia,
    getOrCreateMisionActiva,
    verificarMisionesInactivas,
    updateCaptureNow
  } = useMisionActiva();

  const { updateMision } = useMisiones(null, { enableRealtime: false });

  // Obtener datos de la misión
  const misionData = card.misionData || {
    title: card.title,
    hours: 1,
    description: '',
    estado: 'pendiente',
    subtareas: [],
    entregas: [],
    card_todos: []
  };

  // Hook para cargar tareas desde card_todos (tomar el primer elemento del array si existe)
  const cardTodoId = Array.isArray(misionData.card_todos) && misionData.card_todos.length > 0
    ? misionData.card_todos[0]
    : null;
  const { todos: tareasBD, loading: loadingCardTodos, createTodo, toggleCompleted, deleteTodo: deleteTodoFromBD } = useCardTodos(cardTodoId);

  // Hook para manejar subtareas usando la entidad Todo
  const {
    subtareas,
    handleToggle: handleToggleSubtarea,
    handleDelete: handleDeleteSubtarea,
    handleAdd: handleAddSubtareaInternal,
    blockSync,
    unblockSync,
    clearSubtareas
  } = useMisionSubtareas({
    cardId: card.id,
    misionData,
    tareasBD,
    updateCard,
    toggleCompletedBD: toggleCompleted,
    deleteTodoBD: deleteTodoFromBD,
    createTodoBD: createTodo
  });

  // Log del estado actual (solo en desarrollo)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [MisionOrg] Estado:', {
        id_mision: misionData.id_mision,
        estado: misionData.estado,
        isRunning: misionData.isRunning
      });
    }
  }, [misionData.estado, misionData.isRunning, misionData.id_mision]);

  // Función SIMPLE para solicitar captura
  const handleRequestCapture = async () => {
    console.log('🎯 [DEBUG ADMIN] ========== INICIO SOLICITUD CAPTURA ==========');
    console.log('🎯 [DEBUG ADMIN] Estado de la misión:', {
      misionActivaId: misionData.misionActivaId,
      isRunning: misionData.isRunning,
      usuario_asignado: misionData.usuario_asignado_nombre,
      id_usuario_asignado: misionData.id_usuario_asignado
    });

    if (!misionData.isRunning) {
      console.log('❌ [DEBUG ADMIN] La misión NO está corriendo');
      alert('⚠️ La misión debe estar en progreso para solicitar capturas');
      return;
    }

    if (!misionData.usuario_asignado_nombre) {
      console.log('❌ [DEBUG ADMIN] No hay usuario asignado');
      alert('⚠️ Debe asignar un usuario a la misión antes de solicitar capturas');
      return;
    }

    if (!misionData.misionActivaId) {
      console.log('❌ [DEBUG ADMIN] No hay misionActivaId');
      alert('⚠️ No se encontró la misión activa');
      return;
    }

    console.log('📸 [DEBUG ADMIN] Enviando señal de captura...');
    console.log('📸 [DEBUG ADMIN] misionActivaId:', misionData.misionActivaId);
    console.log('📸 [DEBUG ADMIN] Actualizando capture_now a "1"');

    // Actualizar capture_now a '1' para solicitar captura
    const resultado = await updateCaptureNow(misionData.misionActivaId, '1');

    if (resultado) {
      console.log('✅ [DEBUG ADMIN] Señal enviada exitosamente:', resultado);
      showInfo(`Solicitud enviada a ${misionData.usuario_asignado_nombre}`);
    } else {
      console.error('❌ [DEBUG ADMIN] Error al enviar la señal');
      showError('Error al enviar la solicitud de captura');
    }

    console.log('🎯 [DEBUG ADMIN] ========== FIN SOLICITUD CAPTURA ==========');
  };

  // Buscar y actualizar información del usuario asignado SOLO al montar o cuando no hay nombre
  useEffect(() => {
    if (!misionData.id_usuario_asignado || misionData.usuario_asignado_nombre) {
      return;
    }

    if (usuarios.length > 0) {
      const usuarioAsignado = usuarios.find(u => u.id === misionData.id_usuario_asignado);
      if (usuarioAsignado) {
        updateCard(card.id, {
          misionData: {
            usuario_asignado_nombre: `${usuarioAsignado.profile.nombre} ${usuarioAsignado.profile.apellido}`,
            usuario_asignado_avatar: usuarioAsignado.profile.avatar || null
          }
        });
      }
    }
  }, [usuarios.length, card.id]);

  // La sincronización de tareas BD ↔ subtareas ahora se maneja en useMisionSubtareas

  // Cargar card_todos inicial desde Supabase
  useEffect(() => {
    const cargarCardTodosInicial = async () => {
      if (!card.misionData?.id_mision) {
        return;
      }

      console.log('📋 [MISION ORG] Cargando card_todos inicial para misión:', card.misionData.id_mision);

      try {
        const { data: mision, error } = await supabase
          .from('misiones')
          .select('card_todos')
          .eq('id', card.misionData.id_mision)
          .single();

        if (error) {
          console.error('❌ Error cargando card_todos:', error);
          return;
        }

        if (mision?.card_todos && Array.isArray(mision.card_todos)) {
          console.log('✅ Card_todos cargados desde BD:', mision.card_todos);

          // Solo actualizar si es diferente al actual
          const cardTodosActuales = misionData.card_todos || [];
          const sonDiferentes = JSON.stringify(cardTodosActuales.sort()) !== JSON.stringify(mision.card_todos.sort());

          if (sonDiferentes) {
            updateCard(card.id, {
              misionData: {
                ...misionData,
                card_todos: mision.card_todos
              }
            });
          }
        }
      } catch (error) {
        console.error('❌ Error en cargarCardTodosInicial:', error);
      }
    };

    cargarCardTodosInicial();
  }, [card.misionData?.id_mision]); // Solo ejecutar al montar o cuando cambie el id_mision

  // Suscribirse a cambios en la tabla misiones para detectar actualizaciones en card_todos
  useEffect(() => {
    if (!card.misionData?.id_mision) {
      return;
    }

    console.log('📡 [MISION ORG] Suscribiendo a cambios en tabla misiones para id:', card.misionData.id_mision);

    const channel = supabase
      .channel(`mision-${card.misionData.id_mision}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'misiones',
          filter: `id=eq.${card.misionData.id_mision}`
        },
        async (payload) => {
          // Ignorar realtime por un tiempo después de desconectar
          if (Date.now() < ignorarRealtimeHasta.current) {
            return;
          }

          const nuevaMision = payload.new as any;

          // Actualizar card_todos si cambió
          if (nuevaMision.card_todos && Array.isArray(nuevaMision.card_todos)) {
            if (nuevaMision.card_todos.length === 0) {
              updateCard(card.id, {
                misionData: {
                  card_todos: [],
                  subtareas: []
                }
              });
            } else {
              updateCard(card.id, {
                misionData: {
                  card_todos: nuevaMision.card_todos
                }
              });
            }
          }

          // Manejar cambios en id_usuario (asignación/desasignación)
          if ('id_usuario' in nuevaMision) {
            if (nuevaMision.id_usuario === null) {
              // Usuario desasignado - limpiar campos
              updateCard(card.id, {
                misionData: {
                  id_usuario_asignado: null,
                  usuario_asignado_nombre: null,
                  usuario_asignado_avatar: null
                }
              });
            } else {
              // Usuario asignado - cargar info del usuario
              try {
                const { data: usuarioData } = await supabase
                  .from('usuario')
                  .select('id, nombre, avatar')
                  .eq('id', nuevaMision.id_usuario)
                  .single();

                if (usuarioData) {
                  updateCard(card.id, {
                    misionData: {
                      id_usuario_asignado: nuevaMision.id_usuario,
                      usuario_asignado_nombre: usuarioData.nombre || 'Sin nombre',
                      usuario_asignado_avatar: usuarioData.avatar || null
                    }
                  });
                }
              } catch (e) {
                console.error('Error cargando usuario asignado:', e);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 [MISION ORG] Desuscribiendo de cambios en misiones');
      supabase.removeChannel(channel);
    };
  }, [card.misionData?.id_mision, card.id]);

  // Escuchar evento de desconexión para limpiar subtareas
  useEffect(() => {
    const cardId = card.id;

    const handleConexionEliminada = (event: CustomEvent) => {
      const { type, misionCard } = event.detail;

      if (type === 'todo-mision' && misionCard?.id === cardId) {
        // Usar funciones del hook para bloquear sync y limpiar
        blockSync(5000);
        clearSubtareas();
      }
    };

    const handleConexionCreada = (event: CustomEvent) => {
      const { type, misionCard, todoCardUUID } = event.detail;

      if (type === 'todo-mision' && misionCard?.id === cardId && todoCardUUID) {
        // Desbloquear sync y actualizar card_todos
        unblockSync();
        updateCard(cardId, {
          misionData: {
            card_todos: [todoCardUUID]
          }
        });
      }
    };

    window.addEventListener('conexion-eliminada', handleConexionEliminada as EventListener);
    window.addEventListener('conexion-creada', handleConexionCreada as EventListener);
    return () => {
      window.removeEventListener('conexion-eliminada', handleConexionEliminada as EventListener);
      window.removeEventListener('conexion-creada', handleConexionCreada as EventListener);
    };
  }, [card.id, updateCard, blockSync, unblockSync, clearSubtareas]);

  // Cargar estado inicial y suscribirse a cambios (restaurado)
  useEffect(() => {
    if (!card.misionData?.id_mision) {
      return;
    }

    console.log('🔔 [MISION ORG] Suscribiendo a misiones_activas:', card.misionData.id_mision);

    // Cargar estado inicial
    const cargarEstadoInicial = async () => {
      if (!card.misionData?.id_mision) return;

      // NO verificar misiones inactivas aquí - se hace periódicamente en la página
      // para evitar pausar misiones incorrectamente al montar el componente

      // Cargar estado actual de la misión activa
      const misionActivaInicial = await misionActivaRepository.getByTipoAndReferenciaOnly(
        'mision',
        card.misionData.id_mision
      );

      if (misionActivaInicial) {
        console.log('📡 [MISION ORG] Estado inicial cargado:', {
          id: misionActivaInicial.id,
          estado: misionActivaInicial.estado,
          is_running: misionActivaInicial.is_running
        });

        // Actualizar card con estado inicial
        updateCard(card.id, {
          misionData: {
            misionActivaId: misionActivaInicial.id,
            estado: misionActivaInicial.estado,
            isRunning: misionActivaInicial.is_running || false
          }
        });

        // Cargar última captura si existe
        if (misionActivaInicial.capture_now && misionActivaInicial.capture_now !== '0' && misionActivaInicial.capture_now.startsWith('http')) {
          setLastCaptureUrl(misionActivaInicial.capture_now);
        }

        console.log('✅ [ESTADO INICIAL] Card actualizado');
      } else {
        console.log('ℹ️ [ESTADO INICIAL] No hay misión activa para:', card.misionData.id_mision);
      }
    };

    cargarEstadoInicial();

    // Suscribirse a cambios en tiempo real
    const channel = subscribeToMisionActivaByReferencia(
      'mision',
      card.misionData.id_mision,
      (updatedMision) => {
        if (!updatedMision) return;

        // Actualizar estado básico
        updateCard(card.id, {
          misionData: {
            misionActivaId: updatedMision.id,
            estado: updatedMision.estado,
            isRunning: updatedMision.is_running || false
          }
        });

        // Si hay una nueva captura, mostrarla
        if (updatedMision.capture_now && updatedMision.capture_now !== '0' && updatedMision.capture_now.startsWith('http')) {
          setLastCaptureUrl(updatedMision.capture_now);
        }
      }
    );

    return () => {
      console.log('🔕 [MISION ORG] Desuscribiendo');
      channel.unsubscribe();
    };
  }, [card.id, card.misionData?.id_mision]);

  // Función para abrir modal de capturas a nivel de página
  const handleVerTodasCapturas = () => {
    if (!onOpenCapturasModal) {
      console.warn('⚠️ onOpenCapturasModal no está disponible');
      return;
    }

    if (!misionData.misionActivaId) {
      console.warn('⚠️ No hay misionActivaId para ver capturas');
      alert('⚠️ La misión debe estar en progreso para ver las capturas');
      return;
    }

    console.log('📸 [CAPTURAS] Abriendo modal de capturas para misionActivaId:', misionData.misionActivaId);

    // Llamar al callback del padre para abrir el modal a nivel de página
    onOpenCapturasModal(misionData.misionActivaId, misionData.title);
  };

  // Manejar cambio de título
  const handleTitleChange = async (newTitle: string) => {
    // Actualizar en BD si hay id_mision
    if (misionData.id_mision) {
      try {
        const { error } = await supabase
          .from('misiones')
          .update({ nombre: newTitle })
          .eq('id', misionData.id_mision);

        if (error) {
          console.error('Error actualizando título en BD:', error);
        } else {
          console.log('✅ Título actualizado en BD');
        }
      } catch (e) {
        console.error('Error en handleTitleChange:', e);
      }
    }

    // Actualizar estado local
    updateCard(card.id, {
      title: newTitle,
      misionData: {
        ...misionData,
        title: newTitle
      }
    });
    setIsEditingTitle(false);
  };

  // Manejar cambio de descripción
  const handleDescriptionChange = async (newDescription: string) => {
    // Actualizar en BD si hay id_mision
    if (misionData.id_mision) {
      try {
        const { error } = await supabase
          .from('misiones')
          .update({ descripcion: newDescription })
          .eq('id', misionData.id_mision);

        if (error) {
          console.error('Error actualizando descripción en BD:', error);
        } else {
          console.log('✅ Descripción actualizada en BD');
        }
      } catch (e) {
        console.error('Error en handleDescriptionChange:', e);
      }
    }

    // Actualizar estado local
    updateCard(card.id, {
      misionData: {
        ...misionData,
        description: newDescription
      }
    });
    setIsEditingDescription(false);
  };

  // Manejar asignación de usuario
  const handleAsignarUsuario = async (usuario: any) => {
    if (misionData.id_mision) {
      await updateMision(misionData.id_mision, {
        id_usuario: usuario.id
      });
    }

    updateCard(card.id, {
      misionData: {
        ...card.misionData,
        id_usuario_asignado: usuario.id,
        usuario_asignado_nombre: `${usuario.profile.nombre} ${usuario.profile.apellido}`,
        usuario_asignado_avatar: usuario.profile.avatar || null
      }
    });
    setShowUsuarioSelector(false);
  };

  // El estado se controla desde otro lugar y se actualiza en tiempo real
  // No se necesita función handleToggleEstado porque no hay botón de play/pause

  // Función para mostrar/crear el card TODO en la pizarra
  const handleShowTodoCard = async () => {
    if (!addTodoCard || !addConnection || !allCards) {
      console.warn('⚠️ Funciones necesarias no disponibles');
      return;
    }

    // Verificar si hay card_todos asociados
    if (!misionData.card_todos || misionData.card_todos.length === 0) {
      console.log('ℹ️ No hay card_todos asociados a esta misión');
      alert('Esta misión no tiene una lista de tareas asociada. Agrega tareas primero.');
      return;
    }

    const cardTodoUUID = misionData.card_todos[0]; // Tomar el primer card_todos

    // Verificar si el card TODO ya existe en la pizarra usando un ref
    const todoCardExistsRef = { current: false };

    allCards((prevCards) => {
      const existingTodo = prevCards.find(c => c.id === cardTodoUUID);
      if (existingTodo) {
        todoCardExistsRef.current = true;
        console.log('✅ Card TODO ya existe en la pizarra:', cardTodoUUID);
      }
      return prevCards; // No modificar el estado
    });

    if (todoCardExistsRef.current) {
      console.log('ℹ️ El card TODO ya está en la pizarra');
      alert('El card de tareas ya está visible en la pizarra');
      return;
    }

    // El card TODO no existe, crearlo
    console.log('📝 Creando card TODO en la pizarra...');

    try {
      // Cargar las tareas desde la BD
      const { data: todos, error } = await supabase
        .from('card_todos')
        .select('*')
        .eq('id_card', cardTodoUUID)
        .order('position', { ascending: true });

      if (error) {
        console.error('❌ Error cargando tareas:', error);
        alert('Error al cargar las tareas desde la base de datos');
        return;
      }

      console.log('📋 Tareas cargadas desde BD:', todos);

      // Crear el card TODO (se creará con ID temporal primero)
      const newTodoCardId = addTodoCard('Lista de tareas');

      if (!newTodoCardId) {
        console.error('❌ No se pudo crear el card TODO');
        return;
      }

      console.log('✅ Card TODO creado con ID temporal:', newTodoCardId);

      // Reemplazar el card TODO temporal con uno que tenga el UUID correcto y las tareas de la BD
      allCards((prevCards) => {
        return prevCards.map(c => {
          if (c.id === newTodoCardId) {
            return {
              ...c,
              id: cardTodoUUID, // Reemplazar con el UUID real
              x: card.x + card.width + 40, // Posicionar a la derecha del card de misión
              y: card.y,
              todos: todos?.map((todo) => ({
                id: todo.todo_id,
                text: todo.text,
                completed: todo.completed
              })) || []
            };
          }
          return c;
        });
      });

      // Crear la conexión entre el card de misión y el card TODO
      setTimeout(() => {
        if (addConnection) {
          addConnection(card.id, cardTodoUUID, true); // skipValidation = true
          console.log('🔗 Conexión creada entre misión y TODO');
        }
      }, 150);

      alert('✅ Card de tareas creado y conectado exitosamente');

    } catch (error) {
      console.error('❌ Error en handleShowTodoCard:', error);
      alert('Error al crear el card TODO');
    }
  };

  // Wrapper para agregar subtarea y limpiar input
  const handleAddSubtarea = async () => {
    if (!newSubtareaText.trim()) return;
    await handleAddSubtareaInternal(newSubtareaText);
    setNewSubtareaText('');
  };

  // handleToggleSubtarea y handleDeleteSubtarea vienen del hook useMisionSubtareas

  // Colores según estado para el header del card
  const getHeaderColor = () => {
    switch (misionData.estado) {
      case 'pendiente':
        return 'bg-yellow-500';
      case 'en_progreso':
        return 'bg-green-500';
      case 'completada':
        return 'bg-green-500';
      case 'entregada':
        return 'bg-purple-500';
      case 'revisada':
      case 'aprobada':
        return 'bg-indigo-500';
      case 'pausada':
        return 'bg-blue-500';
      case 'rechazada':
        return 'bg-red-500';
      case 'cancelada':
        return 'bg-gray-500';
      default:
        return 'bg-green-500';
    }
  };

  // Colores según estado para el badge
  const getEstadoColor = () => {
    switch (misionData.estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'en_progreso':
        return 'bg-green-100 text-green-800';
      case 'completada':
        return 'bg-green-100 text-green-800';
      case 'entregada':
        return 'bg-purple-100 text-purple-800';
      case 'revisada':
      case 'aprobada':
        return 'bg-indigo-100 text-indigo-800';
      case 'pausada':
        return 'bg-blue-100 text-blue-800';
      case 'rechazada':
        return 'bg-red-100 text-red-800';
      case 'cancelada':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoText = () => {
    switch (misionData.estado) {
      case 'pendiente':
        return 'Pausada';
      case 'en_progreso':
        return 'En Progreso';
      case 'completada':
        return 'Completada';
      case 'entregada':
        return 'Entregada';
      case 'revisada':
      case 'aprobada':
        return 'Revisada';
      case 'pausada':
        return 'Pausada';
      case 'rechazada':
        return 'Rechazada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return 'Pausada';
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-lg overflow-hidden">
      {/* Header con color según estado */}
      <div className={`${getHeaderColor()} text-white px-3 py-2`}>
        <div className="flex items-center gap-2">
          <div className="text-lg">🎯</div>
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                type="text"
                defaultValue={misionData.title}
                onBlur={(e) => handleTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTitleChange(e.currentTarget.value);
                  }
                  if (e.key === 'Escape') {
                    setIsEditingTitle(false);
                  }
                }}
                className="w-full font-bold text-white bg-transparent border-b border-white/50 focus:outline-none text-sm placeholder-white/70"
                autoFocus
                data-todo-interactive
              />
            ) : (
              <h3
                className="font-bold text-white truncate text-sm"
              >
                {misionData.title}
              </h3>
            )}
          </div>
          <div className="bg-white/20 text-white rounded-full px-2 py-0.5 text-xs font-semibold">
            {misionData.hours}h
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 flex flex-col p-3 overflow-hidden">

        {/* Descripción editable */}
        <div className="mb-2">
          {isEditingDescription ? (
            <textarea
              defaultValue={misionData.description}
              onBlur={(e) => handleDescriptionChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsEditingDescription(false);
                }
              }}
              className="w-full text-xs text-gray-600 bg-transparent border border-green-400 rounded px-2 py-1 focus:outline-none resize-none"
              rows={2}
              autoFocus
              data-todo-interactive
            />
          ) : (
            <p
              className="text-xs text-gray-600 cursor-pointer hover:text-green-600 line-clamp-2"
              onClick={() => setIsEditingDescription(true)}
              data-todo-interactive
            >
              {misionData.description || 'Click pra agregar descripción...'}
            </p>
          )}
        </div>

        {/* Usuario asignado y estado */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
            {misionData.usuario_asignado_nombre ? (
              <div
                className="flex items-center gap-2 bg-gray-100 rounded px-2 py-1 cursor-pointer hover:bg-gray-200"
                onClick={() => setShowUsuarioSelector(!showUsuarioSelector)}
                data-todo-interactive
              >
                {misionData.usuario_asignado_avatar ? (
                  <img
                    src={misionData.usuario_asignado_avatar}
                    alt={misionData.usuario_asignado_nombre}
                    className="w-5 h-5 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className="w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center text-white text-xs"
                  style={{ display: misionData.usuario_asignado_avatar ? 'none' : 'flex' }}
                >
                  {misionData.usuario_asignado_nombre.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-gray-700 truncate">
                  {misionData.usuario_asignado_nombre}
                </span>
              </div>
            ) : (
              <button
                onClick={() => setShowUsuarioSelector(!showUsuarioSelector)}
                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700"
                data-todo-interactive
              >
                <User size={14} />
                <span>Asignar usuario</span>
              </button>
            )}

            {/* Selector de usuarios */}
            {showUsuarioSelector && (
              <div className="absolute z-10 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto" data-todo-interactive>
                {usuarios.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-500">No hay usuarios disponibles</div>
                ) : (
                  usuarios.map((usuario) => (
                    <div
                      key={usuario.id}
                      onClick={() => handleAsignarUsuario(usuario)}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {usuario.profile.avatar ? (
                        <>
                          <img
                            src={usuario.profile.avatar}
                            alt={`${usuario.profile.nombre} ${usuario.profile.apellido}`}
                            className="w-6 h-6 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div
                            className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-white text-xs"
                            style={{ display: 'none' }}
                          >
                            {usuario.profile.nombre.charAt(0).toUpperCase()}
                          </div>
                        </>
                      ) : (
                        <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-white text-xs">
                          {usuario.profile.nombre.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs text-gray-700">
                        {usuario.profile.nombre} {usuario.profile.apellido}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Botón de captura - Solo visible si la misión está corriendo y no entregada */}
          {misionData.estado !== 'entregada' && misionData.isRunning && (misionData.misionActivaId || (misionData.id_mision && currentUserId)) && (
            <button
              onClick={handleRequestCapture}
              className={`${misionData.misionActivaId
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-gray-400 hover:bg-gray-500'
                } text-white rounded-full p-2 transition-all relative`}
              data-todo-interactive
              title={
                misionData.misionActivaId
                  ? "Solicitar captura de pantalla"
                  : "Asignar usuario para habilitar capturas"
              }
            >
              <Camera size={14} />
            </button>
          )}
        </div>

        {/* Imagen de captura simple */}
        {lastCaptureUrl && (
          <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
            <img
              src={lastCaptureUrl}
              alt="Última captura"
              className="w-full h-auto object-contain"
              style={{ maxHeight: '200px' }}
            />
            <div className="px-2 py-1 bg-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-600">📸 Última captura</span>
              <button
                onClick={handleVerTodasCapturas}
                className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                data-todo-interactive
                title="Ver todas las capturas"
              >
                <Images size={12} />
                Ver todas
              </button>
            </div>
          </div>
        )}

        {/* Badge de estado */}
        <div className="mb-3">
          <span className={`${getEstadoColor()} rounded px-2 py-1 text-xs font-medium`}>
            {getEstadoText()}
          </span>
        </div>

        {/* Sección de subtareas - oculta cuando está entregada */}
        <div className={`flex-1 overflow-hidden flex flex-col ${misionData.estado === 'entregada' ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <div
              className="flex items-center gap-1 flex-1 cursor-pointer"
              onClick={() => setShowSubtareas(!showSubtareas)}
              data-todo-interactive
            >
              <h4 className="text-xs font-semibold text-gray-700">Tareas</h4>
              {showSubtareas ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            {/* Botón para mostrar/crear card TODO */}
            {misionData.card_todos && misionData.card_todos.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShowTodoCard();
                }}
                className="text-green-500 hover:text-green-700 transition-colors"
                data-todo-interactive
                title="Mostrar card de tareas"
              >
                <ExternalLink size={14} />
              </button>
            )}
          </div>

          {showSubtareas && (
            <>
              <div className="flex-1 overflow-y-auto mb-2 space-y-1">
                {loadingCardTodos ? (
                  <div className="text-xs text-gray-400 italic">Cargando tareas...</div>
                ) : subtareas && subtareas.length > 0 ? (
                  subtareas.map((subtarea) => (
                    <div
                      key={subtarea.id}
                      className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1 group"
                    >
                      <input
                        type="checkbox"
                        checked={subtarea.completed}
                        onChange={() => handleToggleSubtarea(subtarea.id)}
                        className="w-3 h-3 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        data-todo-interactive
                      />
                      <span
                        className={`text-xs flex-1 ${subtarea.completed ? 'line-through text-gray-400' : 'text-gray-700'
                          }`}
                      >
                        {subtarea.text}
                      </span>
                      <button
                        onClick={() => handleDeleteSubtarea(subtarea.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                        data-todo-interactive
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-400 italic">No hay tareas</div>
                )}
              </div>

              {/* Input para agregar tarea */}
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newSubtareaText}
                  onChange={(e) => setNewSubtareaText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSubtarea();
                    }
                  }}
                  placeholder="Nueva tarea..."
                  className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
                  data-todo-interactive
                  disabled={!misionData.id_pizarra || !misionData.id_mision}
                />
                <button
                  onClick={handleAddSubtarea}
                  className="bg-green-500 hover:bg-green-600 text-white rounded p-1 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  data-todo-interactive
                  disabled={!misionData.id_pizarra || !misionData.id_mision}
                  title={!misionData.id_pizarra || !misionData.id_mision ? 'Se necesita una pizarra y misión activa' : 'Agregar tarea'}
                >
                  <Plus size={14} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Sección de entregas */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          {misionData.estado === 'entregada' ? (
            <>
              <button
                onClick={() => setShowEntregas(!showEntregas)}
                className="w-full flex items-center justify-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded px-3 py-2 text-xs font-semibold transition-colors"
                data-todo-interactive
              >
                <ExternalLink size={13} />
                Ver entrega
                {showEntregas ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {showEntregas && (
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                  {misionData.entregas && misionData.entregas.length > 0 ? (
                    misionData.entregas.map((entrega) => (
                      <div key={entrega.id} className="bg-gray-50 rounded px-2 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700">
                            {entrega.usuario_nombre}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(entrega.fecha).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{entrega.descripcion}</p>
                        {entrega.imagenes.length > 0 && (
                          <div className="mt-1 flex gap-1">
                            {entrega.imagenes.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt="Entrega"
                                className="w-10 h-10 object-cover rounded"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-400 italic">No hay entregas</div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowEntregas(!showEntregas)}
                data-todo-interactive
              >
                <h4 className="text-xs font-semibold text-gray-700">
                  Entregas ({misionData.entregas?.length || 0})
                </h4>
                {showEntregas ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
              {showEntregas && (
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                  {misionData.entregas && misionData.entregas.length > 0 ? (
                    misionData.entregas.map((entrega) => (
                      <div key={entrega.id} className="bg-gray-50 rounded px-2 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700">
                            {entrega.usuario_nombre}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(entrega.fecha).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{entrega.descripcion}</p>
                        {entrega.imagenes.length > 0 && (
                          <div className="mt-1 flex gap-1">
                            {entrega.imagenes.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt="Entrega"
                                className="w-10 h-10 object-cover rounded"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-400 italic">No hay entregas</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
