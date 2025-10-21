import React, { useEffect, useState } from 'react';
import { Card } from '../../types/index';
import { Actividad } from '@/domain/entities/Actividad';
import { Mision } from '@/domain/entities/Mision';

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
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<'misiones' | 'actividades' | null>(null);

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

      {/* Estadísticas rápidas */}
      <div className="flex gap-2 mb-2 text-xs">
        <div className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded flex items-center gap-1">
          🎯 <span className="font-semibold">{misiones.length}</span>
        </div>
        <div className="bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
          ⚡ <span className="font-semibold">{actividades.length}</span>
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
                        className="bg-white rounded p-2 border border-indigo-100 text-xs"
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
    </div>
  );
};
