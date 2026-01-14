import React, { useEffect, useState, useRef } from 'react';
import { Card } from '../../types/index';
import { Actividad } from '@/domain/entities/Actividad';
import { Mision } from '@/domain/entities/Mision';
import { Plus, Image as ImageIcon, FileText, X, Users, MoreVertical, Upload, Trash2 } from 'lucide-react';
import { useMisiones } from '@/hooks/useMisiones';
import { useUsuarioId } from '@/hooks/useUsuarioId';
import { useAuth } from '@/app/contexts/AuthContext';
import Image from 'next/image';
import Ventana from '@/app/demo/components/Ventana';

interface ProyectoCardProps {
  card: Card;
  editingTitle: string | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
  addTodoCard?: (text?: string) => string;
  addNoteCard?: (text: string, position?: { x: number; y: number }) => string;
  addConnection?: (fromCardId: string, toCardId: string, skipValidation?: boolean) => void;
  addMisionCardOrganizacion?: (misionData: any) => string | void;
  addMisionCard?: (misionData: any) => string | void;
  cards?: Card[];
}

export const ProyectoCard: React.FC<ProyectoCardProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle,
  addTodoCard,
  addNoteCard,
  addConnection,
  addMisionCardOrganizacion,
  addMisionCard,
  cards = []
}) => {
  const { usuario } = useAuth();
  const { usuarioId } = useUsuarioId();
  const { createMision, deleteMision } = useMisiones(usuarioId);

  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [usuariosAsignados, setUsuariosAsignados] = useState<Array<{ id: number; nombre: string; avatar: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<'misiones' | 'actividades' | 'notas' | 'imagenes' | 'usuarios' | null>(null);
  const [notas, setNotas] = useState<string[]>([]);
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [recursosNota, setRecursosNota] = useState<any[]>([]); // Recursos tipo "nota" desde BD
  const [nuevaNota, setNuevaNota] = useState('');

  // 🆕 Obtener los cards de texto completos desde las notas asociadas
  const notasCards = cards.filter(c =>
    card.proyectoData?.notas?.includes(c.id) && c.type === 'text'
  );
  const [showNuevaMisionModal, setShowNuevaMisionModal] = useState(false);
  const [showNuevaActividadModal, setShowNuevaActividadModal] = useState(false);
  const [recursoModalAbierto, setRecursoModalAbierto] = useState<{
    isOpen: boolean;
    recurso: any | null;
  }>({
    isOpen: false,
    recurso: null
  });

  // Estados para el menú de imagen
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [nuevaImagenUrl, setNuevaImagenUrl] = useState('');
  const [actualizandoImagen, setActualizandoImagen] = useState(false);
  const imageMenuRef = useRef<HTMLDivElement>(null);

  // Form states para misión
  const [misionNombre, setMisionNombre] = useState('');
  const [misionDescripcion, setMisionDescripcion] = useState('');
  const [misionHoras, setMisionHoras] = useState('');
  const [misionFechaInicio, setMisionFechaInicio] = useState('');
  const [misionFechaFin, setMisionFechaFin] = useState('');
  const [creandoMision, setCreandoMision] = useState(false);

  // Form states para actividad
  const [actividadDescripcion, setActividadDescripcion] = useState('');
  const [actividadHoras, setActividadHoras] = useState('');
  const [actividadFecha, setActividadFecha] = useState('');
  const [actividadHoraInicio, setActividadHoraInicio] = useState('');
  const [actividadLink, setActividadLink] = useState('');
  const [creandoActividad, setCreandoActividad] = useState(false);

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
      if (!card.proyectoData?.id) return;

      try {
        setLoading(true);
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');

        // Cargar actividades
        const { data: actividadesData } = await supabase
          .from('actividades')
          .select('*')
          .eq('id_proyecto', card.proyectoData.id)
          .order('created_at', { ascending: false });

        // Cargar misiones
        const { data: misionesData } = await supabase
          .from('misiones')
          .select('*')
          .eq('id_proyecto', card.proyectoData.id)
          .order('created_at', { ascending: false });

        // Cargar recursos tipo "nota" (aquellos cuyo link empieza con "nota://")
        const { data: recursosData } = await supabase
          .from('recursos')
          .select('*')
          .eq('proyecto_id', card.proyectoData.id)
          .like('link', 'nota://%')
          .order('created_at', { ascending: false });

        // Cargar usuarios asignados al proyecto
        // Intentar desde tabla de relación usuario_proyecto
        const { data: usuarioProyectoData } = await supabase
          .from('usuario_proyecto')
          .select('id_usuario')
          .eq('id_proyecto', card.proyectoData.id);

        if (usuarioProyectoData && usuarioProyectoData.length > 0) {
          const usuarioIds = usuarioProyectoData.map(up => up.id_usuario);

          // Obtener datos de los usuarios
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
        setRecursosNota(recursosData || []);
      } catch (error) {
        console.error('Error cargando datos del proyecto:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [card.proyectoData?.id]);

  // Listener para recargar recursos cuando se crea una conexión recurso-proyecto
  useEffect(() => {
    const proyectoId = card.proyectoData?.id;
    if (!proyectoId) return;

    const handleConexionCreada = async (event: CustomEvent) => {
      const { fromCard, toCard } = event.detail;

      console.log('📎 [ProyectoCard] Evento conexion-creada detectado:', {
        fromCard: fromCard?.type,
        toCard: toCard?.type,
        proyectoCardId: card.id,
        proyectoId
      });

      // Verificar si esta conexión involucra un recurso y este proyecto
      const esRecursoAProyecto =
        (fromCard?.type === 'resource' && toCard?.id === card.id) ||
        (toCard?.type === 'resource' && fromCard?.id === card.id);

      if (esRecursoAProyecto) {
        console.log('✅ [ProyectoCard] Conexión recurso-proyecto detectada, recargando recursos...');

        // Recargar recursos inmediatamente
        try {
          const { supabase } = await import('@/infrastructure/services/SupabaseClient');
          const { data: recursosData } = await supabase
            .from('recursos')
            .select('*')
            .eq('proyecto_id', proyectoId)
            .like('link', 'nota://%')
            .order('created_at', { ascending: false });

          console.log('✅ [ProyectoCard] Recursos recargados:', recursosData?.length);
          setRecursosNota(recursosData || []);
        } catch (error) {
          console.error('❌ [ProyectoCard] Error recargando recursos:', error);
        }
      }
    };

    // Agregar listener
    window.addEventListener('conexion-creada', handleConexionCreada as EventListener);

    console.log('📎 [ProyectoCard] Listener de conexion-creada agregado para proyecto:', proyectoId);

    // Cleanup
    return () => {
      window.removeEventListener('conexion-creada', handleConexionCreada as EventListener);
      console.log('📎 [ProyectoCard] Listener de conexion-creada removido');
    };
  }, [card.proyectoData?.id, card.id]);

  // Función para recargar datos
  const eliminarRecursoNota = async (recursoId: number) => {
    try {
      console.log('Intentando eliminar recurso con ID:', recursoId);
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');
      const { error, data } = await supabase
        .from('recursos')
        .delete()
        .eq('id', recursoId)
        .select();

      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }

      console.log('Recurso eliminado exitosamente:', data);

      // Actualizar la lista local
      setRecursosNota(recursosNota.filter(r => r.id !== recursoId));
    } catch (error) {
      console.error('Error eliminando recurso nota:', error);
      alert('Error al eliminar la nota: ' + (error as Error).message);
    }
  };

  const recargarDatos = async () => {
    if (!card.proyectoData?.id) return;

    try {
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');

      const { data: actividadesData } = await supabase
        .from('actividades')
        .select('*')
        .eq('id_proyecto', card.proyectoData.id)
        .order('created_at', { ascending: false });

      const { data: misionesData } = await supabase
        .from('misiones')
        .select('*')
        .eq('id_proyecto', card.proyectoData.id)
        .order('created_at', { ascending: false });

      // Cargar recursos tipo "nota"
      const { data: recursosData } = await supabase
        .from('recursos')
        .select('*')
        .eq('proyecto_id', card.proyectoData.id)
        .like('link', 'nota://%')
        .order('created_at', { ascending: false });

      // Cargar usuarios asignados
      const { data: usuarioProyectoData } = await supabase
        .from('usuario_proyecto')
        .select('id_usuario')
        .eq('id_proyecto', card.proyectoData.id);

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
      setRecursosNota(recursosData || []);
    } catch (error) {
      console.error('Error recargando datos:', error);
    }
  };

  // Función para crear misión
  const handleCrearMision = async () => {
    if (!misionNombre.trim()) {
      alert('Por favor ingresa un nombre para el ticket');
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
        id_proyecto: card.proyectoData?.id || null,
        id_creador: usuario?.userAuth || null,
        card_todos: null,
        estado: null
      });

      if (nuevaMision) {
        // Crear card en la pizarra si la función está disponible
        console.log('🔍 addMisionCard disponible?', !!addMisionCard);
        console.log('🔍 addConnection disponible?', !!addConnection);
        console.log('🔍 Card position:', { x: card.x, y: card.y, width: card.width, height: card.height });

        if (addMisionCard) {
          console.log('📋 Creando card de ticket en la pizarra...');

          // Posicionar el card a la derecha del card de proyecto
          const position = {
            x: card.x + card.width + 100, // 100px a la derecha del card de proyecto
            y: card.y
          };

          console.log('📍 Posición calculada para nuevo card:', position);

          const newMisionCardId = addMisionCard({
            id_mision: nuevaMision.id,
            title: nuevaMision.nombre || '',
            description: nuevaMision.descripcion || '',
            hours: nuevaMision.horas || 0,
            id_usuario: nuevaMision.id_usuario,
            id_creador: nuevaMision.id_creador,
            position: position
          });
          console.log('✅ Card de ticket creada con ID:', newMisionCardId);

          // Crear conexión entre proyecto y misión
          if (newMisionCardId && addConnection) {
            setTimeout(() => {
              console.log('🔗 Creando conexión Proyecto -> Ticket...');
              addConnection(card.id, newMisionCardId as string, true);
              console.log('✅ Conexión creada entre', card.id, '->', newMisionCardId);
            }, 100);
          }
        } else {
          console.error('❌ addMisionCard no está disponible');
        }

        // Limpiar formulario
        setMisionNombre('');
        setMisionDescripcion('');
        setMisionHoras('');
        setMisionFechaInicio('');
        setMisionFechaFin('');
        setShowNuevaMisionModal(false);

        // Recargar datos
        await recargarDatos();

        // Expandir automáticamente la sección de misiones
        setExpanded('misiones');

        // Disparar evento personalizado para que se refresque la lista de tickets
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mision-created', { detail: { misionId: nuevaMision.id } }));
        }
      } else {
        alert('Error al crear el ticket');
      }
    } catch (error) {
      console.error('Error creando ticket:', error);
      alert('Error al crear el ticket');
    } finally {
      setCreandoMision(false);
    }
  };

  // ✅ Función para eliminar ticket
  const handleDeleteMision = async (misionId: number, misionNombre: string) => {
    const confirmacion = confirm(`¿Estás seguro de que deseas eliminar el ticket "${misionNombre}"?`);

    if (!confirmacion) return;

    try {
      const success = await deleteMision(misionId);

      if (success) {
        console.log('✅ Ticket eliminado:', misionId);
        setMisiones(prev => prev.filter(m => m.id !== misionId));
        alert('✅ Ticket eliminado exitosamente');
      } else {
        alert('❌ Error al eliminar el ticket');
      }
    } catch (error) {
      console.error('Error eliminando ticket:', error);
      alert('❌ Error al eliminar el ticket');
    }
  };

  // Función para crear actividad
  const handleCrearActividad = async () => {
    if (!actividadDescripcion.trim()) {
      console.warn('⚠️ Por favor ingresa una descripción para la actividad');
      return;
    }

    if (!usuario?.userAuth) {
      console.error('❌ Error: No se pudo identificar el usuario (UUID)');
      return;
    }

    setCreandoActividad(true);

    try {
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');

      // Construir hora_inicio si hay fecha y hora
      let horaInicioTimestamp = null;
      if (actividadFecha && actividadHoraInicio) {
        horaInicioTimestamp = `${actividadFecha}T${actividadHoraInicio}:00`;
      }

      console.log('📝 Creando actividad con datos:', {
        descripcion: actividadDescripcion.trim(),
        cant_horas: actividadHoras ? parseFloat(actividadHoras) : null,
        fecha: actividadFecha || new Date().toISOString().split('T')[0],
        hora_inicio: horaInicioTimestamp,
        link: actividadLink.trim() || null,
        id_usuario: usuario.userAuth,
        id_proyecto: card.proyectoData?.id || null,
        tiempo_dedicado: 0
      });

      const { data, error } = await supabase
        .from('actividades')
        .insert({
          descripcion: actividadDescripcion.trim(),
          cant_horas: actividadHoras ? parseFloat(actividadHoras) : null,
          fecha: actividadFecha || new Date().toISOString().split('T')[0],
          hora_inicio: horaInicioTimestamp,
          link: actividadLink.trim() || null,
          id_usuario: usuario.userAuth,
          id_proyecto: card.proyectoData?.id || null,
          tiempo_dedicado: 0
        })
        .select()
        .single();

      console.log('📝 Resultado de crear actividad:', { data, error });

      if (error) {
        console.error('❌ ERROR AL CREAR ACTIVIDAD:');
        console.error('   - Message:', error.message);
        console.error('   - Details:', error.details);
        console.error('   - Hint:', error.hint);
        console.error('   - Code:', error.code);
        console.error('   - Error completo:', error);
        return;
      }

      if (data) {
        console.log('✅ Actividad creada exitosamente:', data);
        // Limpiar formulario
        setActividadDescripcion('');
        setActividadHoras('');
        setActividadFecha('');
        setActividadHoraInicio('');
        setActividadLink('');
        setShowNuevaActividadModal(false);

        // Recargar datos
        await recargarDatos();
      } else {
        console.error('❌ Error: No se recibió respuesta del servidor');
      }
    } catch (error) {
      console.error('❌ EXCEPCIÓN AL CREAR ACTIVIDAD:', error);
    } finally {
      setCreandoActividad(false);
    }
  };

  // 🆕 Función para materializar una nota en la pizarra
  const handleMaterializarNota = (notaCard: Card) => {
    if (!addNoteCard || !addConnection) {
      console.warn('⚠️ No hay funciones para crear nota o conexión');
      return;
    }

    try {
      // Calcular posición cerca del card de proyecto (a la derecha)
      const position = {
        x: card.x + card.width + 20, // 20px de separación
        y: card.y
      };

      // Crear el card de texto en la pizarra con el contenido de la nota
      const noteCardId = addNoteCard(notaCard.content, position);

      console.log('📝 Nota materializada en pizarra:', notaCard.title, 'ID:', noteCardId);

      // Crear la conexión desde la nota hacia el proyecto
      setTimeout(() => {
        addConnection(noteCardId, card.id, true); // skipValidation = true
        console.log('🔗 Conexión creada: Nota -> Proyecto');
      }, 100); // Pequeño delay para asegurar que el card existe
    } catch (error) {
      console.error('❌ Error materializando nota:', error);
    }
  };

  // Función para cambiar imagen del proyecto
  const handleCambiarImagen = async () => {
    if (!nuevaImagenUrl.trim()) {
      alert('Por favor ingresa una URL de imagen');
      return;
    }

    if (!card.proyectoData?.id) {
      alert('Error: No se pudo identificar el proyecto');
      return;
    }

    setActualizandoImagen(true);

    try {
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');

      const { data, error } = await supabase
        .from('proyecto')
        .update({ icono: nuevaImagenUrl.trim() })
        .eq('id', card.proyectoData.id)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando imagen:', error);
        alert('Error al actualizar la imagen');
        return;
      }

      console.log('✅ Imagen actualizada:', data);

      // Actualizar el card localmente
      if (card.proyectoData) {
        card.proyectoData.icono = nuevaImagenUrl.trim();
      }

      setNuevaImagenUrl('');
      setShowImageMenu(false);
      alert('✅ Imagen actualizada exitosamente');

      // Recargar la página para reflejar los cambios
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
    if (!card.proyectoData?.id) {
      alert('Error: No se pudo identificar el proyecto');
      return;
    }

    const confirmacion = confirm('¿Estás seguro de que deseas eliminar la imagen del proyecto?');
    if (!confirmacion) return;

    setActualizandoImagen(true);

    try {
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');

      const { data, error } = await supabase
        .from('proyecto')
        .update({ icono: null })
        .eq('id', card.proyectoData.id)
        .select()
        .single();

      if (error) {
        console.error('Error eliminando imagen:', error);
        alert('Error al eliminar la imagen');
        return;
      }

      console.log('✅ Imagen eliminada:', data);

      // Actualizar el card localmente
      if (card.proyectoData) {
        card.proyectoData.icono = null;
      }

      setShowImageMenu(false);
      alert('✅ Imagen eliminada exitosamente');

      // Recargar la página para reflejar los cambios
      window.location.reload();
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      alert('Error al eliminar la imagen');
    } finally {
      setActualizandoImagen(false);
    }
  };

  // Función para limpiar URL duplicada
  const sanitizeIconUrl = (url: string | null): string | null => {
    if (!url) return null;
    const httpCount = (url.match(/https?:\/\//g) || []).length;
    if (httpCount > 1) {
      const firstUrl = url.match(/https?:\/\/[^\s]+/)?.[0];
      return firstUrl || null;
    }
    return url;
  };

  const cleanIcono = card.proyectoData?.icono ? sanitizeIconUrl(card.proyectoData.icono) : null;

  return (
    <div className="flex flex-col h-full w-full p-3 bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 border-b border-indigo-300 pb-2">
        {cleanIcono && (
          <div className="flex-shrink-0 relative group"  data-todo-interactive>
            {cleanIcono.startsWith('http') ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white shadow-sm border border-indigo-200 relative">
                <img
                  src={cleanIcono}
                  alt={card.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-xl">📁</div>';
                    }
                  }}
                />
                {/* Botón de opciones de imagen */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowImageMenu(!showImageMenu);
                  }}
                  className="absolute top-0 right-0 w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-bl-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  data-todo-interactive
                  title="Opciones de imagen"
                >
                  <MoreVertical size={12} />
                </button>
              </div>
            ) : (
              <div className="text-2xl relative">
                {cleanIcono}
                {/* Botón de opciones para emoji/icono */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowImageMenu(!showImageMenu);
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  data-todo-interactive
                  title="Opciones de icono"
                >
                  <MoreVertical size={10} />
                </button>
              </div>
            )}

            {/* Menú desplegable */}
            {showImageMenu && (
              <div
                ref={imageMenuRef}
                className="absolute top-12 left-0 z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 w-64"
                onClick={(e) => e.stopPropagation()}
                data-todo-interactive
              >
                {/* Opción: Cambiar imagen */}
                <div className="px-3 py-2 border-b border-gray-100">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nueva URL de imagen
                  </label>
                  <input
                    type="text"
                    value={nuevaImagenUrl}
                    onChange={(e) => setNuevaImagenUrl(e.target.value)}
                    placeholder="https://ejemplo.com/imagen.png"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={actualizandoImagen}
                    data-todo-interactive
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCambiarImagen();
                    }}
                    disabled={actualizandoImagen || !nuevaImagenUrl.trim()}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-todo-interactive
                  >
                    <Upload size={14} />
                    {actualizandoImagen ? 'Actualizando...' : 'Cambiar imagen'}
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
        )}
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
              className="font-semibold text-indigo-900 bg-transparent border-b border-indigo-400 focus:outline-none w-full text-sm"
              autoFocus
              data-todo-interactive
            />
          ) : (
            <h3
              className="font-semibold text-indigo-900 truncate text-sm"
              style={{ fontSize: `${(card.fontSize || 14)}px` }}
            >
              {card.title}
            </h3>
          )}
        </div>
      </div>

      {/* Descripción */}
      {card.proyectoData?.descripcion && (
        <div className="text-xs text-gray-700 mb-2 line-clamp-2">
          {card.proyectoData.descripcion}
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowNuevaMisionModal(!showNuevaMisionModal);
          }}
          className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white px-2 py-1 rounded text-xs flex items-center justify-center gap-1 transition-colors"
          data-todo-interactive
        >
          <Plus size={12} />
          Ticket
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowNuevaActividadModal(!showNuevaActividadModal);
          }}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center justify-center gap-1 transition-colors"
          data-todo-interactive
        >
          <Plus size={12} />
          Actividad
        </button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="flex gap-2 mb-2 text-xs flex-wrap">
        <div className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded flex items-center gap-1">
          🎯 <span className="font-semibold">{misiones.length}</span>
        </div>
        <div className="bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
          ⚡ <span className="font-semibold">{actividades.length}</span>
        </div>
        <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
          📝 <span className="font-semibold">{notasCards.length}</span>
        </div>
        <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1">
          🖼️ <span className="font-semibold">{imagenes.length}</span>
        </div>
        <div className="bg-orange-100 text-orange-700 px-2 py-1 rounded flex items-center gap-1">
          👥 <span className="font-semibold">{usuariosAsignados.length}</span>
        </div>
      </div>

      {/* Contenido scrolleable */}
      <div
        className="flex-1 overflow-y-auto space-y-2 min-h-0"
        onWheel={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="text-center text-indigo-400 text-xs py-2">Cargando...</div>
        ) : (
          <>
            {/* Tickets */}
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(expanded === 'misiones' ? null : 'misiones');
                }}
                className="w-full text-left text-xs font-semibold text-indigo-800 mb-1 flex items-center justify-between hover:bg-indigo-100 px-1 py-0.5 rounded"
                data-todo-interactive
              >
                <span>🎟️ Tickets ({misiones.length})</span>
                <span>{expanded === 'misiones' ? '▼' : '▶'}</span>
              </button>
              {expanded === 'misiones' && (
                <div className="space-y-1 ml-2">
                  {misiones.length === 0 ? (
                    <div className="text-xs text-gray-500 italic">No hay tickets</div>
                  ) : (
                    misiones.slice(0, 5).map((mision) => (
                      <div
                        key={mision.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
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
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        className="bg-white rounded p-2 border border-indigo-100 text-xs cursor-move hover:bg-indigo-50 transition-colors relative group"
                      >
                        {/* ✅ Botón de eliminar en la esquina superior derecha */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMision(mision.id, mision.nombre || 'Sin nombre');
                          }}
                          className="absolute top-2 right-2 w-5 h-5 bg-red-500/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs z-10"
                          title="Eliminar ticket"
                          data-todo-interactive
                        >
                          ×
                        </button>

                        <div className="font-medium text-indigo-900 truncate pr-6">
                          {mision.nombre || 'Sin nombre'}
                        </div>
                        <div className="text-gray-600 text-xs flex gap-2 mt-0.5">
                          <span>⏱️ {mision.horas || 0}h</span>
                        </div>
                      </div>
                    ))
                  )}
                  {misiones.length > 5 && (
                    <div className="text-xs text-gray-500 italic text-center">
                      +{misiones.length - 5} más
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actividades */}
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(expanded === 'actividades' ? null : 'actividades');
                }}
                className="w-full text-left text-xs font-semibold text-green-800 mb-1 flex items-center justify-between hover:bg-green-100 px-1 py-0.5 rounded"
                data-todo-interactive
              >
                <span>⚡ Actividades ({actividades.length})</span>
                <span>{expanded === 'actividades' ? '▼' : '▶'}</span>
              </button>
              {expanded === 'actividades' && (
                <div className="space-y-1 ml-2">
                  {actividades.length === 0 ? (
                    <div className="text-xs text-gray-500 italic">No hay actividades</div>
                  ) : (
                    actividades.slice(0, 5).map((actividad) => (
                      <div
                        key={actividad.id}
                        className="bg-white rounded p-2 border border-green-100 text-xs"
                      >
                        <div className="font-medium text-green-900 truncate">
                          {actividad.descripcion || 'Sin descripción'}
                        </div>
                        <div className="text-gray-600 text-xs flex gap-2 mt-0.5">
                          {actividad.cant_horas && <span>⏱️ {actividad.cant_horas}h</span>}
                          {actividad.fecha && (
                            <span>📅 {new Date(actividad.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {actividades.length > 5 && (
                    <div className="text-xs text-gray-500 italic text-center">
                      +{actividades.length - 5} más
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notas */}
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(expanded === 'notas' ? null : 'notas');
                }}
                className="w-full text-left text-xs font-semibold text-blue-800 mb-1 flex items-center justify-between hover:bg-blue-100 px-1 py-0.5 rounded"
                data-todo-interactive
              >
                <span>📝 Notas ({notasCards.length})</span>
                <span>{expanded === 'notas' ? '▼' : '▶'}</span>
              </button>
              {expanded === 'notas' && (
                <div className="space-y-1 ml-2">
                  {notasCards.length === 0 ? (
                    <div className="text-xs text-gray-500 italic">No hay notas asociadas</div>
                  ) : (
                    notasCards.map((notaCard) => (
                      <div
                        key={notaCard.id}
                        className="bg-white rounded p-2 border border-blue-100 text-xs cursor-pointer hover:bg-blue-50 transition-colors relative group"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMaterializarNota(notaCard);
                        }}
                        data-todo-interactive
                        title="Click para mostrar en la pizarra"
                      >
                        <div className="font-medium text-indigo-900 truncate mb-1">
                          {notaCard.title}
                        </div>
                        <div className="text-gray-600 text-xs line-clamp-2">
                          {notaCard.content}
                        </div>
                        <div className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                          <span>💡</span>
                          <span className="text-blue-600 font-semibold">Click para materializar</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Imágenes */}
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(expanded === 'imagenes' ? null : 'imagenes');
                }}
                className="w-full text-left text-xs font-semibold text-purple-800 mb-1 flex items-center justify-between hover:bg-purple-100 px-1 py-0.5 rounded"
                data-todo-interactive
              >
                <span>🖼️ Imágenes ({imagenes.length})</span>
                <span>{expanded === 'imagenes' ? '▼' : '▶'}</span>
              </button>
              {expanded === 'imagenes' && (
                <div className="space-y-1 ml-2">
                  {/* Input para URL de imagen */}
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="URL de imagen..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          setImagenes([...imagenes, e.currentTarget.value.trim()]);
                          e.currentTarget.value = '';
                        }
                      }}
                      className="flex-1 px-2 py-1 text-xs border border-purple-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-400"
                      data-todo-interactive
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        if (input?.value.trim()) {
                          setImagenes([...imagenes, input.value.trim()]);
                          input.value = '';
                        }
                      }}
                      className="bg-purple-500 text-white px-2 py-1 rounded text-xs hover:bg-purple-600"
                      data-todo-interactive
                    >
                      <ImageIcon size={12} />
                    </button>
                  </div>
                  {/* Grid de imágenes */}
                  <div className="grid grid-cols-2 gap-1">
                    {imagenes.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Imagen ${idx + 1}`}
                          className="w-full h-20 object-cover rounded border border-purple-200"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setImagenes(imagenes.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          data-todo-interactive
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Usuarios Asignados */}
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(expanded === 'usuarios' ? null : 'usuarios');
                }}
                className="w-full text-left text-xs font-semibold text-orange-800 mb-1 flex items-center justify-between hover:bg-orange-100 px-1 py-0.5 rounded"
                data-todo-interactive
              >
                <span>👥 Usuarios Asignados ({usuariosAsignados.length})</span>
                <span>{expanded === 'usuarios' ? '▼' : '▶'}</span>
              </button>
              {expanded === 'usuarios' && (
                <div className="space-y-1 ml-2">
                  {usuariosAsignados.length === 0 ? (
                    <div className="text-xs text-gray-500 italic">No hay usuarios asignados</div>
                  ) : (
                    <div className="space-y-2">
                      {usuariosAsignados.map((usuarioAsignado) => (
                        <div
                          key={usuarioAsignado.id}
                          className="bg-white rounded p-2 border border-orange-100 text-xs flex items-center gap-2"
                        >
                          {/* Avatar del usuario */}
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
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
                                    parent.className = "w-8 h-8 bg-gradient-to-br from-orange-400 to-red-400 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0";
                                    parent.textContent = usuarioAsignado.nombre.charAt(0).toUpperCase();
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-red-400 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                {usuarioAsignado.nombre.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          {/* Nombre del usuario */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-orange-900 truncate">
                              {usuarioAsignado.nombre}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer con totales */}
      {!loading && (
        <div className="mt-2 pt-2 border-t border-indigo-200 text-xs flex justify-around">
          <div className="text-center">
            <div className="text-gray-500">Total Tickets</div>
            <div className="font-bold text-indigo-700">
              {misiones.reduce((sum, m) => sum + (m.horas || 0), 0)}h
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">Horas dedicadas</div>
            <div className="font-bold text-green-700">
              {actividades.reduce((sum, a) => sum + (a.tiempo_dedicado || 0), 0).toFixed(1)}h
            </div>
          </div>
        </div>
      )}

      {/* Debug info */}
      <div className="absolute bottom-1 left-1 text-[8px] bg-yellow-100 px-1 rounded border border-yellow-300 opacity-70">
        Menu: {showImageMenu ? 'ABIERTO' : 'CERRADO'} | Icono: {cleanIcono ? (cleanIcono.startsWith('http') ? 'URL' : 'EMOJI') : 'NINGUNO'}
      </div>

      {/* Modal para crear misión */}
      {showNuevaMisionModal && (
        <div
          className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            setShowNuevaMisionModal(false);
          }}
          data-todo-interactive
        >
          <div
            className="bg-white rounded-lg p-4 w-full max-w-md shadow-xl max-h-[90%] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            data-todo-interactive
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Nuevo Ticket</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNuevaMisionModal(false);
                }}
                className="text-gray-500 hover:text-gray-700"
                data-todo-interactive
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">
                  Nombre <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={misionNombre}
                  onChange={(e) => setMisionNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nombre del ticket"
                  disabled={creandoMision}
                  data-todo-interactive
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Descripción</label>
                <textarea
                  value={misionDescripcion}
                  onChange={(e) => setMisionDescripcion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                  placeholder="Descripción del ticket"
                  disabled={creandoMision}
                  data-todo-interactive
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900">Fecha Inicio</label>
                  <input
                    type="date"
                    value={misionFechaInicio}
                    onChange={(e) => setMisionFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={creandoMision}
                    data-todo-interactive
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900">Fecha Fin</label>
                  <input
                    type="date"
                    value={misionFechaFin}
                    onChange={(e) => setMisionFechaFin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={creandoMision}
                    data-todo-interactive
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Horas Estimadas</label>
                <input
                  type="number"
                  value={misionHoras}
                  onChange={(e) => setMisionHoras(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0"
                  min="0"
                  disabled={creandoMision}
                  data-todo-interactive
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNuevaMisionModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded font-medium transition-colors disabled:opacity-50"
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
                  className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded font-medium transition-colors disabled:opacity-50"
                  disabled={creandoMision}
                  data-todo-interactive
                >
                  {creandoMision ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear actividad */}
      {showNuevaActividadModal && (
        <div
          className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            setShowNuevaActividadModal(false);
          }}
          data-todo-interactive
        >
          <div
            className="bg-white rounded-lg p-4 w-full max-w-md shadow-xl max-h-[90%] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            data-todo-interactive
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Nueva Actividad</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNuevaActividadModal(false);
                }}
                className="text-gray-500 hover:text-gray-700"
                data-todo-interactive
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">
                  Descripción <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={actividadDescripcion}
                  onChange={(e) => setActividadDescripcion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  rows={3}
                  placeholder="Descripción de la actividad"
                  disabled={creandoActividad}
                  data-todo-interactive
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900">Fecha</label>
                  <input
                    type="date"
                    value={actividadFecha}
                    onChange={(e) => setActividadFecha(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={creandoActividad}
                    data-todo-interactive
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900">Hora Inicio</label>
                  <input
                    type="time"
                    value={actividadHoraInicio}
                    onChange={(e) => setActividadHoraInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={creandoActividad}
                    data-todo-interactive
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Horas Estimadas</label>
                <input
                  type="number"
                  value={actividadHoras}
                  onChange={(e) => setActividadHoras(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0"
                  min="0"
                  step="0.5"
                  disabled={creandoActividad}
                  data-todo-interactive
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Link (opcional)</label>
                <input
                  type="url"
                  value={actividadLink}
                  onChange={(e) => setActividadLink(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://..."
                  disabled={creandoActividad}
                  data-todo-interactive
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNuevaActividadModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded font-medium transition-colors disabled:opacity-50"
                  disabled={creandoActividad}
                  data-todo-interactive
                >
                  Cancelar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCrearActividad();
                  }}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-medium transition-colors disabled:opacity-50"
                  disabled={creandoActividad}
                  data-todo-interactive
                >
                  {creandoActividad ? 'Creando...' : 'Crear'}
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
