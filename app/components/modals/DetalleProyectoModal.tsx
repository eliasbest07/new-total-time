'use client';

import { useState, useEffect } from 'react';
import Ventana from '@/app/demo/components/Ventana';
import { Calendar, FileText, Palette, FolderOpen, Target } from 'lucide-react';
import { Mision } from '@/domain/entities/Mision';

interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string;
  fechaCreacion: string;
  estado: 'En desarrollo' | 'En revisión' | 'Completado' | 'Planificación' | 'En pausa';
  colores: {
    primario: string;
    secundario: string;
    acento: string;
  };
}

interface DetalleProyectoModalProps {
  isOpen: boolean;
  onClose: () => void;
  proyecto: Proyecto | null;
}

const DetalleProyectoModal: React.FC<DetalleProyectoModalProps> = ({ isOpen, onClose, proyecto }) => {
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [loadingMisiones, setLoadingMisiones] = useState(false);

  useEffect(() => {
    const cargarMisiones = async () => {
      if (!proyecto) return;

      try {
        setLoadingMisiones(true);
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');

        const { data: misionesData } = await supabase
          .from('misiones')
          .select('*')
          .eq('id_proyecto', proyecto.id)
          .order('created_at', { ascending: false });

        setMisiones(misionesData || []);
      } catch (error) {
        console.error('Error cargando misiones del proyecto:', error);
      } finally {
        setLoadingMisiones(false);
      }
    };

    if (isOpen && proyecto) {
      cargarMisiones();
    }
  }, [isOpen, proyecto]);

  if (!proyecto) return null;

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'En desarrollo':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'En revisión':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Completado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Planificación':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'En pausa':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Ventana
      isOpen={isOpen}
      onClose={onClose}
      title="Detalles del Proyecto"
      initialWidth={600}
      initialHeight={500}
      minWidth={500}
      minHeight={400}
      showOverlay={true}
    >
      <div className="space-y-6">
        {/* Header con nombre y estado */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{proyecto.nombre}</h1>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getEstadoColor(proyecto.estado)}`}>
              <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
              {proyecto.estado}
            </div>
          </div>
          <div className="flex items-center space-x-1 ml-4">
            {/* Colores del proyecto estilo macOS */}
            <div 
              className="w-4 h-4 rounded-full border border-gray-300 shadow-sm"
              style={{ backgroundColor: proyecto.colores.primario }}
              title="Color primario"
            ></div>
            <div 
              className="w-4 h-4 rounded-full border border-gray-300 shadow-sm"
              style={{ backgroundColor: proyecto.colores.secundario }}
              title="Color secundario"
            ></div>
            <div 
              className="w-4 h-4 rounded-full border border-gray-300 shadow-sm"
              style={{ backgroundColor: proyecto.colores.acento }}
              title="Color de acento"
            ></div>
          </div>
        </div>

        {/* Fecha de creación */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Fecha d Creación</h3>
              <p className="text-lg font-semibold text-blue-700">{formatFecha(proyecto.fechaCreacion)}</p>
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Descripción del Proyecto</h3>
              <p className="text-gray-700 leading-relaxed">{proyecto.descripcion}</p>
            </div>
          </div>
        </div>

        {/* Paleta de colores detallada */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Palette className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Paleta de Colores</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div 
                    className="w-16 h-16 rounded-xl border-2 border-white shadow-lg mx-auto mb-2"
                    style={{ backgroundColor: proyecto.colores.primario }}
                  ></div>
                  <p className="text-xs font-medium text-gray-600">Primario</p>
                  <p className="text-xs text-gray-500 font-mono">{proyecto.colores.primario}</p>
                </div>
                <div className="text-center">
                  <div 
                    className="w-16 h-16 rounded-xl border-2 border-white shadow-lg mx-auto mb-2"
                    style={{ backgroundColor: proyecto.colores.secundario }}
                  ></div>
                  <p className="text-xs font-medium text-gray-600">Secundario</p>
                  <p className="text-xs text-gray-500 font-mono">{proyecto.colores.secundario}</p>
                </div>
                <div className="text-center">
                  <div 
                    className="w-16 h-16 rounded-xl border-2 border-white shadow-lg mx-auto mb-2"
                    style={{ backgroundColor: proyecto.colores.acento }}
                  ></div>
                  <p className="text-xs font-medium text-gray-600">Acento</p>
                  <p className="text-xs text-gray-500 font-mono">{proyecto.colores.acento}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Misiones del proyecto */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Misiones del Proyecto</h3>
              {loadingMisiones ? (
                <div className="text-sm text-gray-500">Cargando misiones...</div>
              ) : misiones.length === 0 ? (
                <div className="text-sm text-gray-500 italic">
                  No hay misiones asociadas a este proyecto.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {misiones.map((mision) => (
                    <div
                      key={mision.id}
                      className="bg-white rounded-lg p-3 border border-green-200 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {mision.nombre || 'Sin nombre'}
                        </h4>
                        {mision.horas && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                            {mision.horas}h
                          </span>
                        )}
                      </div>
                      {mision.descripcion && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {mision.descripcion}
                        </p>
                      )}
                      {mision.estado && (
                        <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {mision.estado}
                        </span>
                      )}
                      <div className="flex gap-2 text-xs text-gray-500 mt-2">
                        {mision.fecha_start && (
                          <span>🚀 {new Date(mision.fecha_start).toLocaleDateString('es-ES')}</span>
                        )}
                        {mision.fecha_end && (
                          <span>🏁 {new Date(mision.fecha_end).toLocaleDateString('es-ES')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {misiones.length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 font-medium">Total de tickets:</span>
                    <span className="text-green-700 font-semibold">{misiones.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-gray-600 font-medium">Total de horas:</span>
                    <span className="text-green-700 font-semibold">
                      {misiones.reduce((sum, m) => sum + (m.horas || 0), 0)}h
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer con información adicional */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <FolderOpen className="w-4 h-4" />
            <span>ID del proyecto: {proyecto.id}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Ventana>
  );
};

export default DetalleProyectoModal;