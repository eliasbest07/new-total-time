import React, { useEffect, useState, useRef } from 'react';
import { Card } from '../../types/index';
import { Actividad } from '@/domain/entities/Actividad';
import { Mision } from '@/domain/entities/Mision';
import { Recurso } from '@/domain/entities/Recurso';
import { Plus, ChevronDown, ChevronUp, X, MoreVertical, Upload, Trash2 } from 'lucide-react';
import { useMisiones } from '@/hooks/useMisiones';
import { useUsuarioId } from '@/hooks/useUsuarioId';
import { useAuth } from '@/app/contexts/AuthContext';
import Ventana from '@/app/demo/components/Ventana';

// Helper para convertir iconos de texto a emojis
const getIconEmoji = (icono: string | null): string => {
  if (!icono) return '📄';

  const iconMap: { [key: string]: string } = {
    'icon_doc': '📄',
    'icon_sheet': '📊',
    'icon_slide': '📽️',
    'icon_pdf': '📕',
    'icon_link': '🔗',
    'icon_folder': '📁',
    'icon_image': '🖼️',
    'icon_video': '🎥',
    'icon_code': '💻',
    'icon_note': '📝'
  };

  // Si el icono ya es un emoji (tiene más de 1 carácter o no está en el mapa), devolverlo tal cual
  if (!icono.startsWith('icon_')) {
    return icono;
  }

  return iconMap[icono] || '📄';
};

interface ProyectoCardOrganizacionProps {
  card: Card;
  editingTitle: string | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
  idPizarra?: string | null;
}

