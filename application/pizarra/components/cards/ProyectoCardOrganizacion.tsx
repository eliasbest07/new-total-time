import React, { useEffect, useState } from 'react';
import { Card } from '../../types/index';
import { Actividad } from '@/domain/entities/Actividad';
import { Mision } from '@/domain/entities/Mision';
import { Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useMisiones } from '@/hooks/useMisiones';
import { useUsuarioId } from '@/hooks/useUsuarioId';
import { useAuth } from '@/app/contexts/AuthContext';

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
  const [usuariosAsignados, setUsuariosAsignados] = useState<any[]>([]);
  const [tecnologias, setTecnologias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de expansión
  const [expandedCapturas, setExpandedCapturas] = useState(false);
  const [expandedMisiones, setExpandedMisiones] = useState(false);
  const [expandedRecursos, setExpandedRecursos] = useState(false);

  // Estados de modales
  const [showNuevaMisionModal, setShowNuevaMisionModal] = useState(false);

  // Form states para misión
  const [misionNombre, setMisionNombre] = useState('');
  const [misionDescripcion, setMisionDescripcion] = useState('');
  const [misionHoras, setMisionHoras] = useState('');
  const [misionFechaInicio, setMisionFechaInicio] = useState('');
  const [misionFechaFin, setMisionFechaFin] = useState('');
  const [creandoMision, setCreandoMision] = useState(false);

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

      setActividades(actividadesData || []);
      setMisiones(misionesData || []);
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
        id_creador: usuario?.userAuth || null
      });

      if (nuevaMision) {
        setMisionNombre('');
        setMisionDescripcion('');
        setMisionHoras('');
        setMisionFechaInicio('');
        setMisionFechaFin('');
        setShowNuevaMisionModal(false);
        await recargarDatos();
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
                <span className="font-semibold text-sm">Misiones ({misiones.length})</span>
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
                    Nueva Misión
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
                <span className="font-semibold text-sm">Recursos</span>
                {expandedRecursos ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {expandedRecursos && (
                <div className="px-4 pb-4">
                  <div className="text-center text-gray-400 text-sm py-8">
                    No hay recursos disponibles
                  </div>
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
    </div>
  );
};
