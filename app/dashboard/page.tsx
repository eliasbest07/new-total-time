"use client";

import Pizarra, { PizarraRef } from "@/application/pizarra/pizarra";
import { useRef, useState, useCallback } from "react";
import Ventana from "@/app/demo/components/Ventana";
import AuthWrapper from "@/app/components/AuthWrapper";
import { useAuth } from "@/app/contexts/AuthContext";
import ChatWindow from "@/app/components/ChatWindow";
import InputAreaLight from "@/app/components/mainUI/InputAreaLight";
import ListadoProyectos from "@/app/components/organizacion/ListadoProyectos";
import AccordionAdmin from "@/app/components/organizacion/AccordionAdmin";
import InfoOrganizacion from "@/app/components/organizacion/InfoOrganizacion";
import DashboardUsuario from "@/app/components/DashboardUsuario";
import AgregarRecursoModal from "@/app/components/modals/AgregarRecursoModal";
import VentanaMisionDetalles from "@/app/components/organizacion/VentanaMisionDetalles";
import { Mision } from "@/domain/entities/Mision";
import { useIncomingMessages } from "@/hooks/useIncomingMessages";
import { useMisiones } from "@/hooks/useMisiones";
import { useUsuarioId } from "@/hooks/useUsuarioId";
import { useProyectos } from "@/hooks/useProyectos";
import { useActividades } from "@/hooks/useActividades";
import { useUsuariosOrganizacionContext } from "@/app/contexts/UsuariosOrganizacionContext";
import { useOrganizacion } from "@/hooks/useOrganizacion";
import { useMisionesOrganizacion } from "@/hooks/useMisionesOrganizacion";
import { useActividadesOrganizacion } from "@/hooks/useActividadesOrganizacion";
import { useRecursos } from "@/hooks/useRecursos";
import { usePizarraOrganizacion } from "@/hooks/usePizarraOrganizacion";
import { Target, Building2, X } from "lucide-react";
import Image from "next/image";
import CalendarioSemanalUsuario from "@/app/components/CalendarioSemanalUsuario";
import fotoDePerfil from "../components/image.png";

export default function DashboardPage() {
  const pizarraRef = useRef<PizarraRef>(null);
  const { usuario } = useAuth();

  // 🔹 Si el usuario NO es admin (false o null), mostrar DashboardUsuario
  if (!usuario?.admin) {
    return (
      // <AuthWrapper>
        <DashboardUsuario />
      // </AuthWrapper>
    );
  }

  // 🔹 Si el usuario ES admin, continuar con el dashboard normal
  return <DashboardAdmin />;
}