export const ProyectoCardOrganizacion: React.FC<ProyectoCardOrganizacionProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle,
  idPizarra
}) => {
  const { usuario } = useAuth();
  const { usuarioId } = useUsuarioId();
  const { createMision, deleteMision } = useMisiones(usuarioId);

  // Estados principales
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [usuariosAsignados, setUsuariosAsignados] = useState<any[]>([]);
  const [tecnologias, setTecnologias] = useState<string[]>([]);
  const [todosConectadas, setTodosConectadas] = useState<Card[]>([]);
  const [notasConectadas, setNotasConectadas] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [loadingNotas, setLoadingNotas] = useState(false);

  // Estados de expansión
  const [expandedCapturas, setExpandedCapturas] = useState(false);
  const [expandedMisiones, setExpandedMisiones] = useState(false);
  const [expandedRecursos, setExpandedRecursos] = useState(false);
  const [expandedTodos, setExpandedTodos] = useState(false);
  const [expandedNotas, setExpandedNotas] = useState(false);

  // Estados de modales
  const [showNuevaMisionModal, setShowNuevaMisionModal] = useState(false);
  const [recursoModalAbierto, setRecursoModalAbierto] = useState<{
    isOpen: boolean;
    recurso: Recurso | null;
  }>({
    isOpen: false,
    recurso: null
  });

  // Form states para misión
  const [misionNombre, setMisionNombre] = useState('');
  const [misionDescripcion, setMisionDescripcion] = useState('');
  const [misionHoras, setMisionHoras] = useState('');
  const [misionFechaInicio, setMisionFechaInicio] = useState('');
  const [misionFechaFin, setMisionFechaFin] = useState('');
  const [misionEstado, setMisionEstado] = useState('pendiente');
  const [tareasTodo, setTareasTodo] = useState<{id: string; texto: string; completada: boolean}[]>([]);
  const [nuevaTareaTexto, setNuevaTareaTexto] = useState('');
  const [creandoMision, setCreandoMision] = useState(false);

  // Estados para el menú de imagen
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [actualizandoImagen, setActualizandoImagen] = useState(false);
  const eliminandoRecursoRef = useRef(false);
  const imageMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado local para datos del proyecto cargados desde BD
  const [proyectoDataLocal, setProyectoDataLocal] = useState<{
    icono: string | null;
    descripcion: string | null;
    nombre: string | null;
  } | null>(null);

  // Extraer ID del proyecto (puede venir de diferentes campos según la implementación)
  // Fallback: si proyectoData no está disponible, intentar leer del content (donde se guarda como JSON)
  const proyectoId = React.useMemo(() => {
    console.log('🔍 [ProyectoCardOrganizacion] Calculando proyectoId:', {
      cardId: card.id,
      proyectoDataId: card.proyectoData?.id,
      content: card.content?.substring?.(0, 100)
    });

    if (card.proyectoData?.id) {
      console.log('✅ [ProyectoCardOrganizacion] proyectoId desde proyectoData:', card.proyectoData.id);
      return card.proyectoData.id;
    }
    // Fallback: intentar leer del content
    if (card.content) {
      try {
        const contentData = JSON.parse(card.content);
        if (contentData.proyectoId) {
          console.log('✅ [ProyectoCardOrganizacion] proyectoId desde content (fallback):', contentData.proyectoId);
          return contentData.proyectoId;
        }
      } catch {
        // No es JSON válido, ignorar
        console.log('⚠️ [ProyectoCardOrganizacion] Content no es JSON válido');
      }
    }
    console.log('❌ [ProyectoCardOrganizacion] No se encontró proyectoId');
    return null;
  }, [card.proyectoData?.id, card.content]);

  // Cargar datos básicos del proyecto (icono, descripción) si no están en proyectoData
  useEffect(() => {
    const cargarDatosProyecto = async () => {
      // Si ya tenemos los datos del proyecto en props, no necesitamos cargar
      if (card.proyectoData?.icono !== undefined || card.proyectoData?.descripcion !== undefined) {
        console.log('✅ [ProyectoCardOrganizacion] Datos del proyecto ya disponibles en props');
        return;
      }

      // Si no tenemos proyectoId, no podemos cargar
      if (!proyectoId) {
        console.log('⚠️ [ProyectoCardOrganizacion] No hay proyectoId para cargar datos del proyecto');
        return;
      }

      try {
        console.log('🔄 [ProyectoCardOrganizacion] Cargando datos del proyecto desde BD, proyectoId:', proyectoId);
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');

        const { data: proyecto, error } = await supabase
          .from('proyecto')
          .select('nombre, descripcion, icono')
          .eq('id', proyectoId)
          .single();

        if (error) {
          console.error('❌ [ProyectoCardOrganizacion] Error cargando proyecto:', error);
          return;
        }

        if (proyecto) {
          console.log('✅ [ProyectoCardOrganizacion] Datos del proyecto cargados:', proyecto);
          setProyectoDataLocal({
            icono: proyecto.icono,
            descripcion: proyecto.descripcion,
            nombre: proyecto.nombre
          });
        }
      } catch (error) {
        console.error('❌ [ProyectoCardOrganizacion] Error cargando datos del proyecto:', error);
      }
    };

    cargarDatosProyecto();
  }, [proyectoId, card.proyectoData?.icono, card.proyectoData?.descripcion]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (imageMenuRef.current && !imageMenuRef.current.contains(event.target as Node)) {
        setShowImageMenu(false);
      }
    };

    if (showImageMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showImageMenu]);

  useEffect(() => {
    const cargarDatos = async () => {
      console.log('🔄 [ProyectoCardOrganizacion] cargarDatos llamado con proyectoId:', proyectoId, 'cardId:', card.id);

      // Si no hay proyectoId, no hay datos que cargar - terminar loading
      if (!proyectoId) {
        console.log('⚠️ [ProyectoCardOrganizacion] No hay proyectoId, terminando loading');
        setLoading(false);
        return;
      }

      try {
        console.log('✅ [ProyectoCardOrganizacion] Iniciando carga de datos para proyectoId:', proyectoId);
        setLoading(true);
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');

        // Cargar actividades
        const { data: actividadesData } = await supabase
          .from('actividades')
          .select('*')
          .eq('id_proyecto', proyectoId)
          .order('created_at', { ascending: false });

        // Cargar misiones
        const { data: misionesData } = await supabase
          .from('misiones')
          .select('*')
          .eq('id_proyecto', proyectoId)
          .order('created_at', { ascending: false });

        // Cargar recursos
        const { data: recursosData } = await supabase
          .from('recursos')
          .select('*')
          .eq('proyecto_id', proyectoId)
          .order('created_at', { ascending: false });

        // Cargar usuarios asignados
        const { data: usuarioProyectoData } = await supabase
          .from('usuario_proyecto')
          .select('id_usuario')
          .eq('id_proyecto', proyectoId);

        if (usuarioProyectoData && usuarioProyectoData.length > 0) {
          const usuarioIds = usuarioProyectoData.map(up => up.id_usuario);
          const { data: usuariosData } = await supabase
            .from('usuario')
            .select('id, nombre, avatar')
            .in('id', usuarioIds);

          setUsuariosAsignados(usuariosData || []);
        } else {
          setUsuariosAsignados([]);
        }

        setActividades(actividadesData || []);
        setMisiones(misionesData || []);
        setRecursos(recursosData || []);

        // Cargar TODOs conectadas a este proyecto
        console.log('[BUG LINK] Buscando TODOs conectadas para cardId:', card.id, 'idPizarra:', idPizarra);

        if (idPizarra) {
          console.log('[BUG LINK] id_pizarra disponible:', idPizarra);

          // Buscar conexiones donde este proyecto es el destino
          console.log('[BUG LINK] Buscando conexiones con filtros:', {
            id_pizarra: idPizarra,
            to_card_id: card.id
          });

          const { data: conexiones, error: errorConexiones } = await supabase
            .from('card_connections')
            .select('from_card_id')
            .eq('id_pizarra', idPizarra)
            .eq('to_card_id', card.id);

          console.log('[BUG LINK] Conexiones encontradas:', conexiones?.length || 0, 'conexiones:', conexiones, 'error:', errorConexiones);

          if (conexiones && conexiones.length > 0) {
            const todoCardIds = conexiones
              .map(c => c.from_card_id)
              .filter(id => id !== null);

            console.log('[BUG LINK] IDs de TODOs a cargar:', todoCardIds);

            if (todoCardIds.length > 0) {
              // Cargar los datos completos de las cards TODO que coincidan
              const { data: todoCards, error: errorTodos } = await supabase
                .from('cards')
                .select('*')
                .eq('id_pizarra', idPizarra)
                .in('card_id', todoCardIds)
                .eq('type', 'todo');

              console.log('[BUG LINK] TODOs cargadas:', todoCards?.length || 0, 'todoCards:', todoCards, 'error:', errorTodos);
              console.log('[BUG LINK] Buscando card_ids:', todoCardIds);

              if (todoCards && todoCards.length > 0) {
                // BUGFIX (debug recarga): Cargar los todos desde card_todos en lugar de parsear desde cards
                console.log('[BUG LINK] Cargando TODOs con sus items desde card_todos, cards encontradas:', todoCards.length);

                const todosParseadas = await Promise.all(todoCards.map(async (todoCard: any) => {
                  console.log('[BUG LINK] Procesando TODO card:', {
                    card_id: todoCard.card_id,
                    uuid: todoCard.id,
                    title: todoCard.title
                  });

                  // Cargar los items de esta TODO desde card_todos usando el UUID
                  const { data: cardTodos, error: errorCardTodos } = await supabase
                    .from('card_todos')
                    .select('*')
                    .eq('id_card', todoCard.id)
                    .order('position', { ascending: true });

                  console.log('[BUG LINK] Items cargados desde card_todos:', {
                    card_uuid: todoCard.id,
                    items_encontrados: cardTodos?.length || 0,
                    items: cardTodos
                  });

                  let tareasParseadas = [];
                  if (cardTodos && cardTodos.length > 0) {
                    tareasParseadas = cardTodos.map((todo: any) => ({
                      id: todo.todo_id,
                      text: todo.text,
                      completed: todo.completed
                    }));
                  }

                  return {
                    id: todoCard.card_id,
                    type: todoCard.type,
                    title: todoCard.title || 'Lista TODO',
                    content: todoCard.content || '',
                    x: todoCard.x || 0,
                    y: todoCard.y || 0,
                    width: todoCard.width || 250,
                    height: todoCard.height || 300,
                    fontSize: todoCard.font_size || 14,
                    todos: tareasParseadas
                  };
                }));

                console.log('[BUG LINK] TODOs parseadas FINAL con items cargados:', todosParseadas);
                setTodosConectadas(todosParseadas);
              }
            }
          }
        } else {
          console.log('[BUG LINK] No hay idPizarra disponible');
        }

        // Cargar NOTAS conectadas a este proyecto
        console.log('[BUG LINK NOTAS] Buscando NOTAS conectadas para cardId:', card.id, 'idPizarra:', idPizarra);

        if (idPizarra) {
          console.log('[BUG LINK NOTAS] id_pizarra disponible:', idPizarra);

          // Buscar conexiones donde este proyecto es el destino
          console.log('[BUG LINK NOTAS] Buscando conexiones con filtros:', {
            id_pizarra: idPizarra,
            to_card_id: card.id
          });

          const { data: conexionesNotas, error: errorConexionesNotas } = await supabase
            .from('card_connections')
            .select('from_card_id')
            .eq('id_pizarra', idPizarra)
            .eq('to_card_id', card.id);

          console.log('[BUG LINK NOTAS] Conexiones encontradas:', conexionesNotas?.length || 0, 'conexiones:', conexionesNotas, 'error:', errorConexionesNotas);

          if (conexionesNotas && conexionesNotas.length > 0) {
            const noteCardIds = conexionesNotas
              .map(c => c.from_card_id)
              .filter(id => id !== null);

            console.log('[BUG LINK NOTAS] IDs de NOTAS a cargar:', noteCardIds);

            if (noteCardIds.length > 0) {
              // Cargar los datos completos de las cards NOTE que coincidan
              const { data: noteCards, error: errorNotas } = await supabase
                .from('cards')
                .select('*')
                .eq('id_pizarra', idPizarra)
                .in('card_id', noteCardIds)
                .eq('type', 'text');

              console.log('[BUG LINK NOTAS] NOTAS cargadas:', noteCards?.length || 0, 'noteCards:', noteCards, 'error:', errorNotas);
              console.log('[BUG LINK NOTAS] Buscando card_ids:', noteCardIds);

              if (noteCards && noteCards.length > 0) {
                // Parsear los datos de cada NOTA
                console.log('[BUG LINK NOTAS] Parseando NOTAS, datos raw:', noteCards);

                const notasParseadas = noteCards.map((noteCard: any) => {
                  console.log('[BUG LINK NOTAS] Parseando NOTA individual:', {
                    card_id: noteCard.card_id,
                    title: noteCard.title,
                    content: noteCard.content
                  });

                  return {
                    id: noteCard.card_id,
                    type: noteCard.type,
                    title: noteCard.title || 'Nota',
                    content: noteCard.content || '',
                    x: noteCard.x || 0,
                    y: noteCard.y || 0,
                    width: noteCard.width || 250,
                    height: noteCard.height || 300,
                    fontSize: noteCard.font_size || 14
                  };
                });

                console.log('[BUG LINK NOTAS] NOTAS parseadas FINAL:', notasParseadas);
                setNotasConectadas(notasParseadas);
              }
            }
          }
        } else {
          console.log('[BUG LINK NOTAS] No hay idPizarra disponible');
        }

        // Detectar tecnologías
        const techs: string[] = [];
        if (card.proyectoData?.descripcion) {
          const descripcionLower = card.proyectoData.descripcion.toLowerCase();
          if (descripcionLower.includes('flutter')) techs.push('Flutter');
          if (descripcionLower.includes('firebase')) techs.push('Firebase');
          if (descripcionLower.includes('react')) techs.push('React');
          if (descripcionLower.includes('figma')) techs.push('Figma');
          if (descripcionLower.includes('next')) techs.push('Next.js');
          if (descripcionLower.includes('typescript')) techs.push('TypeScript');
        }
        setTecnologias(techs.length > 0 ? techs : ['Flutter', 'Firebase', 'Figma']);

      } catch (error) {
        console.error('Error cargando datos del proyecto:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [proyectoId]);

  // Listener para evento personalizado de conexión creada (ACTUALIZACIÓN INSTANTÁNEA)
  useEffect(() => {
    if (!card.id) return;

    console.log('[BUG LINK] Configurando listener de eventos para card:', card.id);

    const handleConexionCreada = (event: any) => {
      const { to_card_id, from_card_id, fromCard, toCard } = event.detail;

      console.log('[BUG LINK] Evento de conexión recibido:', {
        to_card_id,
        from_card_id,
        myCardId: card.id,
        fromCard,
        toCard
      });

      // Solo actualizar si la conexión es HACIA esta card Y el fromCard es de tipo TODO
      if (to_card_id === card.id && fromCard?.type === 'todo') {
        console.log('[BUG LINK] ✅ Conexión TODO → ESTA card, actualizando INSTANTÁNEAMENTE...');
        setExpandedTodos(true); // Auto-expandir para mostrar feedback inmediato

        // Usar los datos directamente del evento (sin queries a BD)
        const nuevaTodo: Card = {
          id: fromCard.id,
          type: fromCard.type,
          title: fromCard.title || 'Lista TODO',
          content: fromCard.content || '',
          x: fromCard.x || 0,
          y: fromCard.y || 0,
          width: fromCard.width || 250,
          height: fromCard.height || 300,
          fontSize: fromCard.fontSize || 14,
          todos: fromCard.todos || []
        };

        // Agregar la nueva TODO a la lista sin duplicados
        setTodosConectadas(prev => {
          const existe = prev.some(t => t.id === nuevaTodo.id);
          if (existe) {
            console.log('[BUG LINK] TODO ya existe en la lista, actualizándola');
            return prev.map(t => t.id === nuevaTodo.id ? nuevaTodo : t);
          } else {
            console.log('[BUG LINK] ✅ TODO agregada instantáneamente:', nuevaTodo.title);
            return [...prev, nuevaTodo];
          }
        });
      } else if (from_card_id === card.id && toCard?.type === 'todo') {
        // Caso inverso: esta card → TODO
        console.log('[BUG LINK] ✅ Conexión ESTA card → TODO, actualizando INSTANTÁNEAMENTE...');
        setExpandedTodos(true);

        const nuevaTodo: Card = {
          id: toCard.id,
          type: toCard.type,
          title: toCard.title || 'Lista TODO',
          content: toCard.content || '',
          x: toCard.x || 0,
          y: toCard.y || 0,
          width: toCard.width || 250,
          height: toCard.height || 300,
          fontSize: toCard.fontSize || 14,
          todos: toCard.todos || []
        };

        setTodosConectadas(prev => {
          const existe = prev.some(t => t.id === nuevaTodo.id);
          if (existe) {
            return prev.map(t => t.id === nuevaTodo.id ? nuevaTodo : t);
          } else {
            console.log('[BUG LINK] ✅ TODO agregada instantáneamente:', nuevaTodo.title);
            return [...prev, nuevaTodo];
          }
        });
      }

      // NOTAS: Solo actualizar si la conexión es HACIA esta card Y el fromCard es de tipo NOTE
      if (to_card_id === card.id && fromCard?.type === 'text') {
        console.log('[BUG LINK NOTAS] ✅ Conexión NOTA → ESTA card, actualizando INSTANTÁNEAMENTE...');
        setExpandedNotas(true); // Auto-expandir para mostrar feedback inmediato

        // Usar los datos directamente del evento (sin queries a BD)
        const nuevaNota: Card = {
          id: fromCard.id,
          type: fromCard.type,
          title: fromCard.title || 'Nota',
          content: fromCard.content || '',
          x: fromCard.x || 0,
          y: fromCard.y || 0,
          width: fromCard.width || 250,
          height: fromCard.height || 300,
          fontSize: fromCard.fontSize || 14
        };

        // Agregar la nueva NOTA a la lista sin duplicados
        setNotasConectadas(prev => {
          const existe = prev.some(n => n.id === nuevaNota.id);
          if (existe) {
            console.log('[BUG LINK NOTAS] NOTA ya existe en la lista, actualizándola');
            return prev.map(n => n.id === nuevaNota.id ? nuevaNota : n);
          } else {
            console.log('[BUG LINK NOTAS] ✅ NOTA agregada instantáneamente:', nuevaNota.title);
            return [...prev, nuevaNota];
          }
        });
      } else if (from_card_id === card.id && toCard?.type === 'text') {
        // Caso inverso: esta card → NOTA
        console.log('[BUG LINK NOTAS] ✅ Conexión ESTA card → NOTA, actualizando INSTANTÁNEAMENTE...');
        setExpandedNotas(true);

        const nuevaNota: Card = {
          id: toCard.id,
          type: toCard.type,
          title: toCard.title || 'Nota',
          content: toCard.content || '',
          x: toCard.x || 0,
          y: toCard.y || 0,
          width: toCard.width || 250,
          height: toCard.height || 300,
          fontSize: toCard.fontSize || 14
        };

        setNotasConectadas(prev => {
          const existe = prev.some(n => n.id === nuevaNota.id);
          if (existe) {
            return prev.map(n => n.id === nuevaNota.id ? nuevaNota : n);
          } else {
            console.log('[BUG LINK NOTAS] ✅ NOTA agregada instantáneamente:', nuevaNota.title);
            return [...prev, nuevaNota];
          }
        });
      }
    };

    // Listener para actualizaciones de TODOs (cuando se edita el contenido)
    const handleTodoActualizado = (event: any) => {
      const { cardId, card: updatedCard } = event.detail;

      console.log('[BUG LINK] Evento todo-actualizado recibido:', {
        cardId,
        updatedCard,
        todosConectadasActuales: todosConectadas.map(t => t.id)
      });

      // Verificar si esta TODO está en nuestra lista
      setTodosConectadas(prev => {
        const existe = prev.some(t => t.id === cardId);
        if (existe) {
          console.log('[BUG LINK] ✅ TODO actualizada instantáneamente:', updatedCard.title);
          return prev.map(t => t.id === cardId ? updatedCard : t);
        }
        return prev;
      });
    };

    // Listener para actualizaciones de NOTAS (cuando se edita el contenido)
    const handleNotaActualizado = (event: any) => {
      const { cardId, card: updatedCard } = event.detail;

      console.log('[BUG LINK NOTAS] Evento nota-actualizado recibido:', {
        cardId,
        updatedCard,
        notasConectadasActuales: notasConectadas.map(n => n.id)
      });

      // Verificar si esta NOTA está en nuestra lista
      setNotasConectadas(prev => {
        const existe = prev.some(n => n.id === cardId);
        if (existe) {
          console.log('[BUG LINK NOTAS] ✅ NOTA actualizada instantáneamente:', updatedCard.title);
          return prev.map(n => n.id === cardId ? updatedCard : n);
        }
        return prev;
      });
    };

    // Listener para cuando se elimina un card TODO o NOTA
    const handleCardEliminada = (event: any) => {
      const { cardId, cardType } = event.detail;

      console.log('[BUG LINK] Evento card-eliminada recibido:', {
        cardId,
        cardType,
        todosConectadasActuales: todosConectadas.map(t => t.id),
        notasConectadasActuales: notasConectadas.map(n => n.id)
      });

      // Si es un TODO, eliminarlo de nuestra lista
      if (cardType === 'todo') {
        setTodosConectadas(prev => {
          const existe = prev.some(t => t.id === cardId);
          if (existe) {
            console.log('[BUG LINK] ✅ TODO eliminada instantáneamente de la lista:', cardId);
            return prev.filter(t => t.id !== cardId);
          }
          return prev;
        });
      }

      // Si es una NOTA, eliminarla de nuestra lista
      if (cardType === 'text') {
        setNotasConectadas(prev => {
          const existe = prev.some(n => n.id === cardId);
          if (existe) {
            console.log('[BUG LINK NOTAS] ✅ NOTA eliminada instantáneamente de la lista:', cardId);
            return prev.filter(n => n.id !== cardId);
          }
          return prev;
        });
      }
    };

    window.addEventListener('conexion-creada', handleConexionCreada);
    window.addEventListener('todo-actualizado', handleTodoActualizado);
    window.addEventListener('nota-actualizado', handleNotaActualizado);
    window.addEventListener('card-eliminada', handleCardEliminada);

    return () => {
      console.log('[BUG LINK] Removiendo listener de eventos');
      window.removeEventListener('conexion-creada', handleConexionCreada);
      window.removeEventListener('todo-actualizado', handleTodoActualizado);
      window.removeEventListener('nota-actualizado', handleNotaActualizado);
      window.removeEventListener('card-eliminada', handleCardEliminada);
    };
  }, [card.id]);

  // Suscripción en tiempo real para recargar TODOs cuando se crean/eliminan conexiones
  useEffect(() => {
    if (!card.id || !idPizarra) {
      console.log('[BUG LINK] No se puede configurar suscripción. cardId:', card.id, 'idPizarra:', idPizarra);
      return;
    }

    console.log('[BUG LINK] Configurando suscripción realtime para conexiones del card:', card.id, 'pizarra:', idPizarra);

    let subscription: any = null;
    let debugChannel: any = null;

    const setupRealtimeSubscription = async () => {
      try {
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');

        console.log('[BUG LINK] Suscribiéndose a conexiones de pizarra:', idPizarra);

        // Suscribirse a cambios en card_connections donde esta card es el destino
        const channelName = `proyecto-connections-${card.id}`;
        console.log('[BUG LINK] Creando canal de suscripción:', channelName);
        console.log('[BUG LINK] Filtro de suscripción:', `to_card_id=eq.${card.id}`);

        subscription = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'card_connections',
              filter: `to_card_id=eq.${card.id}`
            },
            async (payload) => {
              console.log('[BUG LINK] *** CAMBIO EN CONEXIONES DETECTADO ***', payload);
              console.log('[BUG LINK] Tipo de evento:', payload.eventType);
              console.log('[BUG LINK] Datos:', payload.new || payload.old);

              setLoadingTodos(true);

              // Recargar las TODOs conectadas
              try {
                const { data: conexiones } = await supabase
                  .from('pizarra_connections')
                  .select('from_card')
                  .eq('id_pizarra', idPizarra)
                  .eq('to_card', card.id);

                console.log('[BUG LINK] Recargando TODOs, conexiones encontradas:', conexiones?.length || 0);

                if (conexiones && conexiones.length > 0) {
                  const todoCardIds = conexiones
                    .map(c => c.from_card)
                    .filter(id => id !== null);

                  console.log('[BUG LINK] IDs de TODOs a recargar:', todoCardIds);

                  if (todoCardIds.length > 0) {
                    const { data: todoCards, error: errorTodos } = await supabase
                      .from('cards')
                      .select('*')
                      .eq('id_pizarra', idPizarra)
                      .in('card_id', todoCardIds)
                      .eq('type', 'todo');

                    console.log('[BUG LINK] TODOs recargadas desde BD:', todoCards, 'error:', errorTodos);
                    console.log('[BUG LINK] Buscando estos IDs:', todoCardIds);

                    if (todoCards && todoCards.length > 0) {
                      console.log('[BUG LINK] Parseando TODOs (realtime), datos raw:', todoCards);

                      const todosParseadas = todoCards.map((todoCard: any) => {
                        let tareasParseadas = [];
                        try {
                          if (typeof todoCard.todos === 'string') {
                            tareasParseadas = JSON.parse(todoCard.todos);
                          } else if (Array.isArray(todoCard.todos)) {
                            tareasParseadas = todoCard.todos;
                          }
                        } catch (error) {
                          console.error('[BUG LINK] Error parseando todos (realtime):', error);
                        }

                        return {
                          id: todoCard.card_id,
                          type: todoCard.type,
                          title: todoCard.title || 'Lista TODO',
                          content: todoCard.content || '',
                          x: todoCard.x || 0,
                          y: todoCard.y || 0,
                          width: todoCard.width || 250,
                          height: todoCard.height || 300,
                          fontSize: todoCard.font_size || 14,
                          todos: tareasParseadas
                        };
                      });

                      console.log('[BUG LINK] TODOs parseadas y actualizando estado:', todosParseadas);
                      setTodosConectadas(todosParseadas);
                    }
                  }
                } else {
                  // No hay conexiones, limpiar TODOs
                  console.log('[BUG LINK] No hay conexiones, limpiando TODOs');
                  setTodosConectadas([]);
                }
              } catch (error) {
                console.error('[BUG LINK] ERROR recargando TODOs:', error);
              } finally {
                setLoadingTodos(false);
              }
            }
          )
          .subscribe((status) => {
            console.log('[BUG LINK] Estado de suscripción:', status);

            if (status === 'SUBSCRIBED') {
              console.log('[BUG LINK] ✅ Suscripción ACTIVA y esperando cambios...');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('[BUG LINK] ❌ Error en el canal de suscripción');
            } else if (status === 'TIMED_OUT') {
              console.error('[BUG LINK] ❌ Timeout en suscripción');
            } else if (status === 'CLOSED') {
              console.log('[BUG LINK] ⚠️ Canal de suscripción cerrado');
            }
          });

        // También suscribirse SIN filtro para debug (ver TODOS los cambios en card_connections)
        debugChannel = supabase
          .channel(`debug-all-connections-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'card_connections'
            },
            (payload) => {
              console.log('[BUG LINK] [DEBUG] Cambio en card_connections (cualquier conexión):', {
                event: payload.eventType,
                to_card_id: (payload.new as any)?.to_card_id || (payload.old as any)?.to_card_id,
                from_card_id: (payload.new as any)?.from_card_id || (payload.old as any)?.from_card_id,
                id_pizarra: (payload.new as any)?.id_pizarra || (payload.old as any)?.id_pizarra
              });
            }
          )
          .subscribe((status) => {
            console.log('[BUG LINK] [DEBUG] Estado suscripción sin filtro:', status);
          });
      } catch (error) {
        console.error('[BUG LINK] ERROR configurando suscripción:', error);
      }
    };

    setupRealtimeSubscription();

    // Cleanup
    return () => {
      if (subscription) {
        console.log('[BUG LINK] Desuscribiéndose de conexiones');
        subscription.unsubscribe();
      }
      if (debugChannel) {
        console.log('[BUG LINK] Desuscribiéndose del canal debug');
        debugChannel.unsubscribe();
      }
    };
  }, [card.id, idPizarra]);

  const eliminarRecursoNota = async (recursoId: number) => {
    console.log('[eliminarRecurso] Iniciando, id:', recursoId);

    eliminandoRecursoRef.current = true;

    // Eliminar del estado local inmediatamente
    setRecursos(prev => prev.filter(r => r.id !== recursoId));

    try {
      const { SupabaseRecursoRepository } = await import('@/infrastructure/datasource/SupabaseRecursoRepository');
      const repo = new SupabaseRecursoRepository();

      const eliminado = await repo.deleteRecurso(recursoId);

      if (!eliminado) {
        console.error('[eliminarRecurso] No se pudo eliminar de BD');
        // Recargar recursos si falló
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');
        const { data } = await supabase
          .from('recursos')
          .select('*')
          .eq('proyecto_id', proyectoId)
          .order('created_at', { ascending: false });
        setRecursos(data || []);
      }
    } catch (error) {
      console.error('[eliminarRecurso] Error:', error);
    } finally {
      setTimeout(() => {
        eliminandoRecursoRef.current = false;
      }, 3000);
    }
  };

  // Recargar recursos periódicamente cuando la sección está expandida
  useEffect(() => {
    if (!expandedRecursos || !proyectoId) return;

    const interval = setInterval(async () => {
      if (eliminandoRecursoRef.current) {
        console.log('[error recurso] INTERVALO: Bloqueado');
        return;
      }

      console.log('[error recurso] INTERVALO: Recargando...');
      try {
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');
        const { data: recursosData } = await supabase
          .from('recursos')
          .select('*')
          .eq('proyecto_id', proyectoId)
          .order('created_at', { ascending: false });

        console.log('[error recurso] INTERVALO: Cargados:', recursosData?.length);
        setRecursos(recursosData || []);
      } catch (error) {
        console.error('[error recurso] INTERVALO: Error:', error);
      }
    }, 2000); // Recargar cada 2 segundos

    return () => clearInterval(interval);
  }, [expandedRecursos, proyectoId]);

  const recargarDatos = async () => {
    if (!proyectoId) return;

    try {
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');

      const { data: actividadesData } = await supabase
        .from('actividades')
        .select('*')
        .eq('id_proyecto', proyectoId)
        .order('created_at', { ascending: false });

      const { data: misionesData } = await supabase
        .from('misiones')
        .select('*')
        .eq('id_proyecto', proyectoId)
        .order('created_at', { ascending: false });

      const { data: recursosData } = await supabase
        .from('recursos')
        .select('*')
        .eq('proyecto_id', proyectoId)
        .order('created_at', { ascending: false });

      setActividades(actividadesData || []);
      setMisiones(misionesData || []);
      setRecursos(recursosData || []);
    } catch (error) {
      console.error('Error recargando datos:', error);
    }
  };

  const handleCrearMision = async () => {
    if (!misionNombre.trim()) {
      alert('Por favor ingresa un nombre para la misión');
      return;
    }

    if (!usuarioId) {
      alert('Error: No se pudo identificar el usuario');
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
        id_proyecto: proyectoId || null,
        id_creador: usuario?.userAuth || null,
        card_todos: [],
        estado: misionEstado
      });

      if (nuevaMision) {
        // Resetear formulario
        setMisionNombre('');
        setMisionDescripcion('');
        setMisionHoras('');
        setMisionFechaInicio('');
        setMisionFechaFin('');
        setMisionEstado('pendiente');
        setTareasTodo([]);
        setNuevaTareaTexto('');
        setShowNuevaMisionModal(false);
        await recargarDatos();

        // TODO: Aquí se debería crear la card TODO con las tareas si hay tareas en tareasTodo
        // Esto requeriría acceso a la pizarra ref o una función callback
        if (tareasTodo.length > 0) {
          console.log('📋 Tareas TODO a crear:', tareasTodo);
          alert(`✅ Misión creada con ${tareasTodo.length} tarea(s) TODO`);
        }
      } else {
        alert('Error al crear la misión');
      }
    } catch (error) {
      console.error('Error creando misión:', error);
      alert('Error al crear la misión');
    } finally {
      setCreandoMision(false);
    }
  };

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

  // ✅ Función para eliminar misión
  const handleDeleteMision = async (misionId: number, misionNombre: string) => {
    const confirmacion = confirm(`¿Estás seguro de que deseas eliminar la misión "${misionNombre}"?`);

    if (!confirmacion) return;

    try {
      const success = await deleteMision(misionId);

      if (success) {
        console.log('✅ Misión eliminada:', misionId);
        // Actualizar la lista de misiones localmente
        setMisiones(prev => prev.filter(m => m.id !== misionId));
        alert('✅ Misión eliminada exitosamente');
      } else {
        alert('❌ Error al eliminar la misión');
      }
    } catch (error) {
      console.error('Error eliminando misión:', error);
      alert('❌ Error al eliminar la misión');
    }
  };

  // Función para subir imagen a Supabase Storage
  const handleCambiarImagen = async () => {
    if (!archivoSeleccionado) {
      alert('Por favor selecciona una imagen');
      return;
    }

    if (!proyectoId) {
      alert('Error: No se pudo identificar el proyecto');
      return;
    }

    // Validar que sea una imagen
    if (!archivoSeleccionado.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    setActualizandoImagen(true);

    try {
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');

      // Generar nombre único para el archivo (igual que en useScreenshots)
      const fileExt = archivoSeleccionado.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const folder = `proyecto-${proyectoId}`;
      const filePath = `${folder}/${fileName}`;

      // Eliminar imagen anterior si existe
      if (cleanIcono && cleanIcono.startsWith('http')) {
        try {
          const oldPath = cleanIcono.split('/').slice(-2).join('/');
          await supabase.storage.from('imagenes').remove([oldPath]);
        } catch (error) {
          console.log('No se pudo eliminar imagen anterior:', error);
        }
      }

      // Subir nueva imagen al bucket (igual que uploadImage en useScreenshots)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('imagenes')
        .upload(filePath, archivoSeleccionado, {
          contentType: archivoSeleccionado.type,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error subiendo imagen:', uploadError);
        alert('Error al subir la imagen: ' + uploadError.message);
        return;
      }

      // Obtener URL pública de la imagen (igual que en useScreenshots)
      const { data: urlData } = supabase.storage
        .from('imagenes')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;

      // Actualizar la tabla proyecto con la nueva URL
      const { data, error } = await supabase
        .from('proyecto')
        .update({ icono: publicUrl })
        .eq('id', proyectoId)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando proyecto:', error);
        alert('Error al actualizar el proyecto');
        return;
      }

      console.log('✅ Imagen actualizada:', data);

      setArchivoSeleccionado(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowImageMenu(false);
      alert('✅ Imagen actualizada exitosamente');

      window.location.reload();
    } catch (error) {
      console.error('Error cambiando imagen:', error);
      alert('Error al cambiar la imagen');
    } finally {
      setActualizandoImagen(false);
    }
  };

  // Función para eliminar imagen del proyecto
  const handleEliminarImagen = async () => {
    if (!proyectoId) {
      alert('Error: No se pudo identificar el proyecto');
      return;
    }

    const confirmacion = confirm('¿Estás seguro de que deseas eliminar la imagen del proyecto?');
    if (!confirmacion) return;

    setActualizandoImagen(true);

    try {
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');

      // Eliminar imagen del bucket si existe
      if (cleanIcono && cleanIcono.startsWith('http')) {
        try {
          const oldPath = cleanIcono.split('/').slice(-2).join('/');
          await supabase.storage.from('imagenes').remove([oldPath]);
          console.log('✅ Imagen eliminada del storage');
        } catch (error) {
          console.log('No se pudo eliminar imagen del storage:', error);
        }
      }

      // Actualizar la tabla proyecto
      const { data, error } = await supabase
        .from('proyecto')
        .update({ icono: null })
        .eq('id', proyectoId)
        .select()
        .single();

      if (error) {
        console.error('Error eliminando imagen:', error);
        alert('Error al eliminar la imagen');
        return;
      }

      console.log('✅ Registro de proyecto actualizado:', data);

      setShowImageMenu(false);
      alert('✅ Imagen eliminada exitosamente');

      window.location.reload();
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      alert('Error al eliminar la imagen');
    } finally {
      setActualizandoImagen(false);
    }
  };

  const sanitizeIconUrl = (url: string | null): string | null => {
    if (!url) return null;
    const httpCount = (url.match(/https?:\/\//g) || []).length;
    if (httpCount > 1) {
      const firstUrl = url.match(/https?:\/\/[^\s]+/)?.[0];
      return firstUrl || null;
    }
    return url;
  };

  // Usar icono de proyectoData o del estado local cargado desde BD
  const iconoSource = card.proyectoData?.icono || proyectoDataLocal?.icono;
  const cleanIcono = iconoSource ? sanitizeIconUrl(iconoSource) : null;

  // Separar recursos en notas y recursos normales
  const recursosNota = recursos.filter(r => r.link?.startsWith('nota://'));
  const recursosNormales = recursos.filter(r => !r.link?.startsWith('nota://'));

  return (
    <div className="flex flex-col h-full w-full bg-gray-200 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-200 relative">
        {/* Icono en esquina superior derecha */}
        <div className="absolute top-4 right-4 flex-shrink-0 group" data-todo-interactive>
          {cleanIcono ? (
            cleanIcono.startsWith('http') ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-700 shadow-md border-2 border-gray-600 relative">
                <img
                  src={cleanIcono}
                  alt={card.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-2xl">📁</div>';
                    }
                  }}
                />
                {/* Botón de opciones */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowImageMenu(!showImageMenu);
                  }}
                  className="absolute top-0 right-0 w-6 h-6 bg-black/70 hover:bg-black/90 text-white rounded-bl-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  data-todo-interactive
                  title="Opciones de imagen"
                >
                  <MoreVertical size={14} />
                </button>
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gray-700 flex items-center justify-center text-2xl shadow-md border-2 border-gray-600 relative">
                {cleanIcono}
                {/* Botón de opciones para emoji */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowImageMenu(!showImageMenu);
                  }}
                  className="absolute top-0 right-0 w-5 h-5 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  data-todo-interactive
                  title="Opciones de icono"
                >
                  <MoreVertical size={12} />
                </button>
              </div>
            )
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gray-700 flex items-center justify-center text-2xl shadow-md border-2 border-gray-600 relative">
              📁
              {/* Botón de opciones para icono por defecto */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowImageMenu(!showImageMenu);
                }}
                className="absolute top-0 right-0 w-5 h-5 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                data-todo-interactive
                title="Opciones de icono"
              >
                <MoreVertical size={12} />
              </button>
            </div>
          )}

          {/* Menú desplegable */}
          {showImageMenu && (
            <div
              ref={imageMenuRef}
              className="absolute top-16 right-0 z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 w-64"
              onClick={(e) => e.stopPropagation()}
              data-todo-interactive
            >
              {/* Opción: Cambiar imagen */}
              <div className="px-3 py-2 border-b border-gray-100">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Seleccionar imagen
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setArchivoSeleccionado(file);
                    }
                  }}
                  className="w-full text-xs file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
                  disabled={actualizandoImagen}
                  data-todo-interactive
                  onClick={(e) => e.stopPropagation()}
                />
                {archivoSeleccionado && (
                  <p className="text-xs text-gray-600 mt-1">
                    Archivo: {archivoSeleccionado.name}
                  </p>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCambiarImagen();
                  }}
                  disabled={actualizandoImagen || !archivoSeleccionado}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-todo-interactive
                >
                  <Upload size={14} />
                  {actualizandoImagen ? 'Subiendo...' : 'Subir imagen'}
                </button>
              </div>

              {/* Opción: Eliminar imagen */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEliminarImagen();
                }}
                disabled={actualizandoImagen}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-todo-interactive
              >
                <Trash2 size={14} />
                Eliminar imagen
              </button>
            </div>
          )}
        </div>

        {/* Título */}
        <div className="flex items-center gap-3 mb-3 pr-20">
          <div className="flex-1 min-w-0">
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
                className="font-bold text-gray-900 bg-transparent border-b-2 border-gray-400 focus:outline-none focus:border-blue-500 w-full text-lg"
                autoFocus
                data-todo-interactive
              />
            ) : (
              <h3 className="font-bold text-gray-900 text-lg leading-tight">
                {card.title}
              </h3>
            )}
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-2 mb-3">
          <button
            className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full text-xs font-semibold transition-all shadow-sm hover:shadow-md"
            data-todo-interactive
            onClick={(e) => e.stopPropagation()}
          >
            Página
          </button>
          <button
            className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full text-xs font-semibold transition-all shadow-sm hover:shadow-md"
            data-todo-interactive
            onClick={(e) => e.stopPropagation()}
          >
            GitHub
          </button>
        </div>

        {/* Tecnologías */}
        {tecnologias.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {tecnologias.map((tech, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-white border-2 border-blue-500 text-blue-700 rounded-full text-xs font-semibold shadow-sm"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        {/* Usuarios Asignados */}
        {usuariosAsignados.length > 0 && (
          <div className="flex items-center gap-2">
            {usuariosAsignados.slice(0, 3).map((usuarioAsignado) => (
              <div
                key={usuarioAsignado.id}
                className="w-10 h-10 rounded-full overflow-hidden bg-white border-2 border-gray-400 shadow-md"
                title={usuarioAsignado.nombre}
              >
                {usuarioAsignado.avatar ? (
                  <img
                    src={usuarioAsignado.avatar}
                    alt={usuarioAsignado.nombre}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.className = "w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-gray-400 shadow-md";
                        parent.textContent = usuarioAsignado.nombre.charAt(0).toUpperCase();
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white text-sm font-bold">
                    {usuarioAsignado.nombre.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {usuariosAsignados.length > 3 && (
              <div className="w-10 h-10 rounded-full bg-gray-300 border-2 border-gray-400 flex items-center justify-center text-xs font-bold text-gray-700 shadow-md">
                +{usuariosAsignados.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contenido Principal */}
      <div
        className="flex-1 overflow-y-auto"
        onWheel={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
              <p className="text-sm">Cargando...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Sección Capturas */}
            <div className="bg-gray-700 text-white border-b border-gray-600">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedCapturas(!expandedCapturas);
                }}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors"
                data-todo-interactive
              >
                <span className="font-semibold text-sm">Capturas</span>
                {expandedCapturas ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {expandedCapturas && (
                <div className="px-4 pb-4">
                  <div className="text-center text-gray-400 text-sm py-8">
                    No hay capturas disponibles
                  </div>
                </div>
              )}
            </div>

            {/* Sección Misiones */}
            <div className="bg-gray-700 text-white border-b border-gray-600">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedMisiones(!expandedMisiones);
                }}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors"
                data-todo-interactive
              >
                <span className="font-semibold text-sm">Tickets ({misiones.length})</span>
                {expandedMisiones ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {expandedMisiones && (
                <div className="px-4 pb-4 space-y-2">
                  {misiones.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-4">
                      No hay misiones disponibles
                    </div>
                  ) : (
                    misiones.map((mision) => (
                      <div
                        key={mision.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', `Misi\u00f3n: ${mision.nombre}`);
                          e.dataTransfer.setData('application/json', JSON.stringify({
                            type: 'mision-organizacion',
                            id_mision: mision.id,
                            title: mision.nombre,
                            description: mision.descripcion,
                            hours: mision.horas,
                            fecha_start: mision.fecha_start,
                            fecha_end: mision.fecha_end,
                            id_usuario: mision.id_usuario,
                            id_creador: mision.id_creador
                          }));
                          e.currentTarget.style.opacity = '0.5';
                        }}
                        onDragEnd={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                        className="bg-gray-600 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-gray-550 transition-colors shadow-sm relative group select-none"
                      >
                        {/* ✅ Botón de eliminar en la esquina superior derecha */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMision(mision.id, mision.nombre || 'Sin nombre');
                          }}
                          className="absolute top-2 right-2 w-5 h-5 bg-red-500/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs z-10"
                          title="Eliminar misión"
                          data-todo-interactive
                        >
                          ×
                        </button>

                        <div className="font-medium text-white truncate mb-1 text-sm pr-6">
                          {mision.nombre || 'Sin nombre'}
                        </div>
                        {mision.descripcion && (
                          <div className="text-xs text-gray-300 line-clamp-2 mb-2">
                            {mision.descripcion}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          {mision.horas && <span>⏱️ {mision.horas}h</span>}
                          {mision.fecha_start && (
                            <span>
                              📅 {new Date(mision.fecha_start).toLocaleDateString('es-ES', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNuevaMisionModal(true);
                    }}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg mt-3"
                    data-todo-interactive
                  >
                    <Plus size={16} />
                    Nuevo Ticket
                  </button>
                </div>
              )}
            </div>

            {/* Sección Recursos */}
            <div className="bg-gray-700 text-white">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedRecursos(!expandedRecursos);
                }}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors"
                data-todo-interactive
              >
                <span className="font-semibold text-sm">Recursos ({recursos.length})</span>
                {expandedRecursos ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {expandedRecursos && (
                <div className="px-4 pb-4 space-y-2">
                  {recursos.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-4">
                      No hay recursos disponibles
                    </div>
                  ) : (
                    recursos.map((recurso) => {
                      // Determinar si es nota o recurso normal
                      const esNota = recurso.link?.startsWith('nota://');

                      return (
                        <div
                          key={recurso.id}
                          className={`w-full bg-gray-600 rounded-lg p-3 transition-all shadow-sm border-2 relative group select-none ${
                            esNota
                              ? 'hover:bg-blue-600 hover:border-blue-400 cursor-pointer hover:scale-[1.02] border-transparent'
                              : 'hover:bg-gray-550 border-transparent cursor-grab active:cursor-grabbing'
                          }`}
                          style={{ cursor: esNota ? 'pointer' : 'grab' }}
                          onClick={(e) => {
                            if (esNota) {
                              e.preventDefault();
                              e.stopPropagation();
                              setRecursoModalAbierto({
                                isOpen: true,
                                recurso
                              });
                            }
                          }}
                          onDragStart={(e) => {
                            if (!esNota) {
                              e.dataTransfer.setData('text/plain', `Recurso: ${recurso.nombre}`);
                              e.dataTransfer.setData('application/json', JSON.stringify({
                                type: 'recurso',
                                id: recurso.id,
                                name: recurso.nombre,
                                url: recurso.link,
                                icon: recurso.icono,
                                color: 'bg-blue-500'
                              }));
                              e.currentTarget.style.opacity = '0.5';
                            } else {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          onDragEnd={(e) => {
                            if (!esNota) {
                              e.currentTarget.style.opacity = '1';
                            }
                          }}
                          draggable={!esNota}
                        >
                          {/* Botón eliminar */}
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const mensaje = esNota ? '¿Eliminar esta nota?' : '¿Eliminar este recurso?';
                              if (confirm(mensaje)) {
                                await eliminarRecursoNota(recurso.id);
                              }
                            }}
                            className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            data-todo-interactive
                            title={esNota ? "Eliminar nota" : "Eliminar recurso"}
                          >
                            <X size={12} />
                          </button>

                          <div className="flex items-start gap-2">
                            <div className="text-xl flex-shrink-0">
                              {getIconEmoji(recurso.icono)}
                            </div>
                            <div className="flex-1 min-w-0 pr-6">
                              <div className="font-medium text-white truncate text-sm">
                                {recurso.nombre || 'Sin nombre'}
                              </div>
                              {recurso.link && !esNota && (
                                <a
                                  href={recurso.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-300 hover:text-blue-200 underline truncate block"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {recurso.link}
                                </a>
                              )}
                              {esNota && (
                                <div className="text-xs text-blue-300 mt-1 font-semibold flex items-center gap-1">
                                  <span>👆</span>
                                  <span>Click para ver contenido completo</span>
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                {new Date(recurso.created_at).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Sección TODOs */}
            <div className="bg-gray-700 text-white border-t border-gray-600">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedTodos(!expandedTodos);
                }}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors"
                data-todo-interactive
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">TODOs ({todosConectadas.length})</span>
                  {loadingTodos && (
                    <svg className="animate-spin h-3 w-3 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                </div>
                {expandedTodos ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {expandedTodos && (
                <div className="px-4 pb-4 space-y-2">
                  {loadingTodos ? (
                    <div className="text-center text-gray-400 text-sm py-4 flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cargando TODOs...
                    </div>
                  ) : todosConectadas.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-4">
                      No hay listas TODO conectadas
                    </div>
                  ) : (
                    todosConectadas.map((todoCard) => {
                      // Calcular progreso
                      const totalTareas = todoCard.todos?.length || 0;
                      const tareasCompletadas = todoCard.todos?.filter(t => t.completed).length || 0;
                      const porcentaje = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;

                      return (
                        <div
                          key={todoCard.id}
                          className="bg-gray-600 rounded-lg p-3 hover:bg-gray-550 transition-colors shadow-sm"
                        >
                          {/* Header de la TODO */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📝</span>
                              <h4 className="font-medium text-white text-sm truncate">
                                {todoCard.title}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-300">
                                {tareasCompletadas}/{totalTareas}
                              </span>
                            </div>
                          </div>

                          {/* Barra de progreso */}
                          <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
                            <div
                              className="h-full bg-green-500 transition-all duration-300"
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>

                          {/* Lista de tareas (máximo 3 primeras) */}
                          {todoCard.todos && todoCard.todos.length > 0 && (
                            <div className="space-y-1">
                              {todoCard.todos.slice(0, 3).map((tarea) => (
                                <div
                                  key={tarea.id}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <div
                                    className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${
                                      tarea.completed
                                        ? 'bg-green-500 text-white border-green-500'
                                        : 'border-gray-400'
                                    }`}
                                  >
                                    {tarea.completed && <span className="text-[8px]">✓</span>}
                                  </div>
                                  <span
                                    className={`flex-1 truncate ${
                                      tarea.completed
                                        ? 'line-through text-gray-400'
                                        : 'text-gray-200'
                                    }`}
                                  >
                                    {tarea.text}
                                  </span>
                                </div>
                              ))}
                              {todoCard.todos.length > 3 && (
                                <div className="text-xs text-gray-400 text-center pt-1">
                                  +{todoCard.todos.length - 3} más...
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Sección NOTAS */}
            <div className="bg-gray-700 text-white border-t border-gray-600">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedNotas(!expandedNotas);
                }}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors"
                data-todo-interactive
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Notas ({notasConectadas.length})</span>
                  {loadingNotas && (
                    <svg className="animate-spin h-3 w-3 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                </div>
                {expandedNotas ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {expandedNotas && (
                <div className="px-4 pb-4 space-y-2">
                  {loadingNotas ? (
                    <div className="text-center text-gray-400 text-sm py-4 flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cargando Notas...
                    </div>
                  ) : notasConectadas.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-4">
                      No hay notas conectadas
                    </div>
                  ) : (
                    notasConectadas.map((noteCard) => {
                      // Obtener preview del contenido (máximo 100 caracteres)
                      const contentPreview = noteCard.content
                        ? noteCard.content.length > 100
                          ? noteCard.content.substring(0, 100) + '...'
                          : noteCard.content
                        : 'Sin contenido';

                      return (
                        <div
                          key={noteCard.id}
                          className="bg-gray-600 rounded-lg p-3 hover:bg-gray-550 transition-colors shadow-sm"
                        >
                          {/* Header de la NOTA */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📝</span>
                            <h4 className="font-medium text-white text-sm truncate flex-1">
                              {noteCard.title}
                            </h4>
                          </div>

                          {/* Contenido de la nota (preview) */}
                          {noteCard.content && (
                            <div className="text-xs text-gray-300 whitespace-pre-wrap break-words">
                              {contentPreview}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal para crear misión */}
      {showNuevaMisionModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowNuevaMisionModal(false);
          }}
          data-todo-interactive
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            data-todo-interactive
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Nueva Misión</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNuevaMisionModal(false);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                data-todo-interactive
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">
                  Nombre <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={misionNombre}
                  onChange={(e) => setMisionNombre(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre de la misión"
                  disabled={creandoMision}
                  data-todo-interactive
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Descripción</label>
                <textarea
                  value={misionDescripcion}
                  onChange={(e) => setMisionDescripcion(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Descripción de la misión"
                  disabled={creandoMision}
                  data-todo-interactive
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">Fecha Inicio</label>
                  <input
                    type="date"
                    value={misionFechaInicio}
                    onChange={(e) => setMisionFechaInicio(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={creandoMision}
                    data-todo-interactive
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">Fecha Fin</label>
                  <input
                    type="date"
                    value={misionFechaFin}
                    onChange={(e) => setMisionFechaFin(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={creandoMision}
                    data-todo-interactive
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">Horas Estimadas</label>
                  <input
                    type="number"
                    value={misionHoras}
                    onChange={(e) => setMisionHoras(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    disabled={creandoMision}
                    data-todo-interactive
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">Estado</label>
                  <select
                    value={misionEstado}
                    onChange={(e) => setMisionEstado(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={creandoMision}
                    data-todo-interactive
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_progreso">En Progreso</option>
                    <option value="completada">Completada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              {/* Sección de Tareas TODO */}
              <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50" data-todo-interactive>
                <h4 className="text-sm font-bold text-gray-900 mb-3">📋 Tareas de la Misión</h4>

                {/* Input para agregar tarea */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={nuevaTareaTexto}
                    onChange={(e) => setNuevaTareaTexto(e.target.value)}
                    onKeyPress={handleKeyPressTarea}
                    className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Escribe una tarea y presiona Enter..."
                    disabled={creandoMision}
                    data-todo-interactive
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      agregarTarea();
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                    disabled={creandoMision || !nuevaTareaTexto.trim()}
                    data-todo-interactive
                  >
                    <Plus size={16} />
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
                        <span className="flex-1 text-sm text-gray-900">{tarea.texto}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarTarea(tarea.id);
                          }}
                          className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-todo-interactive
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-2">
                    No hay tareas agregadas. Agrega tareas para crear una lista TODO.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNuevaMisionModal(false);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  disabled={creandoMision}
                  data-todo-interactive
                >
                  Cancelar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCrearMision();
                  }}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 shadow-md hover:shadow-lg"
                  disabled={creandoMision}
                  data-todo-interactive
                >
                  {creandoMision ? 'Creando...' : 'Crear Misión'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ventana para mostrar contenido de nota */}
      <Ventana
        isOpen={recursoModalAbierto.isOpen}
        onClose={() => setRecursoModalAbierto({ isOpen: false, recurso: null })}
        title={`📝 ${recursoModalAbierto.recurso?.nombre || 'Nota'}`}
        initialWidth={600}
        initialHeight={500}
        minWidth={500}
        minHeight={400}
        showOverlay={false}
      >
        {recursoModalAbierto.recurso && (
          <div className="text-black space-y-6 p-4">
            {/* Contenido de la nota */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Contenido</h3>
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {recursoModalAbierto.recurso.link?.replace('nota://', '') || 'Sin contenido'}
                </p>
              </div>
            </div>

            {/* Información técnica */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Información</h3>
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-gray-600 text-sm">
                  <strong>Creado:</strong> {new Date(recursoModalAbierto.recurso.created_at).toLocaleString('es-ES')}
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  <strong>ID:</strong> {recursoModalAbierto.recurso.id}
                </p>
              </div>
            </div>
          </div>
        )}
      </Ventana>
    </div>
  );
};
