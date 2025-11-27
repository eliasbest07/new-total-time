import React, { useEffect, useState } from 'react';
import { Card } from '../../types/index';
import { Actividad } from '@/domain/entities/Actividad';
import { Mision } from '@/domain/entities/Mision';
import { Recurso } from '@/domain/entities/Recurso';
import { Capture } from '@/domain/entities/Capture';
import { ChevronDown, ChevronUp, X, Plus } from 'lucide-react';
import { useMisiones } from '@/hooks/useMisiones';
import Ventana from '@/app/demo/components/Ventana';

interface ProyectoCardOrganizacionProps {
  card: Card;
  editingTitle: string | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
  onCrearMision?: (proyectoId: number) => void;
}

export const ProyectoCardOrganizacion: React.FC<ProyectoCardOrganizacionProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle,
  onCrearMision
}) => {
  const { deleteMision } = useMisiones(null);

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
  const [recursoModalAbierto, setRecursoModalAbierto] = useState<{
    isOpen: boolean;
    recurso: Recurso | null;
  }>({
    isOpen: false,
    recurso: null
  });

  // Estados para capturas
  const [capturas, setCapturas] = useState<Capture[]>([]);
  const [loadingCapturas, setLoadingCapturas] = useState(false);

  // Extraer ID del proyecto (puede venir de diferentes campos según la implementación)
  const proyectoId = (card.proyectoData as any)?.id;

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

  // Función para cargar capturas del proyecto
  const cargarCapturas = async () => {
    if (!proyectoId || capturas.length > 0) return; // Solo cargar si aún no se han cargado

    setLoadingCapturas(true);

    try {
      // Obtener todas las capturas relacionadas con las misiones del proyecto
      const misionIds = misiones.map(m => String(m.id));

      console.log('📸 [ProyectoCard] Buscando capturas para misiones:', misionIds);

      if (misionIds.length === 0) {
        console.log('📸 [ProyectoCard] No hay misiones en el proyecto');
        setCapturas([]);
        return;
      }

      // Cargar capturas de todas las misiones del proyecto
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');
      const { data: capturasData, error } = await supabase
        .from('capture')
        .select('*')
        .in('id_bloque', misionIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('📸 [ProyectoCard] Error cargando capturas:', error);
        setCapturas([]);
      } else {
        console.log('📸 [ProyectoCard] Capturas encontradas:', capturasData?.length || 0);
        setCapturas(capturasData || []);
      }
    } catch (error) {
      console.error('📸 [ProyectoCard] Excepción cargando capturas:', error);
      setCapturas([]);
    } finally {
      setLoadingCapturas(false);
    }
  };

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

  // Calcular cantidad de recursos tipo "nota"
  const recursosNota = recursos.filter(r => r.link?.startsWith('nota://'));

  return (
    <div className="flex flex-col h-full w-full bg-gray-200 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        {/* Título e Icono */}
        <div className="flex items-center gap-3 mb-3">
          {cleanIcono && (
            <div className="flex-shrink-0">
              {cleanIcono.startsWith('http') ? (
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-md border-2 border-yellow-400">
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
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center text-2xl shadow-md border-2 border-yellow-400">
                  {cleanIcono}
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
                  if (!expandedCapturas && capturas.length === 0) {
                    cargarCapturas();
                  }
                }}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors cursor-pointer"
                data-todo-interactive
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">📸 Capturas</span>
                  {capturas.length > 0 && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                      {capturas.length}
                    </span>
                  )}
                </div>
                {expandedCapturas ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {expandedCapturas && (
                <div className="px-4 pb-4 bg-gray-800">
                  {loadingCapturas ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : capturas.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-6">
                      <p>No hay capturas disponibles</p>
                      <p className="text-xs mt-1">Las capturas se generan cuando los usuarios trabajan en las misiones</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 mb-2">
                        {capturas.length} capturas - Tiempo estimado: {capturas.length * 5} min
                      </p>
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {capturas.map((capture) => (
                          <div key={capture.id} className="relative group">
                            <img
                              src={capture.img_url || '/placeholder-image.png'}
                              alt={`Captura ${capture.id}`}
                              className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                capture.img_url && window.open(capture.img_url, '_blank');
                              }}
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded-b">
                              <p className="truncate">
                                {new Date(capture.created_at).toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })} | M:{capture.id_bloque}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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

                  {/* Botón para crear nueva misión */}
                  {onCrearMision && proyectoId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCrearMision(proyectoId);
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg mt-3"
                      data-todo-interactive
                    >
                      <Plus size={16} />
                      Nuevo Ticket
                    </button>
                  )}
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
                <span className="font-semibold text-sm">Notas ({recursosNota.length})</span>
                {expandedRecursos ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {expandedRecursos && (
                <div className="px-4 pb-4 space-y-2">
                  {recursosNota.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-4">
                      No hay notas disponibles
                    </div>
                  ) : (
                    recursosNota.map((recurso) => {
                      // Son todos recursos tipo nota
                      const esNota = true;

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
