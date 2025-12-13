import React, { useState, useEffect, useRef } from 'react';
import { Card, SubtareaMision, TodoItem, MisionData } from '../../types';
import { User, Plus, X, ChevronDown, ChevronUp, Camera, ExternalLink, Images } from 'lucide-react';
import { useMisionActiva } from '@/hooks/useMisionActiva';
import { useMisiones } from '@/hooks/useMisiones';
import { useCardTodos } from '@/hooks/useCardTodos';
import { misionActivaRepository } from '@/infrastructure/datasource/SupabaseMisionActivaRepository';
import { supabase } from '@/infrastructure/services/SupabaseClient';

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
  // Estado simple para capturas (nuevo sistema)
  const [lastCaptureUrl, setLastCaptureUrl] = useState<string | null>(null);

  const {
    subscribeToMisionActiva,
    subscribeToMisionActivaByReferencia,
    getOrCreateMisionActiva,
    verificarMisionesInactivas,
    updateCaptureNow
  } = useMisionActiva();

  const { updateMision } = useMisiones(null);

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
      alert(`📸 Solicitud enviada a ${misionData.usuario_asignado_nombre}. El usuario recibirá una notificación.`);
    } else {
      console.error('❌ [DEBUG ADMIN] Error al enviar la señal');
      alert('❌ Error al enviar la solicitud de captura');
    }

    console.log('🎯 [DEBUG ADMIN] ========== FIN SOLICITUD CAPTURA ==========');
  };

  // Buscar y actualizar información del usuario asignado al montar el componente
  useEffect(() => {
    // Si ya tiene nombre de usuario, no hacer nada
    if (misionData.usuario_asignado_nombre) {
      return;
    }

    // Si tiene id_usuario_asignado pero no nombre, buscarlo
    if (misionData.id_usuario_asignado && usuarios.length > 0) {
      const usuarioAsignado = usuarios.find(u => u.id === misionData.id_usuario_asignado);

      if (usuarioAsignado) {
        console.log('👤 [MISION ORG] Usuario asignado encontrado:', {
          id: usuarioAsignado.id,
          nombre: `${usuarioAsignado.profile.nombre} ${usuarioAsignado.profile.apellido}`,
          avatar: usuarioAsignado.profile.avatar
        });
        updateCard(card.id, {
          misionData: {
            ...misionData,
            usuario_asignado_nombre: `${usuarioAsignado.profile.nombre} ${usuarioAsignado.profile.apellido}`,
            usuario_asignado_avatar: usuarioAsignado.profile.avatar || null
          }
        });
        console.log('✅ [USUARIO ASIGNADO] Card actualizado con información del usuario');
      } else {
        console.warn('⚠️ [MISION ORG] Usuario asignado no encontrado en la lista:', {
          id_buscado: misionData.id_usuario_asignado,
          usuarios_disponibles: usuarios.map(u => ({ id: u.id, nombre: u.profile.nombre }))
        });
      }
    }
  }, [misionData.id_usuario_asignado, misionData.usuario_asignado_nombre, usuarios, card.id, updateCard]);

  // Sincronizar tareas de la BD con subtareas locales
  useEffect(() => {
    if (tareasBD && tareasBD.length > 0 && misionData.card_todos) {
      // Convertir tareas de BD a formato de subtareas
      const subtareasDesdeDB: SubtareaMision[] = tareasBD.map(tarea => ({
        id: tarea.id,
        text: tarea.text,
        completed: tarea.completed
      }));

      // Actualizar solo si son diferentes
      const subtareasActuales = misionData.subtareas || [];
      const sonDiferentes = JSON.stringify(subtareasActuales) !== JSON.stringify(subtareasDesdeDB);

      if (sonDiferentes) {
        console.log('📋 Sincronizando tareas desde BD:', subtareasDesdeDB.length);
        updateCard(card.id, {
          misionData: {
            ...misionData,
            subtareas: subtareasDesdeDB
          }
        });
      }
    }
  }, [tareasBD, misionData.card_todos]);

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
        (payload) => {
          console.log('📡 [MISION ORG] Misión actualizada:', payload);

          const nuevaMision = payload.new as any;

          // Actualizar card_todos si cambió
          if (nuevaMision.card_todos) {
            console.log('🔄 Actualizando card_todos en el card:', nuevaMision.card_todos);
            updateCard(card.id, {
              misionData: {
                ...misionData,
                card_todos: nuevaMision.card_todos
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 [MISION ORG] Desuscribiendo de cambios en misiones');
      supabase.removeChannel(channel);
    };
  }, [card.misionData?.id_mision, card.id]);

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
  const handleTitleChange = (newTitle: string) => {
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
  const handleDescriptionChange = (newDescription: string) => {
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
    // Actualizar en la base de datos
    if (misionData.id_mision) {
      console.log('👤 Asignando usuario a misión en BD:', {
        id_mision: misionData.id_mision,
        tipo_id_mision: typeof misionData.id_mision,
        id_usuario: usuario.id,
        tipo_id_usuario: typeof usuario.id
      });

      const resultado = await updateMision(misionData.id_mision, {
        id_usuario: usuario.id
      });

      if (!resultado) {
        console.error('❌ No se pudo actualizar la misión en la base de datos');
        console.error('⚠️ La misión probablemente no existe o hay un problema de permisos');
        // Continuar con la actualización local de todos modos
      } else {
        console.log('✅ Misión actualizada en BD:', resultado);
      }
    } else {
      console.warn('⚠️ No hay id_mision disponible, solo se actualizará localmente');
    }

    // Actualizar estado local del card
    updateCard(card.id, {
      misionData: {
        ...misionData,
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

  // Agregar subtarea
  const handleAddSubtarea = async () => {
    if (!newSubtareaText.trim()) return;

    // Si hay card_todos, crear en la BD
    if (misionData.card_todos && misionData.card_todos.length > 0) {
      const cardTodoId = misionData.card_todos[0]; // Obtener el primer UUID del array
      const nuevaTarea = await createTodo({
        id_card: cardTodoId,
        todo_id: (tareasBD?.length || 0) + 1,
        text: newSubtareaText.trim(),
        completed: false,
        position: (tareasBD?.length || 0) + 1
      });

      if (nuevaTarea) {
        console.log('✅ Tarea creada en BD:', nuevaTarea);
      }
    } else {
      // Si no hay card_todos, usar el método local
      const nuevaSubtarea: SubtareaMision = {
        id: `subtarea-${Date.now()}`,
        text: newSubtareaText.trim(),
        completed: false
      };

      const subtareasActuales = misionData.subtareas || [];
      updateCard(card.id, {
        misionData: {
          ...misionData,
          subtareas: [...subtareasActuales, nuevaSubtarea]
        }
      });
    }
    setNewSubtareaText('');
  };

  // Toggle subtarea completada
  const handleToggleSubtarea = async (subtareaId: string) => {
    // Si hay card_todos, actualizar en la BD
    if (misionData.card_todos && misionData.card_todos.length > 0) {
      const tareaActual = tareasBD?.find(t => t.id === subtareaId);
      if (tareaActual) {
        await toggleCompleted(subtareaId, !tareaActual.completed);
      }
    } else {
      // Si no hay card_todos, usar el método local
      const subtareasActuales = misionData.subtareas || [];
      const subtareasActualizadas = subtareasActuales.map(st =>
        st.id === subtareaId ? { ...st, completed: !st.completed } : st
      );

      updateCard(card.id, {
        misionData: {
          ...misionData,
          subtareas: subtareasActualizadas
        }
      });
    }
  };

  // Eliminar subtarea
  const handleDeleteSubtarea = async (subtareaId: string) => {
    // Si hay card_todos, eliminar de la BD
    if (misionData.card_todos) {
      await deleteTodoFromBD(subtareaId);
    } else {
      // Si no hay card_todos, usar el método local
      const subtareasActuales = misionData.subtareas || [];
      const subtareasActualizadas = subtareasActuales.filter(st => st.id !== subtareaId);

      updateCard(card.id, {
        misionData: {
          ...misionData,
          subtareas: subtareasActualizadas
        }
      });
    }
  };

  // Colores según estado
  const getEstadoColor = () => {
    switch (misionData.estado) {
      case 'en_progreso':
        return 'bg-blue-500';
      case 'pausada':
        return 'bg-yellow-500';
      case 'entregada':
        return 'bg-green-500';
      case 'aprobada':
        return 'bg-emerald-600';
      case 'rechazada':
        return 'bg-red-500';
      case 'cancelada':
        return 'bg-gray-500';
      default:
        return 'bg-purple-500';
    }
  };

  const getEstadoText = () => {
    switch (misionData.estado) {
      case 'en_progreso':
        return 'En Progreso';
      case 'pausada':
        return 'Pausada';
      case 'entregada':
        return 'Entregada';
      case 'aprobada':
        return 'Aprobada';
      case 'rechazada':
        return 'Rechazada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return 'Pendiente';
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-3 bg-white rounded-lg">
      {/* Header con título editable y estado */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
        <div className="text-2xl">🎯</div>
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
              className="w-full font-bold text-gray-800 bg-transparent border-b border-blue-400 focus:outline-none text-sm"
              autoFocus
              data-todo-interactive
            />
          ) : (
            <h3
              className="font-bold text-gray-800 truncate text-sm cursor-pointer hover:text-blue-600"
              onClick={() => setIsEditingTitle(true)}
              data-todo-interactive
            >
              {misionData.title}
            </h3>
          )}
        </div>
        <div className={`${getEstadoColor()} text-white rounded-full px-2 py-1 text-xs font-semibold`}>
          {misionData.hours}h
        </div>
      </div>

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
            className="w-full text-xs text-gray-600 bg-transparent border border-blue-400 rounded px-2 py-1 focus:outline-none resize-none"
            rows={2}
            autoFocus
            data-todo-interactive
          />
        ) : (
          <p
            className="text-xs text-gray-600 cursor-pointer hover:text-blue-600 line-clamp-2"
            onClick={() => setIsEditingDescription(true)}
            data-todo-interactive
          >
            {misionData.description || 'Click para agregar descripción...'}
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
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
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

        {/* Botón de captura - Solo visible si la misión está corriendo */}
        {misionData.isRunning && (misionData.misionActivaId || (misionData.id_mision && currentUserId)) && (
          <button
            onClick={handleRequestCapture}
            className={`${
              misionData.misionActivaId
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
        <span className={`${getEstadoColor()} text-white rounded px-2 py-1 text-xs font-medium`}>
          {getEstadoText()}
        </span>
      </div>

      {/* Sección de subtareas */}
      <div className="flex-1 overflow-hidden flex flex-col">
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
              className="text-blue-500 hover:text-blue-700 transition-colors"
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
              ) : misionData.subtareas && misionData.subtareas.length > 0 ? (
                misionData.subtareas.map((subtarea) => (
                  <div
                    key={subtarea.id}
                    className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1 group"
                  >
                    <input
                      type="checkbox"
                      checked={subtarea.completed}
                      onChange={() => handleToggleSubtarea(subtarea.id)}
                      className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      data-todo-interactive
                    />
                    <span
                      className={`text-xs flex-1 ${
                        subtarea.completed ? 'line-through text-gray-400' : 'text-gray-700'
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
                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                data-todo-interactive
                disabled={!misionData.id_pizarra || !misionData.id_mision}
              />
              <button
                onClick={handleAddSubtarea}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded p-1 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
      </div>

    </div>
  );
};
