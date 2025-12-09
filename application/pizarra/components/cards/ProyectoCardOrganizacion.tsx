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

interface ProyectoCardOrganizacionProps {
  card: Card;
  editingTitle: string | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
}

export const ProyectoCardOrganizacion: React.FC<ProyectoCardOrganizacionProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle
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
  const [loading, setLoading] = useState(true);

  // Estados de expansión
  const [expandedCapturas, setExpandedCapturas] = useState(false);
  const [expandedMisiones, setExpandedMisiones] = useState(false);
  const [expandedRecursos, setExpandedRecursos] = useState(false);

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
  const imageMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extraer ID del proyecto (puede venir de diferentes campos según la implementación)
  const proyectoId = (card.proyectoData as any)?.id;

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
      if (!proyectoId) return;

      try {
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
      setRecursos(recursos.filter(r => r.id !== recursoId));
    } catch (error) {
      console.error('Error eliminando recurso nota:', error);
      alert('Error al eliminar la nota: ' + (error as Error).message);
    }
  };

  // Recargar recursos periódicamente cuando la sección está expandida
  useEffect(() => {
    if (!expandedRecursos || !proyectoId) return;

    const interval = setInterval(async () => {
      try {
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');
        const { data: recursosData } = await supabase
          .from('recursos')
          .select('*')
          .eq('proyecto_id', proyectoId)
          .order('created_at', { ascending: false });

        setRecursos(recursosData || []);
      } catch (error) {
        console.error('Error recargando recursos:', error);
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

  const cleanIcono = card.proyectoData?.icono ? sanitizeIconUrl(card.proyectoData.icono) : null;

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
        onMouseDown={(e) => e.stopPropagation()}
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
                        className="bg-gray-600 rounded-lg p-3 cursor-move hover:bg-gray-550 transition-colors shadow-sm relative group"
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
                          className={`w-full bg-gray-600 rounded-lg p-3 transition-all shadow-sm border-2 relative group ${
                            esNota
                              ? 'hover:bg-blue-600 hover:border-blue-400 cursor-pointer hover:scale-[1.02] border-transparent'
                              : 'hover:bg-gray-550 border-transparent'
                          }`}
                          style={{ cursor: esNota ? 'pointer' : 'default' }}
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
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                          onMouseUp={(e) => {
                            e.stopPropagation();
                          }}
                          onDragStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          draggable={false}
                        >
                          {/* Botón eliminar */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (confirm('¿Eliminar esta nota?')) {
                                eliminarRecursoNota(recurso.id);
                              }
                            }}
                            className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-todo-interactive
                            title="Eliminar nota"
                          >
                            <X size={12} />
                          </button>

                          <div className="flex items-start gap-2">
                            <div className="text-xl flex-shrink-0">
                              {recurso.icono || '📄'}
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