// Componente separado para el Dashboard de Administrador
function DashboardAdmin() {
  const pizarraRef = useRef<PizarraRef>(null);
  const { usuario } = useAuth();
  const { usuarioId } = useUsuarioId();
  const { createMision, updateMision } = useMisiones(usuarioId);
  const { createProyecto, proyectos } = useProyectos();
  const { usuarios } = useUsuariosOrganizacionContext();
  const { organizacion } = useOrganizacion(usuario?.userAuth || null);

  // Hook para crear actividades
  const { createActividad } = useActividades(usuario?.userAuth || null);

  // Hooks para AccordionAdmin
  const { misiones: misionesOrg, refetch: refetchMisiones } = useMisionesOrganizacion(usuarios);
  const { actividades: actividadesOrg } = useActividadesOrganizacion(usuarios);
  const { recursos } = useRecursos(usuario?.userAuth || null);

  // Hook para pizarra de organización
  const { pizarra: pizarraOrg, loading: loadingPizarraOrg } = usePizarraOrganizacion(organizacion?.id || null);



  const [showChatWindow, setShowChatWindow] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<{
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  } | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string>("");
  const [showMisionesModal, setShowMisionesModal] = useState(false);
  const [showActividadModal, setShowActividadModal] = useState(false);
  const [showInfoOrganizacion, setShowInfoOrganizacion] = useState(false);
  const [showCapturasModal, setShowCapturasModal] = useState(false);
  const [showCalendarioSemanal, setShowCalendarioSemanal] = useState(false);
  const [usuarioSeleccionadoCalendario, setUsuarioSeleccionadoCalendario] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [capturasMisionActiva, setCapturasMisionActiva] = useState<{ id: string; title: string } | null>(null);
  const [capturasHistorial, setCapturasHistorial] = useState<Array<{ id: number; url: string; fecha: string }>>([]);
  const [loadingCapturas, setLoadingCapturas] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);

  // Contexto de conexión TODO ↔ Proyecto para crear misión
  const [connectionContext, setConnectionContext] = useState<{
    proyectoId: number;
    proyectoNombre: string;
    todoCardId: string;
    proyectoCardId: string;
  } | null>(null);

  // Estado del formulario de misión
  const [misionNombre, setMisionNombre] = useState("");
  const [misionDescripcion, setMisionDescripcion] = useState("");
  const [misionFechaInicio, setMisionFechaInicio] = useState(() => {
    // Fecha de hoy en formato YYYY-MM-DD
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [misionFechaFin, setMisionFechaFin] = useState("");
  const [misionHoras, setMisionHoras] = useState("");
  const [misionEstado, setMisionEstado] = useState("pendiente");
  const [tareasTodo, setTareasTodo] = useState<{id: string; texto: string; completada: boolean}[]>([]);
  const [nuevaTareaTexto, setNuevaTareaTexto] = useState("");
  const [creandoMision, setCreandoMision] = useState(false);

  // Estado del formulario de proyecto
  const [showNuevoProyectoModal, setShowNuevoProyectoModal] = useState(false);
  const [proyectoNombre, setProyectoNombre] = useState("");
  const [proyectoDescripcion, setProyectoDescripcion] = useState("");
  const [proyectoIcono, setProyectoIcono] = useState("");
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState<number[]>([]);
  const [creandoProyecto, setCreandoProyecto] = useState(false);

  // Estado del formulario de actividad
  const [actividadDescripcion, setActividadDescripcion] = useState("");
  const [actividadFecha, setActividadFecha] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [actividadHoraInicio, setActividadHoraInicio] = useState("");
  const [actividadCantHoras, setActividadCantHoras] = useState("");
  const [actividadLink, setActividadLink] = useState("");
  const [actividadUsuarioId, setActividadUsuarioId] = useState<string>("");
  const [actividadProyectoId, setActividadProyectoId] = useState<number | null>(null);
  const [creandoActividad, setCreandoActividad] = useState(false);
  const [showAgregarRecursoModal, setShowAgregarRecursoModal] = useState(false);
  const [showMisionDetalles, setShowMisionDetalles] = useState(false);
  const [selectedMisionDetalles, setSelectedMisionDetalles] = useState<Mision | null>(null);

  // Handler para cuando se hace click en un usuario
  const handleUserClick = (userData: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  }, message?: string) => {
    console.log('👤 handleUserClick en dashboard:', userData);
    setSelectedChatUser(userData);
    if (message) {
      setPendingMessage(message);
    }
    setShowChatWindow(true);
  };

  // Handler para abrir modal de capturas
  const handleOpenCapturasModal = async (misionActivaId: string, misionTitle: string) => {
    console.log('📸 [CAPTURAS] Abriendo modal para misión activa UUID:', misionActivaId, 'Título:', misionTitle);
    setCapturasMisionActiva({ id: misionActivaId, title: misionTitle });
    setShowCapturasModal(true);
    setLoadingCapturas(true);

    try {
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');

      // Paso 1: Obtener la misión activa para saber su id_referencia (ID numérico de la misión)
      console.log('🔍 [CAPTURAS] Obteniendo misión activa UUID:', misionActivaId);
      const { data: misionActiva, error: errorMisionActiva } = await supabase
        .from('misiones_activas')
        .select('id_referencia')
        .eq('id', misionActivaId)
        .single();

      if (errorMisionActiva) {
        console.error('❌ [CAPTURAS] Error obteniendo misión activa:', errorMisionActiva);
        setCapturasHistorial([]);
        setLoadingCapturas(false);
        return;
      }

      const idBloque = String(misionActiva.id_referencia);
      console.log('🔍 [CAPTURAS] Buscando capturas con id_bloque:', idBloque);

      // Paso 2: Buscar capturas usando el id_referencia (ID numérico) como id_bloque
      const { data: capturas, error } = await supabase
        .from('capture')
        .select('id, img_url, created_at')
        .eq('id_bloque', idBloque)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [CAPTURAS] Error cargando capturas:', error);
        setCapturasHistorial([]);
      } else {
        console.log('✅ [CAPTURAS] Capturas cargadas:', capturas?.length || 0);
        setCapturasHistorial(capturas?.map(c => ({
          id: c.id,
          url: c.img_url,
          fecha: c.created_at
        })) || []);
      }
    } catch (error) {
      console.error('❌ [CAPTURAS] Error en handleOpenCapturasModal:', error);
      setCapturasHistorial([]);
    } finally {
      setLoadingCapturas(false);
    }
  };

  // Handler para mensajes entrantes
  const handleIncomingMessage = useCallback((userData: {
    userId: string;
    userName: string;
    userAvatar: string;
    userColor: string;
    isOnline: boolean;
  }) => {
    console.log('🔔 Mensaje entrante recibido:', userData);

    // Abrir la ventana del chat con el emisor
    setSelectedChatUser({
      userId: userData.userId,
      name: userData.userName,
      avatar: userData.userAvatar,
      color: userData.userColor,
      online: userData.isOnline
    });
    setShowChatWindow(true);
  }, []);

  // Suscribirse a mensajes entrantes
  useIncomingMessages(usuario?.userAuth || null, {
    onNewMessage: handleIncomingMessage
  });

  // Handler para cuando se crea una conexión entre cards
  const handleConnectionCreate = useCallback(async (
    connection: { id: string; from?: string; to: string },
    fromCard: { id: string; type: string; misionData?: { id_mision?: number }; proyectoData?: { id?: number; nombre?: string }; todos?: {id: number; text: string; completed: boolean}[] },
    toCard: { id: string; type: string; misionData?: { id_mision?: number }; proyectoData?: { id?: number; nombre?: string }; todos?: {id: number; text: string; completed: boolean}[] }
  ) => {
    console.log('🔗 Conexión creada:', { connection, fromCard, toCard });

    // 1. Detectar si es una conexión TODO ↔ proyecto-organizacion
    const isTodoToProyecto =
      (fromCard.type === 'todo' && toCard.type === 'proyecto-organizacion') ||
      (fromCard.type === 'proyecto-organizacion' && toCard.type === 'todo');

    if (isTodoToProyecto) {
      // Determinar qué card es el TODO y cuál el proyecto
      const todoCard = fromCard.type === 'todo' ? fromCard : toCard;
      const proyectoCard = fromCard.type === 'proyecto-organizacion' ? fromCard : toCard;

      console.log('✅ Conexión TODO ↔ Proyecto detectada:', { todoCard, proyectoCard });

      // Extraer datos del proyecto
      const proyectoData = proyectoCard.proyectoData;
      if (proyectoData && proyectoData.id) {
        console.log('📦 Datos del proyecto:', proyectoData);

        // Extraer tareas del TODO card
        const tareasDelTodo = todoCard.todos || [];
        console.log('📋 Tareas del TODO card:', tareasDelTodo);

        // Convertir las tareas del formato del TODO card al formato del modal
        const tareasConvertidas = tareasDelTodo.map(todo => ({
          id: `tarea-${Date.now()}-${todo.id}`,
          texto: todo.text,
          completada: todo.completed
        }));

        // Prellenar las tareas en el estado
        setTareasTodo(tareasConvertidas);

        // Guardar contexto de la conexión
        setConnectionContext({
          proyectoId: proyectoData.id,
          proyectoNombre: proyectoData.nombre || 'Proyecto',
          todoCardId: todoCard.id,
          proyectoCardId: proyectoCard.id
        });

        // Abrir modal de creación de misión
        setShowMisionesModal(true);
      } else {
        console.warn('⚠️ Card de proyecto sin ID, no se puede crear misión');
      }
      return;
    }

    // 2. Detectar si es una conexión TODO ↔ mision-organizacion
    const isTodoToMision =
      (fromCard.type === 'todo' && toCard.type === 'mision-organizacion') ||
      (fromCard.type === 'mision-organizacion' && toCard.type === 'todo');

    if (isTodoToMision) {
      const todoCard = fromCard.type === 'todo' ? fromCard : toCard;
      const misionCard = fromCard.type === 'mision-organizacion' ? fromCard : toCard;

      console.log('✅ Conexión TODO ↔ Misión detectada:', { todoCard, misionCard });

      const misionData = misionCard.misionData;
      if (!misionData?.id_mision) {
        console.warn('⚠️ Card de misión sin id_mision, no se puede vincular');
        return;
      }

      try {
        // Importar dependencias
        const { SupabaseCardRepository } = await import('@/infrastructure/datasource/SupabaseCardRepository');
        const { SupabaseCardTodoRepository } = await import('@/infrastructure/datasource/SupabaseCardTodoRepository');
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');

        const cardRepo = new SupabaseCardRepository();
        const cardTodoRepo = new SupabaseCardTodoRepository();

        // Verificar si el TODO card ya tiene un UUID (ya está guardado)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(todoCard.id);

        let cardTodoUUID: string;

        if (isUUID) {
          // El card TODO ya está guardado en BD
          console.log('✅ Card TODO ya tiene UUID:', todoCard.id);
          cardTodoUUID = todoCard.id;
        } else {
          // El card TODO tiene ID temporal, necesitamos guardarlo en BD
          console.log('📝 Guardando card TODO en BD...');

          // Obtener el ID de la pizarra desde el card de misión
          let pizarraId = (misionData as any)?.id_pizarra;

          // Si el card de misión no tiene id_pizarra, buscar o crear la pizarra del día
          if (!pizarraId && usuario?.userAuth) {
            console.log('🔍 Buscando o creando pizarra del usuario...');

            // Importar el repositorio de pizarras
            const { SupabasePizarraRepository } = await import('@/infrastructure/datasource/SupabasePizarraRepository');
            const pizarraRepo = new SupabasePizarraRepository();

            try {
              // Intentar obtener la pizarra del día actual
              const pizarraDelDia = await pizarraRepo.getPizarraDelDia(usuario.userAuth, new Date());
              if (pizarraDelDia) {
                pizarraId = pizarraDelDia.id;
                console.log('✅ Pizarra del día encontrada:', pizarraId);
              }
            } catch (error) {
              console.error('❌ Error al obtener/crear pizarra:', error);
              alert('Error: No se pudo obtener la pizarra. Por favor, guarda la pizarra primero (Ctrl+S).');
              return;
            }
          }

          if (!pizarraId) {
            console.error('❌ No se pudo determinar el ID de la pizarra');
            alert('Error: No se encontró la pizarra. Por favor, guarda la pizarra primero (Ctrl+S).');
            return;
          }

          // Crear el card en la tabla cards
          const nuevoCard = await cardRepo.createCard({
            id_pizarra: pizarraId,
            card_id: todoCard.id, // Mantener el ID temporal como card_id
            type: 'todo',
            title: 'Lista de tareas',
            content: null,
            x: 0, // Las coordenadas las actualizará cuando se guarde la pizarra completa
            y: 0,
            width: 300,
            height: 400,
            font_size: 14,
            z_index: 1
          });

          if (!nuevoCard) {
            console.error('❌ No se pudo guardar el card TODO');
            alert('Error al guardar el card TODO en la base de datos');
            return;
          }

          cardTodoUUID = nuevoCard.id;
          console.log('✅ Card TODO guardado con UUID:', cardTodoUUID);

          // Guardar las tareas del TODO en la tabla card_todos
          const tareasDelTodo = todoCard.todos || [];
          if (tareasDelTodo.length > 0) {
            console.log('📋 Guardando', tareasDelTodo.length, 'tareas en BD...');

            for (let i = 0; i < tareasDelTodo.length; i++) {
              const tarea = tareasDelTodo[i];
              await cardTodoRepo.create({
                id_card: cardTodoUUID,
                todo_id: tarea.id,
                text: tarea.text,
                completed: tarea.completed,
                position: i
              });
            }

            console.log('✅ Tareas guardadas exitosamente');
          }

          // ⭐ IMPORTANTE: Actualizar el card TODO en la pizarra con el UUID real
          if (pizarraRef.current?.updateCardId) {
            console.log('🔄 Actualizando card TODO en la pizarra con UUID:', cardTodoUUID);
            pizarraRef.current.updateCardId(todoCard.id, cardTodoUUID);
            console.log('✅ Card TODO actualizado en la pizarra');
          }
        }

        // Actualizar la misión con el UUID del card TODO
        console.log('🔄 Actualizando misión con card_todos...');
        const { data: misionActual } = await supabase
          .from('misiones')
          .select('card_todos')
          .eq('id', misionData.id_mision)
          .single();

        const cardTodosActuales = misionActual?.card_todos || [];

        // Verificar si el UUID ya está en el array
        if (!cardTodosActuales.includes(cardTodoUUID)) {
          const nuevosCardTodos = [...cardTodosActuales, cardTodoUUID];

          const { error: updateError } = await supabase
            .from('misiones')
            .update({ card_todos: nuevosCardTodos })
            .eq('id', misionData.id_mision);

          if (updateError) {
            console.error('❌ Error actualizando misión:', updateError);
            alert('Error al vincular el TODO con la misión');
            return;
          }

          console.log('✅ Misión actualizada con card_todos:', nuevosCardTodos);

          // Actualizar el card de misión local con el nuevo card_todos
          if (pizarraRef.current) {
            // Buscar el card de misión en la pizarra y actualizarlo
            // Nota: Esto se hace para actualizar la UI inmediatamente sin esperar al realtime
            console.log('🔄 Actualizando card de misión local...');

            // La actualización del card se hará a través del componente MisionCardOrganizacion
            // que usa useMisionCardTodos y se actualizará automáticamente via realtime
          }

          alert('✅ Lista de tareas vinculada exitosamente a la misión');
        } else {
          console.log('ℹ️ El card TODO ya está vinculado a esta misión');
        }

      } catch (error) {
        console.error('❌ Error al vincular TODO con misión:', error);
        alert('Error al vincular el TODO con la misión');
      }

      return;
    }

    // 3. Detectar si es una conexión Misión ↔ proyecto-organizacion
    const isMisionToProyecto =
      (fromCard.type === 'mision-organizacion' && toCard.type === 'proyecto-organizacion') ||
      (fromCard.type === 'proyecto-organizacion' && toCard.type === 'mision-organizacion');

    if (isMisionToProyecto) {
      // Determinar qué card es la misión y cuál el proyecto
      const misionCard = fromCard.type === 'mision-organizacion' ? fromCard : toCard;
      const proyectoCard = fromCard.type === 'proyecto-organizacion' ? fromCard : toCard;

      console.log('✅ Conexión Misión ↔ Proyecto detectada:', { misionCard, proyectoCard });

      const proyectoData = proyectoCard.proyectoData;
      const misionData = misionCard.misionData;

      if (proyectoData?.id && misionData?.id_mision) {
        console.log('📦 Asociando misión al proyecto...');

        try {
          // Importar repositorio de misiones
          const { SupabaseMisionRepository } = await import('@/infrastructure/datasource/SupabaseMisionRepository');
          const misionRepo = new SupabaseMisionRepository();

          // Obtener la misión actual de la BD para verificar si ya tiene proyecto
          const { supabase } = await import('@/infrastructure/services/SupabaseClient');
          const { data: misionActual } = await supabase
            .from('misiones')
            .select('id_proyecto')
            .eq('id', misionData.id_mision)
            .single();

          if (misionActual && !misionActual.id_proyecto) {
            // La misión NO tiene proyecto asignado, actualizar
            console.log('🔄 Actualizando misión con proyecto:', {
              misionId: misionData.id_mision,
              proyectoId: proyectoData.id
            });

            await misionRepo.updateMision(misionData.id_mision, {
              id_proyecto: proyectoData.id
            });

            console.log('✅ Misión actualizada con proyecto exitosamente');
          } else if (misionActual?.id_proyecto) {
            console.log('ℹ️ La misión ya tiene un proyecto asignado:', misionActual.id_proyecto);
          }
        } catch (error) {
          console.error('❌ Error al actualizar misión con proyecto:', error);
        }
      }
    }
  }, []);

  // Funciones para manejar tareas TODO
  const agregarTarea = () => {
    if (nuevaTareaTexto.trim()) {
      setTareasTodo([...tareasTodo, {
        id: `tarea-${Date.now()}`,
        texto: nuevaTareaTexto.trim(),
        completada: false
      }]);
      setNuevaTareaTexto('');
    }
  };

  const eliminarTarea = (tareaId: string) => {
    setTareasTodo(tareasTodo.filter(t => t.id !== tareaId));
  };

  const handleKeyPressTarea = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarTarea();
    }
  };

  // Limpiar formulario de misión
  const limpiarFormularioMision = () => {
    setMisionNombre("");
    setMisionDescripcion("");
    // Restaurar fecha de hoy
    const today = new Date();
    setMisionFechaInicio(today.toISOString().split('T')[0]);
    setMisionFechaFin("");
    setMisionHoras("");
    setMisionEstado("pendiente");
    setTareasTodo([]);
    setNuevaTareaTexto("");
    setConnectionContext(null); // Limpiar contexto de conexión
  };

  // Crear nueva misión
  const handleCrearMision = async () => {
    // Validaciones
    if (!misionNombre.trim()) {
      alert("Por favor ingresa un nombre para la misión");
      return;
    }

    if (!usuarioId) {
      alert("Error: No se pudo identificar el usuario");
      return;
    }

    setCreandoMision(true);

    try {
      const nuevaMision = await createMision({
        nombre: misionNombre.trim(),
        descripcion: misionDescripcion.trim() || null,
        horas: misionHoras ? parseInt(misionHoras) : null,
        fecha_start: misionFechaInicio || null,
        fecha_end: misionFechaFin || null,
        id_usuario: usuarioId,
        id_proyecto: connectionContext?.proyectoId || null, // Usar proyecto del contexto si existe
        id_creador: usuario?.userAuth || null,
        card_todos: [], // Array vacío, se actualizará después si se crea una lista TODO
        estado: misionEstado
      });

      if (nuevaMision) {
        console.log('✅ Misión creada en BD:', nuevaMision);

        // Crear el card en la pizarra automáticamente
        let newMisionCardId: string | void = undefined;
        if (pizarraRef.current?.addMisionCardOrganizacion) {
          newMisionCardId = pizarraRef.current.addMisionCardOrganizacion({
            id_mision: nuevaMision.id,
            title: nuevaMision.nombre || 'Misión',
            description: nuevaMision.descripcion || '',
            hours: nuevaMision.horas || 1,
            id_usuario_asignado: nuevaMision.id_usuario || undefined,
          });
          console.log('📝 Card de misión creado con ID:', newMisionCardId);
        }

        // Si hay contexto de conexión, manejar las conexiones con el TODO existente
        if (connectionContext && newMisionCardId) {
          console.log('🔄 Procesando conexiones...', {
            todoCardId: connectionContext.todoCardId,
            proyectoCardId: connectionContext.proyectoCardId,
            newMisionCardId: newMisionCardId
          });

          // 1. Eliminar la conexión original TODO <-> Proyecto
          if (pizarraRef.current?.removeConnectionBetween) {
            console.log('🗑️ Eliminando conexión TODO <-> Proyecto...');
            pizarraRef.current.removeConnectionBetween(
              connectionContext.todoCardId,
              connectionContext.proyectoCardId
            );
          }

          // 2. Verificar si el TODO card tiene un UUID válido o es un ID temporal
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(connectionContext.todoCardId);

          if (isUUID && nuevaMision?.id) {
            // El TODO ya está guardado en BD, podemos actualizar la misión directamente
            console.log('✅ TODO card ya tiene UUID, actualizando misión...');
            try {
              await updateMision(nuevaMision.id, {
                card_todos: [connectionContext.todoCardId]
              });
              console.log('✅ Misión actualizada con card_todos:', connectionContext.todoCardId);
            } catch (error) {
              console.error('❌ Error actualizando misión con card_todos:', error);
            }
          } else if (!isUUID) {
            // El TODO tiene ID temporal, no podemos guardarlo en card_todos hasta que se guarde la pizarra
            console.log('ℹ️ TODO card tiene ID temporal. La conexión visual se mantendrá, pero el TODO debe guardarse manualmente (Ctrl+S) para persistir en la base de datos.');
          }

          // 3. Crear la nueva conexión TODO -> Misión
          if (pizarraRef.current?.addConnection) {
            console.log('🔗 Creando conexión TODO -> Misión...');
            // Dar un pequeño delay para asegurar que el estado se actualice
            setTimeout(() => {
              if (pizarraRef.current?.addConnection) {
                pizarraRef.current.addConnection(
                  connectionContext.todoCardId,
                  newMisionCardId as string,
                  true // skipValidation = true porque sabemos que acabamos de crear el card
                );
              }
            }, 150);
          }
        }
        // ✅ Crear lista TODO si hay tareas Y NO hay contexto de conexión (es decir, no viene de un TODO existente)
        else if (tareasTodo.length > 0 && newMisionCardId && pizarraRef.current?.addTodoCard) {
          console.log('📋 Creando lista TODO asociada a la misión con', tareasTodo.length, 'tareas...');

          const todoCardId = pizarraRef.current.addTodoCard('Lista de tareas');
          console.log('📝 Card TODO creado con ID:', todoCardId);

          // Actualizar la misión con el ID del card TODO
          if (todoCardId && nuevaMision?.id) {
            await updateMision(nuevaMision.id, {
              card_todos: [todoCardId]
            });
            console.log('✅ Misión actualizada con card_todos:', todoCardId);
          }

          // Crear conexión TODO -> Misión
          if (todoCardId && pizarraRef.current?.addConnection) {
            setTimeout(() => {
              if (pizarraRef.current?.addConnection) {
                pizarraRef.current.addConnection(
                  todoCardId,
                  newMisionCardId as string,
                  true // skipValidation
                );
                console.log('🔗 Conexión TODO -> Misión creada');
              }
            }, 200);
          }

          // TODO: Agregar las tareas al TODO card
          // Esto requeriría una función en la pizarra para agregar tareas a un TODO card específico
          console.log('📝 Tareas a agregar al TODO:', tareasTodo);
        }

        const mensajeExito = tareasTodo.length > 0
          ? `✅ Misión creada exitosamente con ${tareasTodo.length} tarea(s) TODO asociada(s)`
          : "✅ Misión creada exitosamente";
        // alert(mensajeExito);
        limpiarFormularioMision();
        setShowMisionesModal(false);
        setConnectionContext(null); // Limpiar contexto
      } else {
        alert("❌ Error al crear la misión");
      }
    } catch (error) {
      console.error("Error creando misión:", error);
      alert("❌ Error al crear la misión");
    } finally {
      setCreandoMision(false);
    }
  };

  // Limpiar formulario de proyecto
  const limpiarFormularioProyecto = () => {
    setProyectoNombre("");
    setProyectoDescripcion("");
    setProyectoIcono("");
    setUsuariosSeleccionados([]);
  };

  // Crear nuevo proyecto
  const handleCrearProyecto = async () => {
    if (!proyectoNombre.trim()) {
      alert("Por favor ingresa un nombre para el proyecto");
      return;
    }

    if (!organizacion?.id) {
      alert("Error: No se pudo identificar la organización");
      return;
    }

    setCreandoProyecto(true);

    try {
      const nuevoProyecto = await createProyecto({
        nombre: proyectoNombre.trim(),
        descripcion: proyectoDescripcion.trim() || null,
        icono: proyectoIcono.trim() || null,
        id_organizacion: organizacion.id,
        colors: null,
      });

      if (nuevoProyecto) {
        // Asignar usuarios al proyecto si hay usuarios seleccionados
        if (usuariosSeleccionados.length > 0) {
          const { supabase } = await import('@/infrastructure/services/SupabaseClient');

          const usuarioProyectoRelaciones = usuariosSeleccionados.map(usuarioId => ({
            id_proyecto: nuevoProyecto.id,
            id_usuario: usuarioId
          }));

          const { error: relacionError } = await supabase
            .from('usuario_proyecto')
            .insert(usuarioProyectoRelaciones);

          if (relacionError) {
            console.error('Error asignando usuarios al proyecto:', relacionError);
            alert("⚠️ Proyecto creado pero hubo un error asignando usuarios");
          }
        }

        alert("✅ Proyecto creado exitosamente");
        limpiarFormularioProyecto();
        setShowNuevoProyectoModal(false);
      } else {
        alert("❌ Error al crear el proyecto");
      }
    } catch (error) {
      console.error("Error creando proyecto:", error);
      alert("❌ Error al crear el proyecto");
    } finally {
      setCreandoProyecto(false);
    }
  };

  // Toggle selección de usuario
  const toggleUsuarioSeleccionado = (usuarioId: number) => {
    setUsuariosSeleccionados(prev =>
      prev.includes(usuarioId)
        ? prev.filter(id => id !== usuarioId)
        : [...prev, usuarioId]
    );
  };

  // Limpiar formulario de actividad
  const limpiarFormularioActividad = () => {
    setActividadDescripcion("");
    const today = new Date();
    setActividadFecha(today.toISOString().split('T')[0]);
    setActividadHoraInicio("");
    setActividadCantHoras("");
    setActividadLink("");
    setActividadUsuarioId("");
    setActividadProyectoId(null);
  };

  // Crear nueva actividad
  const handleCrearActividad = async () => {
    // Validaciones
    if (!actividadDescripcion.trim()) {
      alert("Por favor ingresa una descripción para la actividad");
      return;
    }

    if (!actividadUsuarioId) {
      alert("Por favor selecciona un usuario para asignar la actividad");
      return;
    }

    setCreandoActividad(true);

    try {
      // Combinar fecha y hora para crear un timestamp válido
      let horaInicioTimestamp: string | null = null;
      if (actividadFecha && actividadHoraInicio) {
        // Crear timestamp en formato ISO: "YYYY-MM-DDTHH:mm:ss"
        horaInicioTimestamp = `${actividadFecha}T${actividadHoraInicio}:00`;
      }

      const nuevaActividad = await createActividad({
        id_usuario: actividadUsuarioId,
        descripcion: actividadDescripcion.trim(),
        fecha: actividadFecha || null,
        hora_inicio: horaInicioTimestamp,
        cant_horas: actividadCantHoras ? parseInt(actividadCantHoras) : null,
        link: actividadLink.trim() || null,
        captures: null,
        tiempo_dedicado: null,
        id_proyecto: actividadProyectoId
      });

      if (nuevaActividad) {
        console.log('✅ Actividad creada exitosamente:', nuevaActividad);
        alert("✅ Actividad creada exitosamente");
        limpiarFormularioActividad();
        setShowActividadModal(false);
      } else {
        alert("❌ Error al crear la actividad");
      }
    } catch (error) {
      console.error("Error creando actividad:", error);
      alert("❌ Error al crear la actividad");
    } finally {
      setCreandoActividad(false);
    }
  };

  return (
    <AuthWrapper>
      <div
        className="relative"
        style={{ height: 'calc(100vh - 4rem)' }}
      >
        {/* Pizarra ocupando todo el espacio */}
        <div className="absolute inset-0 m-1" style={{ zIndex: 10 }}>
          <Pizarra
            ref={pizarraRef}
            onShowScreenshots={() => {}}
            storagePrefix="organizacion"
            lightMode={true}
            fullMode={true}
            isOrganizacionPizarra={true}
            pizarraOrganizacion={pizarraOrg}
            readOnly={false}
            usuarios={usuarios}
            currentUserId={usuario?.userAuth}
            onConnectionCreate={handleConnectionCreate}
            onOpenCapturasModal={handleOpenCapturasModal}
          />
        </div>

        {/* Panel izquierdo flotante - Listado de Proyectos */}
        <div
          className="fixed top-20 left-4 overflow-y-auto overflow-x-hidden bg-transparent pointer-events-auto custom-scrollbar"
          style={{ width: '120px', maxHeight: 'calc(100vh - 10rem)', zIndex: 50 }}
        >
          <div className="mb-3">
            {/* Botón Back - Discreto */}
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg p-2 mb-2 transition-all flex items-center justify-center gap-2"
              title="Volver a la pizarra general"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-xs">
                Volver
              </span>
            </button>

            {/* Botón Organización */}
            <button
              onClick={() => setShowInfoOrganizacion(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg p-3 shadow-lg transition-all hover:scale-105 flex flex-col items-center justify-center gap-2"
              title="Información de la Organización"
            >
              {organizacion?.img_profile ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/20 flex items-center justify-center">
                  <Image
                    src={organizacion.img_profile}
                    alt={organizacion.nombre}
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                  <Image
                    src= {fotoDePerfil} // Replace with the actual path to the pasted image
                    alt="Organization Image"
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                </div>
              )}
              <span className="text-xs font-semibold text-center line-clamp-2 leading-tight">
                {organizacion ? organizacion.nombre : 'Organización'}
              </span>
            </button>
          </div>

          <ListadoProyectos
            onProyectoClick={(proyectoId) => {
              console.log("Proyecto seleccionado:", proyectoId);
              // TODO: Implementar navegación o modal de detalles del proyecto
            }}
            onCrearProyecto={() => setShowNuevoProyectoModal(true)}
          />
        </div>

        {/* AccordionAdmin - Esquina superior derecha */}
        <div className="fixed top-20 right-4 z-50 pointer-events-auto" style={{ width: '350px' }}>
          <AccordionAdmin
            misiones={misionesOrg}
            actividades={actividadesOrg}
            usuarios={usuarios}
            recursos={recursos}
            onAddResource={() => setShowAgregarRecursoModal(true)}
            onUserClick={handleUserClick}
            onMisionClick={(mision) => {
              console.log('Misión seleccionada:', mision);
              setSelectedMisionDetalles(mision);
              setShowMisionDetalles(true);
            }}
            onActividadClick={(actividad) => {
              console.log('Actividad seleccionada:', actividad);
              // TODO: Implementar modal de detalles de actividad si es necesario
            }}
          />
        </div>

        {/* Botones para crear misiones/actividades - Esquina inferior derecha */}
        <div className="fixed bottom-20 right-4 z-50 pointer-events-auto flex flex-col gap-3">
          <button
            onClick={() => setShowMisionesModal(true)}
            className="crear-mision-btn flex items-center gap-2 relative"
            title="Crear Ticket"
          >
            <Target size={20} />
            <span>Nuevo Ticket</span>
          </button>
          <button
            onClick={() => setShowActividadModal(true)}
            className="crear-actividad-btn flex items-center gap-2 relative"
            title="Crear Actividad"
          >
            <span style={{ fontSize: '20px' }}>📅</span>
            <span>Crear Actividad</span>
          </button>
          <style jsx>{`
            .crear-mision-btn {
              background: transparent;
              color: #fff;
              font-size: 17px;
              text-transform: uppercase;
              font-weight: 600;
              border: none;
              padding: 20px 30px;
              cursor: pointer;
              perspective: 30rem;
              border-radius: 10px;
              box-shadow: 0 5px 15px rgba(0, 0, 0, 0.308);
              position: relative;
              overflow: hidden;
              z-index: 2;
            }

            .crear-mision-btn::before {
              content: "";
              display: block;
              position: absolute;
              width: 100%;
              height: 100%;
              top: 0;
              left: 0;
              border-radius: 10px;
              background: linear-gradient(
                320deg,
                rgba(0, 140, 255, 0.678),
                rgba(128, 0, 128, 0.308)
              );
              z-index: -1;
              transition: background 3s;
            }

            .crear-mision-btn:hover::before {
              animation: rotate 1s;
              transition: all 0.5s;
            }

            @keyframes rotate {
              0% {
                transform: rotateY(180deg);
              }

              100% {
                transform: rotateY(360deg);
              }
            }

            .crear-actividad-btn {
              background: transparent;
              color: #fff;
              font-size: 17px;
              text-transform: uppercase;
              font-weight: 600;
              border: none;
              padding: 20px 30px;
              cursor: pointer;
              perspective: 30rem;
              border-radius: 10px;
              box-shadow: 0 5px 15px rgba(0, 0, 0, 0.308);
              position: relative;
              overflow: hidden;
              z-index: 2;
            }

            .crear-actividad-btn::before {
              content: "";
              display: block;
              position: absolute;
              width: 100%;
              height: 100%;
              top: 0;
              left: 0;
              border-radius: 10px;
              background: linear-gradient(
                320deg,
                rgba(255, 140, 0, 0.678),
                rgba(255, 165, 0, 0.308)
              );
              z-index: -1;
              transition: background 3s;
            }

            .crear-actividad-btn:hover::before {
              animation: rotate 1s;
              transition: all 0.5s;
            }

            /* Estilos personalizados para el scrollbar */
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }

            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }

            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #000000;
              border-radius: 10px;
            }

            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #333333;
            }

            /* Para Firefox */
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: #000000 transparent;
            }
          `}</style>
        </div>

        {/* Input Area centrado abajo con lista de usuarios */}
        <InputAreaLight
          onCreateNote={(text) => {
            if (pizarraRef.current) {
              pizarraRef.current.addNoteCard(text);
            }
          }}
          onCreateTodoList={(text) => {
            if (pizarraRef.current) {
              pizarraRef.current.addTodoCard(text);
            }
          }}
          onSendToUser={(text, user) => {
            handleUserClick(user, text);
          }}
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
          placeholder="Escribe para crear notas, tareas o enviar a usuarios..."
        />
      </div>

      {/* Ventana de Chat */}
      {showChatWindow && (
        <Ventana
          isOpen={showChatWindow}
          onClose={() => {
            setShowChatWindow(false);
            setSelectedChatUser(null);
            setPendingMessage("");
          }}
          title={`Chat con ${selectedChatUser?.name || 'Usuario'}`}
          initialWidth={450}
          initialHeight={600}
          defaultMaximized={false}
        >
          {selectedChatUser && usuario && (
            <ChatWindow
              key={`${selectedChatUser.userId}-${pendingMessage}`}
              currentUserId={usuario.userAuth}
              targetUser={selectedChatUser}
              initialMessage={pendingMessage}
            />
          )}
        </Ventana>
      )}

      {/* Modal para crear misiones/actividades */}
      {showMisionesModal && (
        <Ventana
          isOpen={showMisionesModal}
          onClose={() => {
            setShowMisionesModal(false);
            limpiarFormularioMision();
          }}
          title="Crear Nuevo Ticket"
          initialWidth={600}
          initialHeight={500}
          minWidth={500}
          minHeight={400}
          showOverlay={true}
        >
          <div className="p-6 space-y-4" style={{ color: '#000000' }} data-todo-interactive="true">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                Nombre del Ticket <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={misionNombre}
                onChange={(e) => setMisionNombre(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ color: '#000000' }}
                placeholder="Ej: Desarrollar nueva funcionalidad"
                disabled={creandoMision}
                data-todo-interactive="true"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                Descripción
              </label>
              <textarea
                value={misionDescripcion}
                onChange={(e) => setMisionDescripcion(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                style={{ color: '#000000' }}
                rows={4}
                placeholder="Describe la misión o actividad..."
                disabled={creandoMision}
                data-todo-interactive="true"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={misionFechaInicio}
                  onChange={(e) => setMisionFechaInicio(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ color: '#000000', colorScheme: 'light' }}
                  disabled={creandoMision}
                  data-todo-interactive="true"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={misionFechaFin}
                  onChange={(e) => setMisionFechaFin(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ color: '#000000', colorScheme: 'light' }}
                  disabled={creandoMision}
                  data-todo-interactive="true"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                  Horas Estimadas
                </label>
                <input
                  type="number"
                  value={misionHoras}
                  onChange={(e) => setMisionHoras(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ color: '#000000' }}
                  placeholder="Ej: 8"
                  min="0"
                  disabled={creandoMision}
                  data-todo-interactive="true"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                  Estado
                </label>
                <select
                  value={misionEstado}
                  onChange={(e) => setMisionEstado(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ color: '#000000' }}
                  disabled={creandoMision}
                  data-todo-interactive="true"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_progreso">En Progreso</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>

            {/* Sección de Tareas TODO */}
            <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50" data-todo-interactive="true">
              <h4 className="text-sm font-bold mb-3" style={{ color: '#000000' }}>
                📋 Tareas del Ticket
                {connectionContext && tareasTodo.length > 0 && (
                  <span className="text-xs font-normal text-purple-600 ml-2">
                    (importadas de lista TODO)
                  </span>
                )}
              </h4>

              {/* Input para agregar tarea */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={nuevaTareaTexto}
                  onChange={(e) => setNuevaTareaTexto(e.target.value)}
                  onKeyPress={handleKeyPressTarea}
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ color: '#000000' }}
                  placeholder="Escribe una tarea y presiona Enter..."
                  disabled={creandoMision}
                  data-todo-interactive="true"
                />
                <button
                  onClick={agregarTarea}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                  disabled={creandoMision || !nuevaTareaTexto.trim()}
                  data-todo-interactive="true"
                  type="button"
                >
                  +
                </button>
              </div>

              {/* Lista de tareas */}
              {tareasTodo.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {tareasTodo.map((tarea) => (
                    <div
                      key={tarea.id}
                      className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 group"
                    >
                      <span className="flex-1 text-sm" style={{ color: '#000000' }}>{tarea.texto}</span>
                      <button
                        onClick={() => eliminarTarea(tarea.id)}
                        className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        data-todo-interactive="true"
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600 text-center py-2">
                  No hay tareas agregadas. Agrega tareas para crear una lista TODO.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowMisionesModal(false);
                  limpiarFormularioMision();
                }}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-black rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={creandoMision}
                data-todo-interactive="true"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearMision}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={creandoMision}
                data-todo-interactive="true"
              >
                {creandoMision ? "Creando..." : "Crear Ticket"}
              </button>
            </div>
          </div>
        </Ventana>
      )}

      {/* Modal de Información de la Organización */}
      {showInfoOrganizacion && (
        <Ventana
          isOpen={showInfoOrganizacion}
          onClose={() => setShowInfoOrganizacion(false)}
          title="Información de la Organización"
          initialWidth={500}
          initialHeight={600}
          minWidth={400}
          minHeight={500}
          showOverlay={true}
        >
          <InfoOrganizacion
            onUsuarioClick={(userId, userName) => {
              setUsuarioSeleccionadoCalendario({ userId, userName });
              setShowCalendarioSemanal(true);
              setShowInfoOrganizacion(false);
            }}
          />
        </Ventana>
      )}

      {/* Modal para crear nuevo proyecto */}
      {showNuevoProyectoModal && (
        <Ventana
          isOpen={showNuevoProyectoModal}
          onClose={() => {
            setShowNuevoProyectoModal(false);
            limpiarFormularioProyecto();
          }}
          title="Crear Nuevo Proyecto"
          initialWidth={700}
          initialHeight={600}
          minWidth={600}
          minHeight={500}
          showOverlay={true}
        >
          <div className="p-6 space-y-4" style={{ color: '#000000' }}>
            {/* Nombre del proyecto */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                Nombre del Proyecto <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={proyectoNombre}
                onChange={(e) => setProyectoNombre(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ color: '#000000' }}
                placeholder="Ej: Sistema de Gestión"
                disabled={creandoProyecto}
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                Descripción
              </label>
              <textarea
                value={proyectoDescripcion}
                onChange={(e) => setProyectoDescripcion(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                style={{ color: '#000000' }}
                rows={4}
                placeholder="Describe el proyecto..."
                disabled={creandoProyecto}
              />
            </div>

            {/* URL del ícono */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                URL del Ícono (opcional)
              </label>
              <input
                type="text"
                value={proyectoIcono}
                onChange={(e) => setProyectoIcono(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ color: '#000000' }}
                placeholder="https://ejemplo.com/icono.png"
                disabled={creandoProyecto}
              />
              {proyectoIcono && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1">Vista previa:</p>
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-300">
                    <img
                      src={proyectoIcono}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Selección de usuarios */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                Asignar Usuarios (opcional)
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto bg-white">
                {usuarios.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No hay usuarios disponibles</p>
                ) : (
                  <div className="space-y-2">
                    {usuarios.map((usuario) => (
                      <label
                        key={usuario.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={usuariosSeleccionados.includes(parseInt(usuario.id))}
                          onChange={() => toggleUsuarioSeleccionado(parseInt(usuario.id))}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          disabled={creandoProyecto}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          {usuario.profile.avatar ? (
                            <img
                              src={usuario.profile.avatar}
                              alt={usuario.getNombreCompleto()}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                              {usuario.profile.nombre.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {usuario.getNombreCompleto()}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              @{usuario.profile.username}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {usuariosSeleccionados.length > 0 && (
                <p className="text-xs text-gray-600 mt-2">
                  {usuariosSeleccionados.length} usuario(s) seleccionado(s)
                </p>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowNuevoProyectoModal(false);
                  limpiarFormularioProyecto();
                }}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-black rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={creandoProyecto}
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearProyecto}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={creandoProyecto}
              >
                {creandoProyecto ? "Creando..." : "Crear Proyecto"}
              </button>
            </div>
          </div>
        </Ventana>
      )}

      {/* Modal de capturas */}
      {showCapturasModal && capturasMisionActiva && (
        <Ventana
          isOpen={showCapturasModal}
          onClose={() => {
            setShowCapturasModal(false);
            setCapturasMisionActiva(null);
            setCapturasHistorial([]);
          }}
          title={`📸 Capturas - ${capturasMisionActiva.title}`}
          initialWidth={800}
          initialHeight={600}
          minWidth={600}
          minHeight={400}
          showOverlay={true}
        >
          <div className="p-4 h-full overflow-y-auto">
            {loadingCapturas ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Cargando capturas...</p>
              </div>
            ) : capturasHistorial.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <span style={{ fontSize: '64px' }}>📸</span>
                <p className="text-gray-500 text-center">No hay capturas disponibles para esta misión</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                  <p className="text-sm text-blue-900 font-medium">
                    Total de capturas: <span className="font-bold">{capturasHistorial.length}</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {capturasHistorial.map((captura) => (
                    <div
                      key={captura.id}
                      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => setSelectedImageModal(captura.url)}
                      >
                        <img
                          src={captura.url}
                          alt={`Captura ${captura.id}`}
                          className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                        />
                      </div>
                      <div className="p-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">
                            {new Date(captura.fecha).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <a
                            href={captura.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>🔗</span>
                            Abrir
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Ventana>
      )}

      {/* Modal para ver imagen en grande */}
      {selectedImageModal && (
        <div
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
          onClick={() => setSelectedImageModal(null)}
        >
          <div className="relative max-w-7xl max-h-[95vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setSelectedImageModal(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg transition-colors z-10 font-medium"
            >
              ✕ Cerrar
            </button>
            <img
              src={selectedImageModal}
              alt="Captura ampliada"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Modal del Calendario Semanal - Tamaño completo */}
      {showCalendarioSemanal && usuarioSeleccionadoCalendario && (
        <div className="fixed inset-0 z-[9999]">
          <Ventana
            isOpen={showCalendarioSemanal}
            onClose={() => {
              setShowCalendarioSemanal(false);
              setUsuarioSeleccionadoCalendario(null);
            }}
            title={`Calendario Semanal - ${usuarioSeleccionadoCalendario.userName}`}
            initialWidth={1800}
            initialHeight={1000}
            minWidth={900}
            minHeight={600}
            showOverlay={true}
            defaultMaximized={true}
          >
            <CalendarioSemanalUsuario
              userId={usuarioSeleccionadoCalendario.userId}
              userName={usuarioSeleccionadoCalendario.userName}
            />
          </Ventana>
        </div>
      )}

      {/* Modal para crear actividad */}
      {showActividadModal && (
        <Ventana
          isOpen={showActividadModal}
          onClose={() => {
            setShowActividadModal(false);
            limpiarFormularioActividad();
          }}
          title="Crear Nueva Actividad"
          initialWidth={700}
          initialHeight={600}
          minWidth={600}
          minHeight={500}
          showOverlay={true}
        >
          <div className="p-6 space-y-4" style={{ color: '#000000' }} data-todo-interactive="true">
            {/* Descripción de la actividad */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                Descripción de la Actividad <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                value={actividadDescripcion}
                onChange={(e) => setActividadDescripcion(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                style={{ color: '#000000' }}
                rows={4}
                placeholder="Describe la actividad a realizar..."
                disabled={creandoActividad}
                data-todo-interactive="true"
              />
            </div>

            {/* Fecha y Hora de inicio */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                  Fecha
                </label>
                <input
                  type="date"
                  value={actividadFecha}
                  onChange={(e) => setActividadFecha(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  style={{ color: '#000000', colorScheme: 'light' }}
                  disabled={creandoActividad}
                  data-todo-interactive="true"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                  Hora de Inicio
                </label>
                <input
                  type="time"
                  value={actividadHoraInicio}
                  onChange={(e) => setActividadHoraInicio(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  style={{ color: '#000000', colorScheme: 'light' }}
                  disabled={creandoActividad}
                  data-todo-interactive="true"
                />
              </div>
            </div>

            {/* Cantidad de horas y Link */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                  Cantidad de Horas Estimadas
                </label>
                <input
                  type="number"
                  value={actividadCantHoras}
                  onChange={(e) => setActividadCantHoras(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  style={{ color: '#000000' }}
                  placeholder="Ej: 2"
                  min="0"
                  step="0.5"
                  disabled={creandoActividad}
                  data-todo-interactive="true"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                  Link (opcional)
                </label>
                <input
                  type="url"
                  value={actividadLink}
                  onChange={(e) => setActividadLink(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  style={{ color: '#000000' }}
                  placeholder="https://..."
                  disabled={creandoActividad}
                  data-todo-interactive="true"
                />
              </div>
            </div>

            {/* Asignar a Usuario */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                Asignar a Usuario <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto bg-white">
                {usuarios.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No hay usuarios disponibles</p>
                ) : (
                  <div className="space-y-2">
                    {usuarios.map((usuario) => (
                      <label
                        key={usuario.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="radio"
                          name="usuarioActividad"
                          checked={actividadUsuarioId === usuario.userAuth}
                          onChange={() => setActividadUsuarioId(usuario.userAuth)}
                          className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                          disabled={creandoActividad}
                          data-todo-interactive="true"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          {usuario.profile.avatar ? (
                            <img
                              src={usuario.profile.avatar}
                              alt={usuario.getNombreCompleto()}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                              {usuario.profile.nombre.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {usuario.getNombreCompleto()}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              @{usuario.profile.username}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Nota informativa */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs text-orange-800">
                <strong>📌 Nota:</strong> La actividad será asignada al usuario seleccionado y podrá verla en su dashboard personal.
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowActividadModal(false);
                  limpiarFormularioActividad();
                }}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-black rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={creandoActividad}
                data-todo-interactive="true"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearActividad}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={creandoActividad}
                data-todo-interactive="true"
              >
                {creandoActividad ? "Creando..." : "Crear Actividad"}
              </button>
            </div>
          </div>
        </Ventana>
      )}

      {/* Modal para agregar recurso */}
      {showAgregarRecursoModal && (
        <AgregarRecursoModal
          isOpen={showAgregarRecursoModal}
          onClose={() => setShowAgregarRecursoModal(false)}
        />
      )}

      {/* Ventana de detalles de misión */}
      <VentanaMisionDetalles
        isOpen={showMisionDetalles}
        onClose={() => {
          setShowMisionDetalles(false);
          setSelectedMisionDetalles(null);
        }}
        mision={selectedMisionDetalles}
        usuarios={usuarios}
        currentUserId={usuario?.userAuth}
        onOpenChat={handleUserClick}
        onMisionUpdated={() => {
          refetchMisiones();
        }}
      />
    </AuthWrapper>
  );
}
// Fin del componente DashboardAdmin
