import React, { useState, useEffect } from 'react';
import { Card, SubtareaMision } from '../../types';
import { User, Plus, X, ChevronDown, ChevronUp, Camera } from 'lucide-react';
import { useMisionActiva } from '@/hooks/useMisionActiva';
import { useMisiones } from '@/hooks/useMisiones';
import { useCardTodos } from '@/hooks/useCardTodos';
import { misionActivaRepository } from '@/infrastructure/datasource/SupabaseMisionActivaRepository';

interface MisionCardOrganizacionProps {
  card: Card;
  updateCard: (cardId: string, updates: Partial<Card>) => void;
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
}

export const MisionCardOrganizacion: React.FC<MisionCardOrganizacionProps> = ({
  card,
  updateCard,
  usuarios = [],
  currentUserId
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showUsuarioSelector, setShowUsuarioSelector] = useState(false);
  const [showSubtareas, setShowSubtareas] = useState(true);
  const [showEntregas, setShowEntregas] = useState(false);
  const [newSubtareaText, setNewSubtareaText] = useState('');
  const [captureNow, setCaptureNow] = useState<string | null>(null);
  const [showCaptureNotification, setShowCaptureNotification] = useState(false);

  const {
    updateCaptureNow,
    subscribeToMisionActiva,
    subscribeToMisionActivaByReferencia,
    getOrCreateMisionActiva
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
  const { todos: tareasBD, createTodo, toggleCompleted, deleteTodo: deleteTodoFromBD } = useCardTodos(cardTodoId);

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
        text: tarea.texto,
        completed: tarea.completada
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

  // Cargar estado inicial y suscribirse a cambios en tiempo real de misiones_activas
  useEffect(() => {
    if (!card.misionData?.id_mision) {
      console.log('⚠️ No hay id_mision, no se puede suscribir');
      return;
    }

    console.log('🔔 [MISION ORG] Suscribiendo a misiones_activas con filtro:', {
      tipo: 'mision',
      id_referencia: card.misionData.id_mision,
      nombreMision: card.misionData.title
    });

    // Cargar el estado inicial de la misión activa (si existe)
    const cargarEstadoInicial = async () => {
      if (!card.misionData?.id_mision) return;

      const misionActivaInicial = await misionActivaRepository.getByTipoAndReferenciaOnly(
        'mision',
        card.misionData.id_mision
      );

      if (misionActivaInicial) {
        console.log('📡 [MISION ORG] Estado inicial cargado de misiones_activas:', {
          id: misionActivaInicial.id,
          id_referencia: misionActivaInicial.id_referencia,
          estado: misionActivaInicial.estado,
          is_running: misionActivaInicial.is_running,
          id_usuario_asignado: misionActivaInicial.id_usuario_asignado,
          capture_now: misionActivaInicial.capture_now
        });

        updateCard(card.id, {
          misionData: {
            ...misionData,
            misionActivaId: misionActivaInicial.id,
            estado: misionActivaInicial.estado,
            isRunning: misionActivaInicial.is_running || false
          }
        });

        // Cargar capture_now si existe
        if (misionActivaInicial.capture_now !== null) {
          setCaptureNow(misionActivaInicial.capture_now);
        }

        console.log('✅ [ESTADO INICIAL] Card actualizado con estado de misiones_activas');
      } else {
        console.log('ℹ️ [ESTADO INICIAL] No hay misión activa aún para id_referencia:', card.misionData.id_mision);
      }
    };

    cargarEstadoInicial();

    const channel = subscribeToMisionActivaByReferencia(
      'mision',
      card.misionData.id_mision,
      (updatedMision) => {
        if (!updatedMision) {
          return;
        }

        // Actualizar el card con los datos de misiones_activas
        // CardFactory hará merge profundo automáticamente
        updateCard(card.id, {
          misionData: {
            ...misionData,
            misionActivaId: updatedMision.id,
            estado: updatedMision.estado,
            isRunning: updatedMision.is_running || false
          }
        });

        // Actualizar capture_now
        if (updatedMision.capture_now !== null) {
          setCaptureNow(updatedMision.capture_now);
          setShowCaptureNotification(true);
          setTimeout(() => setShowCaptureNotification(false), 3000);
        }
      }
    );

    // Cleanup: desuscribirse al desmontar
    return () => {
      console.log('🔕 [MISION ORG] Desuscribiendo de misiones_activas (id_referencia:', card.misionData?.id_mision, ')');
      channel.unsubscribe();
    };
    // Solo re-suscribirse si cambia el id de la misión o el id del card
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, card.misionData?.id_mision]);

  // Manejar solicitud de captura
  const handleRequestCapture = async () => {
    if (!misionData.misionActivaId) {
      // Intentar crear la misión activa si no existe
      if (misionData.id_mision && misionData.id_usuario_asignado && currentUserId) {
        console.log('📝 Creando misión activa antes de solicitar captura...');
        const nuevaMisionActiva = await getOrCreateMisionActiva({
          tipo: 'mision',
          id_referencia: misionData.id_mision,
          id_usuario_asignado: currentUserId,
          id_creador: misionData.idCreador || currentUserId
        });

        if (nuevaMisionActiva) {
          // Actualizar el card con el misionActivaId
          updateCard(card.id, {
            misionData: {
              ...misionData,
              misionActivaId: nuevaMisionActiva.id
            }
          });

          // Solicitar captura con el nuevo ID
          const result = await updateCaptureNow(nuevaMisionActiva.id, '0');
          if (result) {
            console.log('✅ Solicitud de captura enviada');
          }
        } else {
          console.error('❌ No se pudo crear la misión activa');
        }
      } else {
        console.warn('⚠️ No hay misionActivaId ni datos suficientes para crearlo');
      }
      return;
    }

    console.log('📸 Solicitando captura...');
    const result = await updateCaptureNow(misionData.misionActivaId, '0');

    if (result) {
      console.log('✅ Solicitud de captura enviada');
    } else {
      console.error('❌ Error al solicitar captura');
    }
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

  // Agregar subtarea
  const handleAddSubtarea = async () => {
    if (!newSubtareaText.trim()) return;

    // Si hay card_todos, crear en la BD
    if (misionData.card_todos) {
      const nuevaTarea = await createTodo({
        id_card: misionData.card_todos,
        texto: newSubtareaText.trim(),
        completada: false,
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
    if (misionData.card_todos) {
      const tareaActual = tareasBD?.find(t => t.id === subtareaId);
      if (tareaActual) {
        await toggleCompleted(subtareaId, !tareaActual.completada);
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
                />
              ) : (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                  {misionData.usuario_asignado_nombre.charAt(0).toUpperCase()}
                </div>
              )}
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
                      <img
                        src={usuario.profile.avatar}
                        alt={`${usuario.profile.nombre} ${usuario.profile.apellido}`}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
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

        {/* Botón de captura */}
        {(misionData.misionActivaId || (misionData.id_mision && currentUserId)) && (
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
            {showCaptureNotification && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
            )}
          </button>
        )}
      </div>

      {/* Notificación de captura */}
      {showCaptureNotification && captureNow !== null && (
        <div className="mb-2 bg-blue-100 border border-blue-400 text-blue-700 px-3 py-2 rounded text-xs">
          📸 Captura solicitada: {captureNow === '0' ? 'Procesando...' : 'Captura recibida'}
        </div>
      )}

      {/* Imagen de captura */}
      {captureNow && captureNow !== '0' && captureNow.startsWith('http') && (
        <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
          <img
            src={captureNow}
            alt="Captura de pantalla"
            className="w-full h-auto object-contain"
            style={{ maxHeight: '200px' }}
          />
          <div className="px-2 py-1 bg-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-600">📸 Última captura</span>
            <a
              href={captureNow}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700"
              data-todo-interactive
            >
              Ver completa
            </a>
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
        <div
          className="flex items-center justify-between mb-2 cursor-pointer"
          onClick={() => setShowSubtareas(!showSubtareas)}
          data-todo-interactive
        >
          <h4 className="text-xs font-semibold text-gray-700">Tareas</h4>
          {showSubtareas ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>

        {showSubtareas && (
          <>
            <div className="flex-1 overflow-y-auto mb-2 space-y-1">
              {misionData.subtareas && misionData.subtareas.length > 0 ? (
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

            {/* Input para agregar subtarea */}
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
              />
              <button
                onClick={handleAddSubtarea}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded p-1"
                data-todo-interactive
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
