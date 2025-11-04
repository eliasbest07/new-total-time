"use client";

import { useProyectos } from "@/hooks/useProyectos";
import { Folder, Plus, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ListadoProyectosProps {
  onProyectoClick?: (proyectoId: number) => void;
  onCrearProyecto?: () => void;
}

export default function ListadoProyectos({
  onProyectoClick,
  onCrearProyecto
}: ListadoProyectosProps) {
  const { proyectos, loading, error, refetch, lastUpdated } = useProyectos();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Calcular tiempo desde última actualización
  const getTimeSinceUpdate = () => {
    if (!lastUpdated) return '';
    const seconds = Math.floor((Date.now() - lastUpdated) / 1000);
    if (seconds < 60) return `hace ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `hace ${hours}h`;
  };

  if (loading) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold text-white mb-4">Proyectos</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="ml-3 text-white">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold text-white mb-4">Proyectos</h2>
        <div className="text-center py-8">
          <p className="text-red-300">❌ {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="flex flex-col items-center gap-2 mb-4">
        {onCrearProyecto && (
          <button
            onClick={onCrearProyecto}
            className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all hover:scale-110 flex items-center justify-center shadow-lg"
            title="Crear nuevo proyecto"
          >
            <Plus size={24} />
          </button>
        )}

        {/* Botón de refresh */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || loading}
          className="w-16 h-16 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium transition-all hover:scale-110 flex flex-col items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group relative"
          title={`Actualizar proyectos${lastUpdated ? ` (${getTimeSinceUpdate()})` : ''}`}
        >
          <RefreshCw
            size={20}
            className={`${isRefreshing ? 'animate-spin' : ''}`}
          />
          {lastUpdated && (
            <span className="text-[10px] mt-1 opacity-70">
              {getTimeSinceUpdate()}
            </span>
          )}
        </button>
      </div>

      {proyectos.length === 0 ? (
        <div className="text-center py-4">
          <Folder className="mx-auto h-12 w-12 text-white/50" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {proyectos.map((proyecto) => (
            <div
              key={proyecto.id}
              onClick={() => onProyectoClick?.(proyecto.id)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                  dragType: 'proyecto',
                  id: proyecto.id,
                  nombre: proyecto.nombre,
                  descripcion: proyecto.descripcion,
                  icono: proyecto.icono
                }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className="relative group cursor-move"
            >
              {/* Icono del proyecto */}
              <div className="relative">
                {proyecto.icono ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm hover:scale-110 transition-transform shadow-lg">
                    <Image
                      src={proyecto.icono}
                      alt={proyecto.nombre}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <Folder className="w-8 h-8 text-white" />
                  </div>
                )}

                {/* Tooltip con nombre del proyecto - aparece arriba en hover */}
                <div className="absolute left-1/2 bottom-full transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                  <div className="bg-white/95 backdrop-blur-sm text-gray-900 text-sm px-3 py-2 rounded-lg shadow-xl border border-gray-200">
                    <p className="font-semibold">{proyecto.nombre}</p>
                    {/* Métricas del proyecto */}
                    <div className="flex items-center justify-center gap-3 mt-1 text-xs text-gray-600">
                      {proyecto.misiones && proyecto.misiones.length > 0 && (
                        <span className="flex items-center gap-1">
                          🎯 {proyecto.misiones.length}
                        </span>
                      )}
                      {proyecto.actividades && proyecto.actividades.length > 0 && (
                        <span className="flex items-center gap-1">
                          ⚡ {proyecto.actividades.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
