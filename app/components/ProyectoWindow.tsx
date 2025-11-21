'use client';

import { Proyecto } from '@/domain/entities/Proyecto';
import { Actividad } from '@/domain/entities/Actividad';
import { Mision } from '@/domain/entities/Mision';
import { useEffect, useState } from 'react';

interface ProyectoWindowProps {
  proyecto: Proyecto;
}

export default function ProyectoWindow({ proyecto }: ProyectoWindowProps) {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [loading, setLoading] = useState(true);

  // Función para limpiar URL duplicada
  const sanitizeIconUrl = (url: string | null): string | null => {
    if (!url) return null;

    // Si la URL contiene "http" dos veces, está duplicada
    const httpCount = (url.match(/https?:\/\//g) || []).length;
    if (httpCount > 1) {
      // Tomar solo la primera URL
      const firstUrl = url.match(/https?:\/\/[^\s]+/)?.[0];
      return firstUrl || null;
    }

    return url;
  };

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // Importar repositorios dinámicamente
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');

        // Cargar actividades del proyecto
        const { data: actividadesData } = await supabase
          .from('actividades')
          .select('*')
          .eq('id_proyecto', proyecto.id)
          .order('created_at', { ascending: false });

        // Cargar misiones del proyecto
        const { data: misionesData } = await supabase
          .from('misiones')
          .select('*')
          .eq('id_proyecto', proyecto.id)
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
  }, [proyecto.id]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header del Proyecto */}
      <div className="p-6 border-b border-indigo-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          {proyecto.icono && (() => {
            const cleanIcono = sanitizeIconUrl(proyecto.icono);
            return cleanIcono && (
              <div className="flex-shrink-0">
                {/* Si el icono es una URL de imagen */}
                {cleanIcono.startsWith('http') ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white shadow-md border-2 border-indigo-200">
                    <img
                      src={cleanIcono}
                      alt={proyecto.nombre || 'Proyecto'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Si falla la carga, mostrar emoji por defecto
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-3xl">📁</div>';
                        }
                      }}
                    />
                  </div>
                ) : (
                  /* Si es un emoji o texto */
                  <div className="text-5xl">
                    {cleanIcono}
                  </div>
                )}
              </div>
            );
          })()}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-indigo-900 mb-2">
              {proyecto.nombre}
            </h2>
            {proyecto.descripcion && (
              <p className="text-gray-700 text-sm leading-relaxed">
                {proyecto.descripcion}
              </p>
            )}
            <div className="mt-3 flex gap-4 text-xs text-gray-500">
              <span>📅 Creado: {new Date(proyecto.created_at).toLocaleDateString('es-ES')}</span>
              <span>🎯 {misiones.length} Tickets</span>
              <span>⚡ {actividades.length} Actividades</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-indigo-400 text-lg">Cargando...</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Misiones */}
          <div>
            <h3 className="text-lg font-semibold text-indigo-800 mb-3 flex items-center gap-2">
              🎯 Tickets ({misiones.length})
            </h3>
            {misiones.length === 0 ? (
              <div className="text-gray-500 text-sm italic bg-white/50 p-4 rounded-lg">
                No hay tickets asociadas a este proyecto.
              </div>
            ) : (
              <div className="space-y-3">
                {misiones.map((mision) => (
                  <div
                    key={mision.id}
                    className="bg-white rounded-lg p-4 shadow-sm border border-indigo-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-indigo-900">
                        {mision.nombre || 'Sin nombre'}
                      </h4>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                        {mision.horas || 0}h
                      </span>
                    </div>
                    {mision.descripcion && (
                      <p className="text-sm text-gray-600 mb-2">
                        {mision.descripcion}
                      </p>
                    )}
                    <div className="flex gap-3 text-xs text-gray-500">
                      {mision.fecha_start && (
                        <span>🚀 Inicio: {new Date(mision.fecha_start).toLocaleDateString('es-ES')}</span>
                      )}
                      {mision.fecha_end && (
                        <span>🏁 Fin: {new Date(mision.fecha_end).toLocaleDateString('es-ES')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actividades */}
          <div>
            <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
              ⚡ Actividades ({actividades.length})
            </h3>
            {actividades.length === 0 ? (
              <div className="text-gray-500 text-sm italic bg-white/50 p-4 rounded-lg">
                No hay actividades asociadas a este proyecto.
              </div>
            ) : (
              <div className="space-y-3">
                {actividades.map((actividad) => (
                  <div
                    key={actividad.id}
                    className="bg-white rounded-lg p-4 shadow-sm border border-green-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-green-900">
                        {actividad.descripcion || 'Sin descripción'}
                      </h4>
                      {actividad.cant_horas && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          {actividad.cant_horas}h
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                      {actividad.fecha && (
                        <span>📅 {new Date(actividad.fecha).toLocaleDateString('es-ES')}</span>
                      )}
                      {actividad.tiempo_dedicado && (
                        <span>⏱️ {actividad.tiempo_dedicado.toFixed(2)}h dedicadas</span>
                      )}
                      {actividad.link && (
                        <a
                          href={actividad.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          🔗 Ver enlace
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Estadísticas */}
          <div className="bg-gradient-to-r from-indigo-100 to-blue-100 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-indigo-900 mb-3">📊 Estadísticas del Proyecto</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/60 rounded p-3">
                <div className="text-gray-600 text-xs">Total Horas Misiones</div>
                <div className="text-2xl font-bold text-indigo-700">
                  {misiones.reduce((sum, m) => sum + (m.horas || 0), 0)}h
                </div>
              </div>
              <div className="bg-white/60 rounded p-3">
                <div className="text-gray-600 text-xs">Horas Dedicadas</div>
                <div className="text-2xl font-bold text-green-700">
                  {actividades.reduce((sum, a) => sum + (a.tiempo_dedicado || 0), 0).toFixed(1)}h
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
