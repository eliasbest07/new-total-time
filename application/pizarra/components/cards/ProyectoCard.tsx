import React, { useEffect, useState } from 'react';
import { Card } from '../../types/index';
import { Actividad } from '@/domain/entities/Actividad';
import { Mision } from '@/domain/entities/Mision';
import { Plus, Image as ImageIcon, FileText, X, Users } from 'lucide-react';
import { useMisiones } from '@/hooks/useMisiones';
import { useUsuarioId } from '@/hooks/useUsuarioId';
import { useAuth } from '@/app/contexts/AuthContext';
import Image from 'next/image';

interface ProyectoCardProps {
  card: Card;
  editingTitle: string | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
}

export const ProyectoCard: React.FC<ProyectoCardProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle
}) => {
  const { usuario } = useAuth();
  const { usuarioId } = useUsuarioId();
  const { createMision } = useMisiones(usuarioId);

  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [usuariosAsignados, setUsuariosAsignados] = useState<Array<{ id: number; nombre: string; avatar: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<'misiones' | 'actividades' | 'notas' | 'imagenes' | 'usuarios' | null>(null);
  const [notas, setNotas] = useState<string[]>([]);
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [nuevaNota, setNuevaNota] = useState('');
  const [showNuevaMisionModal, setShowNuevaMisionModal] = useState(false);
  const [showNuevaActividadModal, setShowNuevaActividadModal] = useState(false);

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
  const [creandoActividad, setCreandoActividad] = useState(false);

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
      } catch (error) {
        console.error('Error cargando datos del proyecto:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [card.proyectoData?.id]);

  // Función para recargar datos
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
    } catch (error) {
      console.error('Error recargando datos:', error);
    }
  };

  // Función para crear misión
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
        id_proyecto: card.proyectoData?.id || null,
        id_creador: usuario?.userAuth || null
      });

      if (nuevaMision) {
        // Limpiar formulario
        setMisionNombre('');
        setMisionDescripcion('');
        setMisionHoras('');
        setMisionFechaInicio('');
        setMisionFechaFin('');
        setShowNuevaMisionModal(false);

        // Recargar datos
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

      console.log('📝 Creando actividad con datos:', {
        descripcion: actividadDescripcion.trim(),
        cant_horas: actividadHoras ? parseFloat(actividadHoras) : null,
        fecha: actividadFecha || new Date().toISOString(),
        id_usuario: usuario.userAuth,
        id_proyecto: card.proyectoData?.id || null,
        tiempo_dedicado: 0
      });

      const { data, error } = await supabase
        .from('actividades')
        .insert({
          descripcion: actividadDescripcion.trim(),
          cant_horas: actividadHoras ? parseFloat(actividadHoras) : null,
          fecha: actividadFecha || new Date().toISOString(),
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
          <div className="flex-shrink-0">
            {cleanIcono.startsWith('http') ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white shadow-sm border border-indigo-200">
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
              </div>
            ) : (
              <div className="text-2xl">{cleanIcono}</div>
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
          Misión
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
          📝 <span className="font-semibold">{notas.length}</span>
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
            {/* Misiones */}
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(expanded === 'misiones' ? null : 'misiones');
                }}
                className="w-full text-left text-xs font-semibold text-indigo-800 mb-1 flex items-center justify-between hover:bg-indigo-100 px-1 py-0.5 rounded"
                data-todo-interactive
              >
                <span>🎯 Misiones ({misiones.length})</span>
                <span>{expanded === 'misiones' ? '▼' : '▶'}</span>
              </button>
              {expanded === 'misiones' && (
                <div className="space-y-1 ml-2">
                  {misiones.length === 0 ? (
                    <div className="text-xs text-gray-500 italic">No hay misiones</div>
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
                        className="bg-white rounded p-2 border border-indigo-100 text-xs cursor-move hover:bg-indigo-50 transition-colors"
                      >
                        <div className="font-medium text-indigo-900 truncate">
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
                <span>📝 Notas ({notas.length})</span>
                <span>{expanded === 'notas' ? '▼' : '▶'}</span>
              </button>
              {expanded === 'notas' && (
                <div className="space-y-1 ml-2">
                  {/* Agregar nueva nota */}
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={nuevaNota}
                      onChange={(e) => setNuevaNota(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && nuevaNota.trim()) {
                          setNotas([...notas, nuevaNota.trim()]);
                          setNuevaNota('');
                        }
                      }}
                      placeholder="Nueva nota..."
                      className="flex-1 px-2 py-1 text-xs border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                      data-todo-interactive
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (nuevaNota.trim()) {
                          setNotas([...notas, nuevaNota.trim()]);
                          setNuevaNota('');
                        }
                      }}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                      data-todo-interactive
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  {/* Lista de notas */}
                  {notas.map((nota, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded p-2 border border-blue-100 text-xs flex justify-between items-start"
                    >
                      <span className="flex-1">{nota}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotas(notas.filter((_, i) => i !== idx));
                        }}
                        className="text-red-500 hover:text-red-700 ml-2"
                        data-todo-interactive
                      >
                        ✕
                      </button>
                    </div>
                  ))}
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
            <div className="text-gray-500">Total Misiones</div>
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
              <h3 className="text-lg font-bold text-gray-900">Nueva Misión</h3>
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
                  placeholder="Nombre de la misión"
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
                  placeholder="Descripción de la misión"
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
    </div>
  );
};
